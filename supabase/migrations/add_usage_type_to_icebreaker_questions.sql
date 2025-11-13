-- Add usage_type column to icebreaker_questions table
-- This allows admins to specify where each question should be used

ALTER TABLE icebreaker_questions
ADD COLUMN IF NOT EXISTS usage_type TEXT NOT NULL DEFAULT 'both'
CHECK (usage_type IN ('match_dating', 'ice_breaker_chat', 'both'));

-- Add index for better performance when filtering by usage_type
CREATE INDEX IF NOT EXISTS idx_icebreaker_questions_usage_type
ON icebreaker_questions(usage_type);

-- Add index for filtering active questions by usage type
CREATE INDEX IF NOT EXISTS idx_icebreaker_questions_active_usage
ON icebreaker_questions(is_active, usage_type)
WHERE is_active = true;

-- Add comment explaining the column
COMMENT ON COLUMN icebreaker_questions.usage_type IS
'Specifies where this question can be used: match_dating (only when creating matches), ice_breaker_chat (only in chat), or both';
