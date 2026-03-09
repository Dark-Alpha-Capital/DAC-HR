-- Remove duplicate candidate-position links before enforcing uniqueness.
DELETE FROM candidate_position cp
USING candidate_position cp2
WHERE cp.id > cp2.id
  AND cp.candidate_id = cp2.candidate_id
  AND cp.position_id = cp2.position_id;

-- Remove duplicate interview rounds before enforcing uniqueness.
DELETE FROM interview i
USING interview i2
WHERE i.id > i2.id
  AND i.application_id = i2.application_id
  AND i.position_round_template_id = i2.position_round_template_id;

-- Remove duplicate interview feedback rows before enforcing uniqueness.
DELETE FROM interview_feedback f
USING interview_feedback f2
WHERE f.id > f2.id
  AND f.interview_id = f2.interview_id
  AND f.question_id = f2.question_id;

CREATE UNIQUE INDEX IF NOT EXISTS candidate_position_unique
  ON candidate_position (candidate_id, position_id);

CREATE UNIQUE INDEX IF NOT EXISTS interview_round_unique
  ON interview (application_id, position_round_template_id);

CREATE UNIQUE INDEX IF NOT EXISTS interview_feedback_unique
  ON interview_feedback (interview_id, question_id);
