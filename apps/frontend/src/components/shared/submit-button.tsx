import { Loader2 } from "lucide-react";
import { Button } from "#/components/ui/button";

type SubmitButtonProps = React.ComponentProps<typeof Button> & {
  /** Shows a spinner and disables the button while truthy. */
  loading?: boolean;
  /** Label shown next to the spinner while loading. */
  loadingLabel?: string;
};

/**
 * Standard submit button for forms: swaps its label for a spinner while a
 * submit is in flight and prevents double submits.
 */
export function SubmitButton({
  loading = false,
  loadingLabel = "Saving...",
  children,
  disabled,
  ...props
}: SubmitButtonProps) {
  return (
    <Button type="submit" disabled={loading || disabled} {...props}>
      {loading ? (
        <>
          <Loader2 className="animate-spin" aria-hidden />
          {loadingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
