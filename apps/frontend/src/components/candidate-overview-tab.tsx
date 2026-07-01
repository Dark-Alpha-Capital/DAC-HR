import {
  Briefcase,
  GraduationCap,
  Link as LinkIcon,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  FileText,
} from "lucide-react";
import { getCachedCandidate } from "~/lib/cache/candidate";

type Candidate = NonNullable<Awaited<ReturnType<typeof getCachedCandidate>>>;

export function CandidateOverviewTab({ candidate }: { candidate: Candidate }) {
  const profile = candidate.profile;
  const hasEducation =
    profile && (profile.school || profile.major || profile.graduationYear);
  const hasLinkedIn = profile?.linkedinUrl;

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
                {candidate.phone}
              </a>
            </div>
          ) : null}
          {candidate.location ? (
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {candidate.location}
              </span>
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
        {candidate.note ? (
          <div className="mt-6 pt-6 border-t">
            <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
              Notes
            </h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {candidate.note}
            </p>
          </div>
        ) : null}
        <div className="mt-6 pt-6 border-t">
          <span className="text-xs text-muted-foreground">
            <span className="font-medium">ID</span>{" "}
            <span className="font-mono">{candidate.id}</span>
          </span>
        </div>
      </section>

      {hasEducation ? (
        <section>
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
            Education
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-sm">
                {[profile.major, profile.school]
                  .filter(Boolean)
                  .join(" at ")}
                {profile.graduationYear ? ` (${profile.graduationYear})` : ""}
              </span>
            </div>
          </div>
        </section>
      ) : null}

      {hasLinkedIn ? (
        <section>
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
            LinkedIn
          </h3>
          <div className="flex items-center gap-3">
            <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
            <a
              href={profile.linkedinUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline break-all"
            >
              {profile.linkedinUrl}
            </a>
          </div>
        </section>
      ) : null}

      {profile?.resumeText ? (
        <section>
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
            Resume
          </h3>
          <div className="flex items-start gap-3">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
              {profile.resumeText}
            </p>
          </div>
        </section>
      ) : null}

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
