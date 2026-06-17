import {
  createFileSearchClient,
  uploadAndIndexDocument,
  type FileSearchMetadata,
} from "@workspace/file-search";

type CandidateFileSearchMetadata = {
  firstName: string;
  lastName: string;
  email: string;
  location: string | null;
  source: string | null;
  sourceUrl: string | null;
};

const buildCandidateSearchMetadata = (
  candidateId: string,
  candidate: CandidateFileSearchMetadata,
): FileSearchMetadata[] => {
  const customMetadata: FileSearchMetadata[] = [
    { key: "candidate_id", stringValue: candidateId },
    {
      key: "candidate_full_name",
      stringValue: `${candidate.firstName} ${candidate.lastName}`,
    },
    { key: "candidate_email", stringValue: candidate.email },
  ];

  if (candidate.location) {
    customMetadata.push({
      key: "candidate_location",
      stringValue: candidate.location,
    });
  }

  if (candidate.source) {
    customMetadata.push({
      key: "candidate_source",
      stringValue: candidate.source,
    });
  }

  if (candidate.sourceUrl) {
    customMetadata.push({
      key: "candidate_source_url",
      stringValue: candidate.sourceUrl,
    });
  }

  return customMetadata;
};

export const uploadCandidateFileToSearchStore = async ({
  file,
  fileSearchStoreName,
  candidateId,
  candidate,
  displayName,
}: {
  file: Blob;
  fileSearchStoreName: string;
  candidateId: string;
  candidate: CandidateFileSearchMetadata;
  displayName: string;
}) => {
  const customMetadata = buildCandidateSearchMetadata(candidateId, candidate);
  const fileSearchClient = createFileSearchClient();

  return uploadAndIndexDocument({
    client: fileSearchClient,
    file,
    fileSearchStoreName,
    displayName,
    customMetadata,
  });
};
