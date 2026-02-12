/*
  # Create Ithute Ticketing System Schema

  1. New Tables
    - `user_profiles`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `full_name` (text)
      - `branch` (text) - LEC branch location
      - `role` (text) - either 'staff' or 'tech'
      - `public_key_pem` (text, optional) - for digital signatures
      - `signature_method` (text) - default 'rsa'
      - `created_at` (timestamptz)
      
    - `tickets`
      - `id` (uuid, primary key)
      - `token` (text, unique 8-char identifier)
      - `reporter_id` (uuid, references auth.users)
      - `branch` (text)
      - `description` (text)
      - `ai_classification` (text) - Hardware/Software/Network
      - `severity` (text) - LOW/MEDIUM/HIGH/CRITICAL
      - `status` (text) - pending/in_progress/solved
      - `tech_notes` (text, optional)
      - `solved_by_id` (uuid, optional, references auth.users)
      - `solved_at` (timestamptz, optional)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can read their own profile
    - Users can update their own profile
    - Users can view their own tickets
    - Staff can create tickets
    - Technicians can view all tickets
    - Technicians can update ticket status and notes
*/

-- User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name text NOT NULL,
  branch text NOT NULL DEFAULT 'Main Campus',
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('staff', 'tech')),
  public_key_pem text,
  signature_method text DEFAULT 'rsa',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Tickets Table
CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  branch text NOT NULL,
  description text NOT NULL,
  ai_classification text DEFAULT 'General',
  severity text DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'solved')),
  tech_notes text,
  solved_by_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  solved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tickets_reporter ON tickets(reporter_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_token ON tickets(token);
CREATE INDEX IF NOT EXISTS idx_tickets_created ON tickets(created_at DESC);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- User Profiles Policies
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Tickets Policies
CREATE POLICY "Users can view own tickets"
  ON tickets FOR SELECT
  TO authenticated
  USING (
    reporter_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'tech'
    )
  );

CREATE POLICY "Staff can create tickets"
  ON tickets FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Technicians can update tickets"
  ON tickets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'tech'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'tech'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for tickets updated_at
CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();