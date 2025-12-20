-- Step 1: Create a new enum type with the updated values
CREATE TYPE "public"."hire_level_new" AS ENUM('managing-director', 'vice-president', 'associate', 'analyst', 'intern');

-- Step 2: Alter the column to use the new enum type, converting 'associate-analyst' to 'associate' during conversion
ALTER TABLE "position" ALTER COLUMN "hire_level" TYPE "public"."hire_level_new" USING (
  CASE 
    WHEN "hire_level"::text = 'associate-analyst' THEN 'associate'::"public"."hire_level_new"
    ELSE "hire_level"::text::"public"."hire_level_new"
  END
);

-- Step 3: Drop the old enum type
DROP TYPE "public"."hire_level";

-- Step 4: Rename the new enum type to the original name
ALTER TYPE "public"."hire_level_new" RENAME TO "hire_level";

