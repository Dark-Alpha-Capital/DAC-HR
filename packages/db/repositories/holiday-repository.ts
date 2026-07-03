import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@workspace/db/db";
import { holiday } from "../schema";

export const getHolidaysInRange = async (startDate: string, endDate: string) => {
  try {
    return await db
      .select()
      .from(holiday)
      .where(and(gte(holiday.date, startDate), lte(holiday.date, endDate)))
      .orderBy(holiday.date);
  } catch (error) {
    console.error("Error fetching holidays", error);
    return [];
  }
};

export const getHolidayByDate = async (date: string) => {
  try {
    const [row] = await db
      .select()
      .from(holiday)
      .where(eq(holiday.date, date))
      .limit(1);
    return row ?? null;
  } catch (error) {
    console.error("Error fetching holiday by date", error);
    return null;
  }
};

export const createHoliday = async (
  date: string,
  name: string,
  description: string | null,
  createdBy: string,
) => {
  try {
    const [row] = await db
      .insert(holiday)
      .values({ date, name, description, createdBy })
      .returning();
    return row ?? null;
  } catch (error) {
    console.error("Error creating holiday", error);
    throw error;
  }
};

export const deleteHoliday = async (id: string) => {
  try {
    const [row] = await db
      .delete(holiday)
      .where(eq(holiday.id, id))
      .returning({ id: holiday.id });
    return row ?? null;
  } catch (error) {
    console.error("Error deleting holiday", error);
    throw error;
  }
};
