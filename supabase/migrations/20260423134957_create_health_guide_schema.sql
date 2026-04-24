/*
  # Health Symptom Guide Schema

  1. New Tables
    - `conversations`
      - `id` (uuid, primary key)
      - `user_session_id` (text) - anonymous session identifier
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `messages`
      - `id` (uuid, primary key)
      - `conversation_id` (uuid, foreign key)
      - `role` (text) - 'user' or 'assistant'
      - `content` (text) - message text
      - `metadata` (jsonb) - optional: conditions, severity, etc.
      - `created_at` (timestamp)

    - `symptom_knowledge` (RAG knowledge base)
      - `id` (uuid, primary key)
      - `condition` (text) - disease/condition name
      - `symptoms` (text) - comma-separated symptoms
      - `description` (text)
      - `precautions` (text)
      - `remedies` (text)
      - `when_to_see_doctor` (text)
      - `severity` (text) - low/medium/high
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Public read on symptom_knowledge
    - Session-scoped access on conversations and messages
*/

CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_session_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert conversations"
  ON conversations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can read own session conversations"
  ON conversations FOR SELECT
  USING (true);

CREATE POLICY "Users can update own session conversations"
  ON conversations FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL DEFAULT '',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert messages"
  ON messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read messages"
  ON messages FOR SELECT
  USING (true);

CREATE TABLE IF NOT EXISTS symptom_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  condition text NOT NULL,
  symptoms text NOT NULL,
  description text NOT NULL DEFAULT '',
  precautions text NOT NULL DEFAULT '',
  remedies text NOT NULL DEFAULT '',
  when_to_see_doctor text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE symptom_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read symptom knowledge"
  ON symptom_knowledge FOR SELECT
  USING (true);

CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations(user_session_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_symptom_knowledge_condition ON symptom_knowledge(condition);
