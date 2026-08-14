import { Link } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import PositionUploadForm from "#/features/positions/components/position-upload-form";

export function PositionNewPage() {
  return (
    <div className="narrow-container mx-auto space-y-8 py-6">
      <Button asChild variant="secondary" size="sm">
        <Link to="/positions" search={{} as never}>
          Back to Positions
        </Link>
      </Button>
      <PositionUploadForm />
    </div>
  );
}
