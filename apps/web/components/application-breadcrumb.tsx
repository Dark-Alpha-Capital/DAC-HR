import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb";

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
            <Link href="/applications">Applications</Link>
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
