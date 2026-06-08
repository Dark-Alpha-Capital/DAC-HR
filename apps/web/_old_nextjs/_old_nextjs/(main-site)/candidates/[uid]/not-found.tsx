import { Button } from "@workspace/ui/components/button";
import Link from "next/link";

export default function CandidateNotFound() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Candidate not found</h1>
      <p className="text-muted-foreground">
        The candidate you&apos;re looking for doesn&apos;t exist or has been
        removed.
      </p>
      <Button asChild>
        <Link href="/candidates">Back to Candidates</Link>
      </Button>
    </div>
  );
}
