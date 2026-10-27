-- ============================================================================
-- SpartanTrace - Supabase PostgreSQL Database Schema
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ============================================================================

-- 1. Profiles Table (SJSU verified user accounts)
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  is_suspended BOOLEAN DEFAULT FALSE,
  failed_login_attempts INT DEFAULT 0,
  lockout_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Listings Table (Found Items)
CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY DEFAULT ('listing-' || floor(extract(epoch from now()) * 1000)::text),
  finder_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  finder_name TEXT NOT NULL,
  finder_email TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  category TEXT NOT NULL,
  location_found TEXT NOT NULL,
  date_found DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'Pending', 'Claimed', 'Returned')),
  return_date TIMESTAMPTZ,
  is_removed BOOLEAN DEFAULT FALSE,
  moderation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Claims Table
CREATE TABLE IF NOT EXISTS claims (
  id TEXT PRIMARY KEY DEFAULT ('claim-' || floor(extract(epoch from now()) * 1000)::text),
  listing_id TEXT REFERENCES listings(id) ON DELETE CASCADE,
  claimant_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  claimant_name TEXT NOT NULL,
  claimant_email TEXT NOT NULL,
  proof_description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Accepted', 'Rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Conversations & Direct Messages
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY DEFAULT ('conv-' || floor(extract(epoch from now()) * 1000)::text),
  claim_id TEXT REFERENCES claims(id) ON DELETE CASCADE,
  listing_id TEXT REFERENCES listings(id) ON DELETE CASCADE,
  finder_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  claimant_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY DEFAULT ('msg-' || floor(extract(epoch from now()) * 1000)::text),
  conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_removed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Lost-Item Alerts
CREATE TABLE IF NOT EXISTS lost_item_alerts (
  id TEXT PRIMARY KEY DEFAULT ('alert-' || floor(extract(epoch from now()) * 1000)::text),
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  keywords TEXT NOT NULL,
  category TEXT,
  location TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT ('notif-' || floor(extract(epoch from now()) * 1000)::text),
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link_type TEXT NOT NULL,
  link_id TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Content Reports
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY DEFAULT ('report-' || floor(extract(epoch from now()) * 1000)::text),
  reporter_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  reporter_name TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('listing', 'message')),
  content_id TEXT NOT NULL,
  owner_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  owner_name TEXT NOT NULL,
  reason TEXT NOT NULL,
  content_snippet TEXT,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Dismissed', 'Confirmed')),
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Admin Audit Logs
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id TEXT PRIMARY KEY DEFAULT ('audit-' || floor(extract(epoch from now()) * 1000)::text),
  admin_id TEXT REFERENCES profiles(id),
  admin_name TEXT NOT NULL,
  action TEXT NOT NULL,
  target_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_listings_search 
ON listings USING GIN (to_tsvector('english', title || ' ' || description));

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE lost_item_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Permissive policies for anonymous / authenticated access
CREATE POLICY "Public read active listings" ON listings FOR SELECT USING (true);
CREATE POLICY "Users can insert listings" ON listings FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update listings" ON listings FOR UPDATE USING (true);

CREATE POLICY "Allow public read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Allow manage profiles" ON profiles FOR ALL USING (true);

CREATE POLICY "Allow claims" ON claims FOR ALL USING (true);
CREATE POLICY "Allow conversations" ON conversations FOR ALL USING (true);
CREATE POLICY "Allow messages" ON messages FOR ALL USING (true);
CREATE POLICY "Allow notifications" ON notifications FOR ALL USING (true);
CREATE POLICY "Allow lost_item_alerts" ON lost_item_alerts FOR ALL USING (true);CREATE POLICY "Allow reports" ON reports FOR ALL USING (true);
CREATE POLICY "Allow audit logs" ON admin_audit_logs FOR ALL USING (true);
