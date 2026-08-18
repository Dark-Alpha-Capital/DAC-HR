import { desc, eq } from "drizzle-orm";
import { db } from "@workspace/db/db";
import { screener, position } from "../schema";

const screenerWithPosition = {
  id: screener.id,
  name: screener.name,
  content: screener.content,
  positionId: screener.positionId,
  createdBy: screener.createdBy,
  createdAt: screener.createdAt,
  updatedAt: screener.updatedAt,
};

const withPositionJoin = () => ({
  ...screenerWithPosition,
  position: {
    id: position.id,
    name: position.name,
  },
});

export const getAllScreeners = async () => {
  try {
    return await db
      .select(withPositionJoin())
      .from(screener)
      .leftJoin(position, eq(screener.positionId, position.id))
      .orderBy(desc(screener.updatedAt));
  } catch (error) {
    console.error("Error fetching screeners", error);
    return [];
  }
};

export const getScreenerById = async (id: string) => {
  try {
    const [row] = await db
      .select(withPositionJoin())
      .from(screener)
      .leftJoin(position, eq(screener.positionId, position.id))
      .where(eq(screener.id, id))
      .limit(1);
    return row ?? null;
  } catch (error) {
    console.error("Error fetching screener by id", error);
    return null;
  }
};

export const getScreenerByPositionId = async (positionId: string) => {
  try {
    const [row] = await db
      .select(withPositionJoin())
      .from(screener)
      .leftJoin(position, eq(screener.positionId, position.id))
      .where(eq(screener.positionId, positionId))
      .limit(1);
    return row ?? null;
  } catch (error) {
    console.error("Error fetching screener by position id", error);
    return null;
  }
};

export const createScreener = async (data: {
  name: string;
  content: string;
  positionId?: string | null;
  createdBy?: string | null;
}) => {
  const [row] = await db
    .insert(screener)
    .values({
      name: data.name,
      content: data.content,
      positionId: data.positionId ?? null,
      createdBy: data.createdBy ?? null,
    })
    .returning();
  return row ?? null;
};

export const updateScreener = async (
  id: string,
  data: { name: string; content: string; positionId?: string | null },
) => {
  const [row] = await db
    .update(screener)
    .set({
      name: data.name,
      content: data.content,
      positionId: data.positionId ?? null,
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
