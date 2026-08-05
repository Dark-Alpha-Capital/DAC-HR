import { asc, eq } from "drizzle-orm";
import { db } from "@workspace/db/db";
import { candidateChecklistItem } from "../schema";

export const getChecklistItemsByCandidateId = async (candidateId: string) => {
  try {
    return await db
      .select()
      .from(candidateChecklistItem)
      .where(eq(candidateChecklistItem.candidateId, candidateId))
      .orderBy(asc(candidateChecklistItem.createdAt));
  } catch (error) {
    console.error("Error fetching checklist items", error);
    return [];
  }
};

export const createChecklistItem = async (data: {
  candidateId: string;
  label: string;
}) => {
  const [row] = await db
    .insert(candidateChecklistItem)
    .values({
      candidateId: data.candidateId,
      label: data.label,
      checked: false,
    })
    .returning();
  return row ?? null;
};

export const updateChecklistItem = async (
  id: string,
  data: { label?: string; checked?: boolean },
) => {
  const [row] = await db
    .update(candidateChecklistItem)
    .set({
      ...(data.label !== undefined ? { label: data.label } : {}),
      ...(data.checked !== undefined ? { checked: data.checked } : {}),
      updatedAt: new Date(),
    })
    .where(eq(candidateChecklistItem.id, id))
    .returning();
  return row ?? null;
};

export const deleteChecklistItem = async (id: string) => {
  const [row] = await db
    .delete(candidateChecklistItem)
    .where(eq(candidateChecklistItem.id, id))
    .returning({ id: candidateChecklistItem.id });
  return row ?? null;
};
