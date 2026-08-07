ALTER TABLE `candidate` ADD `location_city` text;--> statement-breakpoint
ALTER TABLE `candidate` ADD `location_state` text;--> statement-breakpoint
UPDATE `candidate`
SET
  `location_city` = CASE
    WHEN `location` LIKE '%,%' THEN TRIM(SUBSTR(`location`, 1, INSTR(`location`, ',') - 1))
    ELSE TRIM(`location`)
  END,
  `location_state` = CASE
    WHEN `location` LIKE '%,__' THEN UPPER(TRIM(SUBSTR(`location`, INSTR(`location`, ',') + 1)))
    ELSE NULL
  END
WHERE `location` IS NOT NULL AND `location` != '';
