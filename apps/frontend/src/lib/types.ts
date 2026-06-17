export type CandidateWithPosition = {
  position: {
    id: string;
    name: string;
  } | null;
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};
