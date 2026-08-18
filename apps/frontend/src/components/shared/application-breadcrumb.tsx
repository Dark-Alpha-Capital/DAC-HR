import { Link } from "@tanstack/react-router";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "#/components/ui/breadcrumb";

interface ApplicationBreadcrumbProps {
  candidateId?: string;
  candidateName?: string;
  positionName?: string;
  interviewRoundName?: string;
  applicationId?: string;
  interviewId?: string;
}

export default function ApplicationBreadcrumb({
  candidateId,
  candidateName,
  positionName,
  interviewRoundName,
  applicationId,
  interviewId,
}: ApplicationBreadcrumbProps) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {candidateId && candidateName ? (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link
                  to="/candidates/$uid"
                  params={{ uid: candidateId }}
                  search={{ applicationId: undefined }}
                >
                  {candidateName}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {positionName ? <BreadcrumbSeparator /> : null}
          </>
        ) : (
          <BreadcrumbItem>
            <BreadcrumbPage>Application</BreadcrumbPage>
          </BreadcrumbItem>
        )}
        {candidateId && candidateName && positionName ? (
          <>
            <BreadcrumbItem>
              {applicationId ? (
                <BreadcrumbLink asChild>
                  <Link to="/applications/$id" params={{ id: applicationId }}>
                    {positionName}
                  </Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{positionName}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {interviewId && interviewRoundName ? (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{interviewRoundName}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            ) : null}
          </>
        ) : null}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
