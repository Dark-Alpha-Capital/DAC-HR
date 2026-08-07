import * as React from "react";
import { cn } from "~/lib/utils";

export function formatUSPhone(digits: string): string {
  const d = digits.replace(/\D/g, "").replace(/^1/, "");
  if (!d) return "";
  const area = d.slice(0, 3);
  const mid = d.slice(3, 6);
  const last = d.slice(6, 10);
  let out = "+1";
  if (area) out += ` (${area}`;
  if (mid) out += `) ${mid}`;
  if (last) out += `-${last}`;
  return out;
}

export function displayPhone(value: string | null | undefined): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (!digits) return value;
  const formatted = formatUSPhone(digits);
  return formatted || value;
}

function PhoneInput({
  className,
  value,
  onChange,
  ...props
}: Omit<React.ComponentProps<"input">, "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let digits = e.target.value.replace(/\D/g, "");
    if (digits.startsWith("1")) {
      digits = digits.slice(1);
    }
    onChange(digits.slice(0, 10));
  };

  return (
    <input
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      data-slot="input"
      value={formatUSPhone(value)}
      onChange={handleChange}
      placeholder="+1 (555) 123-4567"
      className={cn(
        "h-8 w-full min-w-0 rounded-full border border-input bg-background px-3 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className,
      )}
      {...props}
    />
  );
}

export { PhoneInput };
