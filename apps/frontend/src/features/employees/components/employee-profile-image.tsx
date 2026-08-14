import React, { useState, useEffect } from "react";
import { resolveDocumentAccessUrl } from "#/lib/documents/access";

interface EmployeeProfileImageProps {
  imageUrl: string;
  alt: string;
  className?: string;
}

const EmployeeProfileImage = ({
  imageUrl,
  alt,
  className = "h-24 w-24 rounded-full object-cover",
}: EmployeeProfileImageProps) => {
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      try {
        const accessUrl = await resolveDocumentAccessUrl(imageUrl);
        setDisplayUrl(accessUrl);
      } catch (err) {
        console.error("Error loading image:", err);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadImage();
  }, [imageUrl]);

  if (isLoading) {
    return (
      <div
        className={`${className} bg-muted animate-pulse flex items-center justify-center`}
      >
        <span className="text-xs text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (error || !displayUrl) {
    return (
      <div className={`${className} bg-muted flex items-center justify-center`}>
        <span className="text-xs text-muted-foreground">No image</span>
      </div>
    );
  }

  return <img src={displayUrl} alt={alt} className={className} />;
};

export default EmployeeProfileImage;
