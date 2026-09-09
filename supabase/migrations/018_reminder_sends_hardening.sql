-- Phase 7 hardening: allow reminder history to survive user deletion.
-- The original column used ON DELETE SET NULL while also being NOT NULL.

ALTER TABLE reminder_sends
  ALTER COLUMN user_id DROP NOT NULL;
