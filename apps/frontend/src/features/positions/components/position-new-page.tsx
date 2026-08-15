import { Link } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import PositionUploadForm from "#/features/positions/components/position-upload-form";

// SAFETY: the positions route's validateSearch fills in defaults for all
// search params, so an empty search object is a valid navigation target;
// `never` only satisfies tanstack's required-search typing.
const emptyPositionsSearch = {} as never;

export function PositionNewPage() {
  return (
    <div className="narrow-container mx-auto space-y-8 py-6">
      <Button asChild variant="secondary" size="sm">
        <Link to="/positions" search={emptyPositionsSearch}>
          Back to Positions
        </Link>
      </Button>
      <PositionUploadForm />
    </div>
  );
}
