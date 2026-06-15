import { Link } from "@tanstack/react-router";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface ApplicationBreadcrumbProps {
  candidateName?: string;
  positionName?: string;
  interviewRoundName?: string;
  applicationId?: string;
  interviewId?: string;
}

export default function ApplicationBreadcrumb({
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
            <BreadcrumbItem>
              <BreadcrumbPage>
                {candidateName} - {positionName}
              </BreadcrumbPage>
            </BreadcrumbItem>
            {interviewId && interviewRoundName && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{interviewRoundName}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
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
