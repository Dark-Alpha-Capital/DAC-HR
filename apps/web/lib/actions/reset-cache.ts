"use server";

import { updateTag } from "next/cache";

export const resetCacheForCandidates = async () => {
  updateTag("candidates");
};
