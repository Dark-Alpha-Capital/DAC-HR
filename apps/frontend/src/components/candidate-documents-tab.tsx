import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { FileText, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";
import CandidateDocumentTable from "~/components/candidate-document-table";
import { CandidateAddDocumentDialog } from "~/components/dialogs/candidate-add-document-dialog";
import { getDocumentsByCandidateId } from "@workspace/db/repositories/document-repository";

type Documents = Awaited<ReturnType<typeof getDocumentsByCandidateId>>;

export function CandidateDocumentsTab({
  uid,
  documents,
}: {
  uid: string;
  documents: Documents;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <h2 className="text-lg font-semibold">Documents</h2>
          <CandidateAddDocumentDialog candidateId={uid} />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{documents.length}</Badge>
          <Button variant="ghost" size="sm" asChild>
            <Link
              to="/documents"
              search={{
                scope: "candidates",
                candidateId: uid,
                category: undefined,
                name: undefined,
                tags: undefined,
                page: undefined,
              }}
            >
              View all
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm mb-4">No documents found for this candidate.</p>
          <CandidateAddDocumentDialog candidateId={uid} variant="empty-state" />
        </div>
      ) : (
        <CandidateDocumentTable documents={documents} candidateId={uid} />
      )}
    </div>
  );
}
