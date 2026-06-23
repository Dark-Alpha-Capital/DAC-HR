import { Link } from "@tanstack/react-router";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";

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
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/applications" search={{} as any}>Applications</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        {applicationId && candidateName && positionName ? (
          <>
            {candidateId ? (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link
                      to="/candidates/$uid"
                      params={{ uid: candidateId }}
                      search={{} as any}
                    >
                      {candidateName}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </>
            ) : null}
            <BreadcrumbItem>
              {interviewId ? (
                <BreadcrumbLink asChild>
                  <Link
                    to="/applications/$id"
                    params={{ id: applicationId }}
                  >
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
        ) : (
          <BreadcrumbItem>
            <BreadcrumbPage>Application</BreadcrumbPage>
          </BreadcrumbItem>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
