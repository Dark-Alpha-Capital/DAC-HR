import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus } from "lucide-react";
import CandidateDocumentTable from "@/components/candidate-document-table";
import { getCachedDocuments } from "@/lib/cache/candidate";

type Documents = Awaited<ReturnType<typeof getCachedDocuments>>;

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
          <Button variant="secondary" size="sm" asChild>
            <Link to="/candidates/$uid/add-document" params={{ uid }} search={{} as any}>
              Add Document
            </Link>
          </Button>
        </div>
        <Badge variant="secondary">{documents.length}</Badge>
      </div>

      {documents.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm mb-4">No documents found for this candidate.</p>
          <Button size="sm" asChild>
            <Link to="/candidates/$uid/add-document" params={{ uid }} search={{} as any}>
              <Plus className="h-4 w-4 mr-2" />
              Add Document
            </Link>
          </Button>
        </div>
      ) : (
        <CandidateDocumentTable documents={documents} candidateId={uid} />
      )}
    </div>
  );
}
