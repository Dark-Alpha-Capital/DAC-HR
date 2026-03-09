import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { FileText, Plus } from "lucide-react";
import CandidateDocumentTable from "@/components/candidate-document-table";
import { getCachedDocuments } from "@/lib/cache/candidate";

export async function CachedDocumentsCount({ uid }: { uid: string }) {
  const documents = await getCachedDocuments(uid);
  return documents.length > 0 ? (
    <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5 text-xs">
      {documents.length}
    </Badge>
  ) : null;
}

export async function DocumentsTab({ uid }: { uid: string }) {
  const documents = await getCachedDocuments(uid);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <h2 className="text-lg font-semibold">Documents</h2>
          <Button variant="secondary" size="sm" asChild>
            <Link href={`/candidates/${uid}/add-document`}>Add Document</Link>
          </Button>
        </div>
        <Badge variant="secondary">{documents.length}</Badge>
      </div>

      {documents.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm mb-4">No documents found for this candidate.</p>
          <Button size="sm" asChild>
            <Link href={`/candidates/${uid}/add-document`}>
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
