import { Briefcase, Link as LinkIcon, Mail, MapPin, Phone } from "lucide-react";
import { getCachedCandidate } from "@/lib/cache/candidate";

type Candidate = NonNullable<Awaited<ReturnType<typeof getCachedCandidate>>>;

export function OverviewTab({ candidate }: { candidate: Candidate }) {
  if (!candidate) return null;

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
          {candidate.phone && (
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
              <a
                href={`tel:${candidate.phone}`}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {candidate.phone}
              </a>
            </div>
          )}
          {candidate.location && (
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {candidate.location}
              </span>
            </div>
          )}
          {candidate.source && (
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
          )}
        </div>
        {candidate.note && (
          <div className="mt-6 pt-6 border-t">
            <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
              Notes
            </h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {candidate.note}
            </p>
          </div>
        )}
        <div className="mt-6 pt-6 border-t">
          <span className="text-xs text-muted-foreground">
            <span className="font-medium">ID</span>{" "}
            <span className="font-mono">{candidate.id}</span>
          </span>
        </div>
      </section>

      <section>
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
          Applications
        </h3>
        <div className="flex items-center gap-3">
          <Briefcase className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            <span className="font-medium">{candidate.applications.length}</span>{" "}
            <span className="text-muted-foreground">total</span>
          </span>
        </div>
      </section>
    </div>
  );
}
