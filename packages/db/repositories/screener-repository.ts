import { desc, eq } from "drizzle-orm";
import { db } from "@workspace/db/db";
import { screener } from "../schema";

export const getAllScreeners = async () => {
  try {
    return await db
      .select()
      .from(screener)
      .orderBy(desc(screener.updatedAt));
  } catch (error) {
    console.error("Error fetching screeners", error);
    return [];
  }
};

export const getScreenerById = async (id: string) => {
  try {
    const [row] = await db
      .select()
      .from(screener)
      .where(eq(screener.id, id))
      .limit(1);
    return row ?? null;
  } catch (error) {
    console.error("Error fetching screener by id", error);
    return null;
  }
};

export const createScreener = async (data: {
  name: string;
  content: string;
  createdBy?: string | null;
}) => {
  const [row] = await db
    .insert(screener)
    .values({
      name: data.name,
      content: data.content,
      createdBy: data.createdBy ?? null,
    })
    .returning();
  return row ?? null;
};

export const updateScreener = async (
  id: string,
  data: { name: string; content: string },
) => {
  const [row] = await db
    .update(screener)
    .set({
      name: data.name,
      content: data.content,
      updatedAt: new Date(),
    })
    .where(eq(screener.id, id))
    .returning();
  return row ?? null;
};

export const deleteScreener = async (id: string) => {
  const [row] = await db
    .delete(screener)
    .where(eq(screener.id, id))
    .returning({ id: screener.id });
  return row ?? null;
};
