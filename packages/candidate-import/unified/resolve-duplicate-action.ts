export type DuplicateAction =
  | "linked"
  | "resume_updated"
  | "linked_and_resume_updated";

/** Pure helper for import-row metadata when handling an existing candidate. */
export function resolveDuplicateAction(args: {
  linked: boolean;
  resumeUpdated: boolean;
}): DuplicateAction | null {
  if (args.linked && args.resumeUpdated) {
    return "linked_and_resume_updated";
  }
  if (args.linked) {
    return "linked";
  }
  if (args.resumeUpdated) {
    return "resume_updated";
  }
  return null;
}

export function duplicateActionLabel(action: DuplicateAction): string {
  switch (action) {
    case "linked":
      return "Linked to position";
    case "resume_updated":
      return "Resume updated";
    case "linked_and_resume_updated":
      return "Linked to position and resume updated";
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
