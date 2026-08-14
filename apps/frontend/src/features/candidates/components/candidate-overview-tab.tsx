import { useState } from "react";
import { FileText, Link as LinkIcon, Mail, MapPin, Phone } from "lucide-react";
import { getCandidateWithApplications } from "@workspace/db/repositories/candidate-repository";
import { getDocumentsByCandidateId } from "@workspace/db/repositories/document-repository";
import DocumentPreviewDialog from "#/components/shared/document-preview-dialog";
import { Button } from "#/components/ui/button";
import { displayPhone } from "#/components/ui/phone-input";

type Candidate = NonNullable<
  Awaited<ReturnType<typeof getCandidateWithApplications>>
>;
type Documents = Awaited<ReturnType<typeof getDocumentsByCandidateId>>;

export function formatCandidateLocation(candidate: {
  location: string | null;
  locationCity: string | null;
  locationState: string | null;
}) {
  if (candidate.locationCity && candidate.locationState) {
    return `${candidate.locationCity}, ${candidate.locationState}`;
  }
  if (candidate.locationCity) return candidate.locationCity;
  if (candidate.locationState) return candidate.locationState;
  return candidate.location;
}

export function CandidateOverviewTab({
  candidate,
  documents,
}: {
  candidate: Candidate;
  documents: Documents;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const resumeDocument = documents.find((doc) => doc.category === "resume");
  const location = formatCandidateLocation(candidate);

  return (
    <div className="space-y-10">
      <section>
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
          Contact
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
            <a
              href={`mailto:${candidate.email}`}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {candidate.email}
            </a>
          </div>
          {candidate.phone ? (
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
              <a
                href={`tel:${candidate.phone}`}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {displayPhone(candidate.phone)}
              </a>
            </div>
          ) : null}
          {location ? (
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{location}</span>
            </div>
          ) : null}
          {candidate.source ? (
            <div className="flex items-center gap-3">
              <LinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              {candidate.sourceUrl ? (
                <a
                  href={candidate.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
                >
                  {candidate.source}
                </a>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {candidate.source}
                </span>
              )}
            </div>
          ) : null}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
          Resume
        </h3>
        {resumeDocument ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border p-4">
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
              <span className="text-sm font-medium truncate">
                {resumeDocument.name}
              </span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="shrink-0"
              onClick={() => setPreviewOpen(true)}
            >
              <FileText className="h-4 w-4 mr-1.5" />
              View resume
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No resume on file.</p>
        )}

        <DocumentPreviewDialog
          document={{
            name: resumeDocument?.name ?? "Resume",
            url: resumeDocument?.url ?? "",
          }}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
        />
      </section>
    </div>
  );
}
