import React, { useCallback, useRef, useEffect } from "react";
import { useJsApiLoader, Autocomplete } from "@react-google-maps/api";
import { Input } from "~/components/ui/input";

interface LocationInputFieldProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
}

const LocationInputField = ({
  value = "",
  onChange,
  placeholder = "Enter city, state, or country",
  id,
  className = "w-full",
}: LocationInputFieldProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: ["places"],
  });

  // Sync input value with prop value
  useEffect(() => {
    if (inputRef.current && value !== inputRef.current.value) {
      inputRef.current.value = value;
    }
  }, [value]);

  const onLoad = useCallback(
    (autocomplete: google.maps.places.Autocomplete) => {
      autocompleteRef.current = autocomplete;
    },
    [],
  );

  const extractLocationComponents = (
    place: google.maps.places.PlaceResult,
  ): string => {
    let city = "";
    let state = "";
    let country = "";

    if (place.address_components) {
      for (const component of place.address_components) {
        const types = component.types;

        if (types.includes("locality")) {
          city = component.long_name;
        } else if (types.includes("administrative_area_level_1")) {
          // Prioritize state/province (administrative_area_level_1)
          state = component.short_name;
        } else if (types.includes("administrative_area_level_2") && !state) {
          // Use county only if state is not available
          state = component.short_name;
        } else if (types.includes("country")) {
          country = component.long_name;
        }
      }
    }

    // Build formatted string: "City, State, Country"
    const parts: string[] = [];
    if (city) parts.push(city);
    if (state) parts.push(state);
    if (country) parts.push(country);

    return parts.length > 0 ? parts.join(", ") : "";
  };

  const onPlaceChanged = useCallback(() => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place) {
        let formattedLocation = extractLocationComponents(place);
        // Fallback to formatted_address if we couldn't extract components
        if (!formattedLocation && place.formatted_address) {
          formattedLocation = place.formatted_address;
        }
        // Fallback to place name if still no location
        if (!formattedLocation && place.name) {
          formattedLocation = place.name;
        }

        if (formattedLocation) {
          if (onChange) {
            onChange(formattedLocation);
          }
          if (inputRef.current) {
            inputRef.current.value = formattedLocation;
          }
        }
      }
    }
  }, [onChange]);

  const handleValueChange = useCallback(
    (newValue: string) => {
      if (onChange) {
        onChange(newValue);
      }
      if (inputRef.current && inputRef.current.value !== newValue) {
        inputRef.current.value = newValue;
      }
    },
    [onChange],
  );

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-2 text-sm text-muted-foreground">
        Loading location autocomplete...
      </div>
    );
  }

  return (
    <div>
      <Autocomplete
        onLoad={onLoad}
        onPlaceChanged={onPlaceChanged}
        options={{
          types: ["(cities)"],
          componentRestrictions: undefined,
        }}
      >
        <Input
          id={id}
          ref={inputRef}
          placeholder={placeholder}
          className={className}
          value={value}
          onChange={(event) => handleValueChange(event.target.value)}
        />
      </Autocomplete>
    </div>
  );
};

export default LocationInputField;
