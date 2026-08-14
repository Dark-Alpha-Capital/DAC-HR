import { Link, useLoaderData } from "@tanstack/react-router";
import QuestionUploadForm from "#/features/questions/components/question-upload-form";
import { Button } from "#/components/ui/button";

export function QuestionNewPage() {
  const { positions } = useLoaderData({ from: "/_main/questions/new" });

  return (
    <div className="container mx-auto space-y-6 py-8">
      <Button asChild variant="secondary">
        <Link
          to="/questions"
          search={{ search: "", position: [], round: [], page: undefined }}
        >
          Back to Questions
        </Link>
      </Button>

      <QuestionUploadForm positions={positions} />
    </div>
  );
}
