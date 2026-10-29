-- ==============================================================================
-- ROOMIE SUPABASE DATABASE SCHEMA
-- Matching Roomie Build Spec (Section 10) & Roadmap Data Architecture
-- Includes standard offline sync fields: id, created_at, updated_at, deleted_at, version
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. ENUMS
-- ------------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('admin', 'member');
CREATE TYPE membership_status AS ENUM ('pending', 'active', 'left');
CREATE TYPE currency_code AS ENUM ('TRY', 'USD', 'EUR');
CREATE TYPE effort_level AS ENUM ('light', 'medium', 'heavy');
CREATE TYPE chore_frequency AS ENUM ('daily', 'weekly');
CREATE TYPE expense_category AS ENUM ('groceries', 'household', 'utilities', 'rent', 'other');
CREATE TYPE expense_status AS ENUM ('pending', 'agreed', 'disputed', 'cancelled');
CREATE TYPE share_response AS ENUM ('pending', 'agreed', 'disputed');
CREATE TYPE settlement_status AS ENUM ('marked_paid', 'confirmed');
CREATE TYPE draft_status AS ENUM ('collecting', 'ready_to_reveal', 'revealed');
CREATE TYPE pick_type AS ENUM ('want', 'avoid', 'suggest_for');
CREATE TYPE kudos_type AS ENUM ('thanks', 'great_job', 'needs_look');
CREATE TYPE topic_status AS ENUM ('open', 'agreed', 'archived');
CREATE TYPE topic_vote AS ENUM ('agree', 'disagree', 'neutral');

-- ------------------------------------------------------------------------------
-- 2. HELPER FUNCTIONS & TRIGGERS (Auto-update updated_at & increment version)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_and_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.version = COALESCE(OLD.version, 0) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 3. PROFILES / USERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  avatar TEXT DEFAULT '',
  country TEXT DEFAULT '',
  country_code TEXT DEFAULT 'XX',
  flag TEXT DEFAULT '🌐',
  is_home BOOLEAN DEFAULT true,
  streak_days INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  away_until TIMESTAMPTZ NULL,
  settings JSONB DEFAULT '{"language":"en","soundEnabled":false,"reducedMotion":false,"pushNotifications":true,"reminderEarly30Min":true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER DEFAULT 1
);

CREATE TRIGGER trg_profiles_version BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_and_version();

-- ------------------------------------------------------------------------------
-- 4. HOUSEHOLDS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  currency currency_code NOT NULL DEFAULT 'TRY',
  invite_code TEXT NOT NULL UNIQUE,
  invites_enabled BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  settings JSONB DEFAULT '{"rotationInterval":"weekly","rotatingAdmin":false,"quietHours":"23:00 - 08:00"}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER DEFAULT 1
);

CREATE TRIGGER trg_households_version BEFORE UPDATE ON public.households
FOR EACH ROW EXECUTE FUNCTION set_updated_and_version();

-- ------------------------------------------------------------------------------
-- 5. MEMBERSHIPS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'member',
  status membership_status NOT NULL DEFAULT 'active',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER DEFAULT 1,
  UNIQUE(user_id, household_id)
);

CREATE TRIGGER trg_memberships_version BEFORE UPDATE ON public.memberships
FOR EACH ROW EXECUTE FUNCTION set_updated_and_version();

-- ------------------------------------------------------------------------------
-- 6. JOIN REQUESTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_country TEXT DEFAULT '',
  user_flag TEXT DEFAULT '🌐',
  user_avatar TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  votes JSONB DEFAULT '[]'::jsonb, -- array of { userId: string, vote: 'ok' | 'unsure' }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER DEFAULT 1
);

CREATE TRIGGER trg_join_requests_version BEFORE UPDATE ON public.join_requests
FOR EACH ROW EXECUTE FUNCTION set_updated_and_version();

-- ------------------------------------------------------------------------------
-- 7. EXPENSES & EXPENSE SHARES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  paid_by UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  category expense_category NOT NULL DEFAULT 'other',
  receipt_url TEXT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status expense_status NOT NULL DEFAULT 'pending',
  dispute_reason TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER DEFAULT 1
);

CREATE TRIGGER trg_expenses_version BEFORE UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION set_updated_and_version();

CREATE TABLE IF NOT EXISTS public.expense_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  share_amount NUMERIC(12, 2) NOT NULL CHECK (share_amount >= 0),
  response share_response NOT NULL DEFAULT 'pending',
  dispute_reason TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER DEFAULT 1,
  UNIQUE(expense_id, user_id)
);

CREATE TRIGGER trg_expense_shares_version BEFORE UPDATE ON public.expense_shares
FOR EACH ROW EXECUTE FUNCTION set_updated_and_version();

-- ------------------------------------------------------------------------------
-- 8. SETTLEMENTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  from_user UUID NOT NULL REFERENCES public.profiles(id),
  to_user UUID NOT NULL REFERENCES public.profiles(id),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  status settlement_status NOT NULL DEFAULT 'marked_paid',
  confirmed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER DEFAULT 1
);

CREATE TRIGGER trg_settlements_version BEFORE UPDATE ON public.settlements
FOR EACH ROW EXECUTE FUNCTION set_updated_and_version();

-- ------------------------------------------------------------------------------
-- 9. CHORES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  frequency chore_frequency NOT NULL DEFAULT 'weekly',
  effort_level effort_level NOT NULL DEFAULT 'medium',
  active BOOLEAN NOT NULL DEFAULT true,
  description TEXT DEFAULT '',
  icon_name TEXT DEFAULT 'Sparkles',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER DEFAULT 1
);

CREATE TRIGGER trg_chores_version BEFORE UPDATE ON public.chores
FOR EACH ROW EXECUTE FUNCTION set_updated_and_version();

-- ------------------------------------------------------------------------------
-- 10. DRAFT ROUNDS & PICKS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.draft_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  status draft_status NOT NULL DEFAULT 'collecting',
  revealed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER DEFAULT 1
);

CREATE TRIGGER trg_draft_rounds_version BEFORE UPDATE ON public.draft_rounds
FOR EACH ROW EXECUTE FUNCTION set_updated_and_version();

CREATE TABLE IF NOT EXISTS public.draft_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES public.draft_rounds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chore_id UUID NOT NULL REFERENCES public.chores(id) ON DELETE CASCADE,
  pick_type pick_type NOT NULL,
  target_user_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER DEFAULT 1,
  UNIQUE(round_id, user_id, chore_id)
);

CREATE TRIGGER trg_draft_picks_version BEFORE UPDATE ON public.draft_picks
FOR EACH ROW EXECUTE FUNCTION set_updated_and_version();

CREATE TABLE IF NOT EXISTS public.chore_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES public.draft_rounds(id) ON DELETE CASCADE,
  chore_id UUID NOT NULL REFERENCES public.chores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scheduled_days TEXT[] NOT NULL DEFAULT '{"Daily"}',
  scheduled_time TEXT NOT NULL DEFAULT '18:00',
  completed_today BOOLEAN DEFAULT false,
  last_photo_url TEXT NULL,
  kudos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER DEFAULT 1,
  UNIQUE(round_id, chore_id)
);

CREATE TRIGGER trg_chore_assignments_version BEFORE UPDATE ON public.chore_assignments
FOR EACH ROW EXECUTE FUNCTION set_updated_and_version();

-- ------------------------------------------------------------------------------
-- 11. CHAT MESSAGES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- NULL for system activity
  type TEXT NOT NULL DEFAULT 'text', -- 'text' | 'activity'
  body TEXT NOT NULL,
  link_target JSONB NULL,
  reactions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER DEFAULT 1
);

CREATE TRIGGER trg_chat_messages_version BEFORE UPDATE ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION set_updated_and_version();

-- ------------------------------------------------------------------------------
-- 12. MEETING TOPICS, VOTES & AGREEMENTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meeting_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  proposed_by UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status topic_status NOT NULL DEFAULT 'open',
  votes JSONB DEFAULT '[]'::jsonb,
  comments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER DEFAULT 1
);

CREATE TRIGGER trg_meeting_topics_version BEFORE UPDATE ON public.meeting_topics
FOR EACH ROW EXECUTE FUNCTION set_updated_and_version();

CREATE TABLE IF NOT EXISTS public.house_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'House Rules',
  agreed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER DEFAULT 1
);

CREATE TRIGGER trg_house_agreements_version BEFORE UPDATE ON public.house_agreements
FOR EACH ROW EXECUTE FUNCTION set_updated_and_version();

-- ------------------------------------------------------------------------------
-- 13. IN-APP NOTIFICATIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'chore' | 'expense' | 'household' | 'chat'
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  link_target JSONB NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER DEFAULT 1
);

CREATE TRIGGER trg_notifications_version BEFORE UPDATE ON public.notifications
FOR EACH ROW EXECUTE FUNCTION set_updated_and_version();

-- ------------------------------------------------------------------------------
-- 14. ROW-LEVEL SECURITY (RLS) POLICIES
-- Only active members of a household can access household records
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chore_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.house_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Helper security function: checks if auth.uid() is active member of household
CREATE OR REPLACE FUNCTION public.is_household_member(h_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.memberships
    WHERE household_id = h_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: Anyone authenticated can read flatmates; users can update own profile
CREATE POLICY "Profiles readable by authenticated users" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

-- Households: Active members can view and update
CREATE POLICY "Households viewable by active members" ON public.households
  FOR SELECT TO authenticated USING (public.is_household_member(id));
CREATE POLICY "Households insertable by authenticated users" ON public.households
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Households updatable by active members" ON public.households
  FOR UPDATE TO authenticated USING (public.is_household_member(id));

-- Memberships: Members can see household roster
CREATE POLICY "Memberships viewable by flatmates" ON public.memberships
  FOR SELECT TO authenticated USING (public.is_household_member(household_id) OR user_id = auth.uid());
CREATE POLICY "Memberships manageable by household admin" ON public.memberships
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.memberships
      WHERE household_id = public.memberships.household_id
        AND user_id = auth.uid()
        AND role = 'admin'
        AND status = 'active'
    )
  );

-- Join requests: Active members can view and vote
CREATE POLICY "Join requests viewable by active members" ON public.join_requests
  FOR SELECT TO authenticated USING (public.is_household_member(household_id));
CREATE POLICY "Join requests insertable by any authenticated user" ON public.join_requests
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Join requests updatable by active members" ON public.join_requests
  FOR UPDATE TO authenticated USING (public.is_household_member(household_id));

-- Expenses & Shares: Scoped to active household members
CREATE POLICY "Expenses viewable by members" ON public.expenses
  FOR ALL TO authenticated USING (public.is_household_member(household_id));
CREATE POLICY "Expense shares viewable by members" ON public.expense_shares
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.expenses WHERE id = public.expense_shares.expense_id AND public.is_household_member(household_id))
  );

-- Settlements: Scoped to active household members
CREATE POLICY "Settlements viewable by members" ON public.settlements
  FOR ALL TO authenticated USING (public.is_household_member(household_id));

-- Chores, Drafts, Assignments: Scoped to active household members
CREATE POLICY "Chores viewable by members" ON public.chores
  FOR ALL TO authenticated USING (public.is_household_member(household_id));
CREATE POLICY "Draft rounds viewable by members" ON public.draft_rounds
  FOR ALL TO authenticated USING (public.is_household_member(household_id));
CREATE POLICY "Draft picks manageable by members" ON public.draft_picks
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.draft_rounds WHERE id = public.draft_picks.round_id AND public.is_household_member(household_id))
  );
CREATE POLICY "Chore assignments viewable by members" ON public.chore_assignments
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.draft_rounds WHERE id = public.chore_assignments.round_id AND public.is_household_member(household_id))
  );

-- Chat: Scoped to active household members
CREATE POLICY "Chat messages viewable by members" ON public.chat_messages
  FOR ALL TO authenticated USING (public.is_household_member(household_id));

-- Meeting topics & Agreements: Scoped to active household members
CREATE POLICY "Meeting topics viewable by members" ON public.meeting_topics
  FOR ALL TO authenticated USING (public.is_household_member(household_id));
CREATE POLICY "House agreements viewable by members" ON public.house_agreements
  FOR ALL TO authenticated USING (public.is_household_member(household_id));

-- Notifications: Only visible to target user
CREATE POLICY "Notifications viewable only by owner" ON public.notifications
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 14. CHORE COMPLETION LOGS (Data Handling Spec Section 4)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chore_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  chore_id UUID NOT NULL REFERENCES public.chores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  photo_url TEXT NULL,
  thumbnail_url TEXT NULL,
  note TEXT DEFAULT '',
  kudos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER DEFAULT 1
);

CREATE TRIGGER trg_chore_logs_version BEFORE UPDATE ON public.chore_logs
FOR EACH ROW EXECUTE FUNCTION set_updated_and_version();

ALTER TABLE public.chore_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chore logs viewable by members" ON public.chore_logs
  FOR ALL TO authenticated USING (public.is_household_member(household_id));

-- ------------------------------------------------------------------------------
-- 15. RECURRING BILLS (Roadmap Phase 3 & Section 7)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recurring_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  category expense_category NOT NULL DEFAULT 'rent',
  due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  split_rule JSONB NOT NULL DEFAULT '{"type":"equal"}'::jsonb,
  payer_id UUID REFERENCES public.profiles(id),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER DEFAULT 1
);

CREATE TRIGGER trg_recurring_bills_version BEFORE UPDATE ON public.recurring_bills
FOR EACH ROW EXECUTE FUNCTION set_updated_and_version();

ALTER TABLE public.recurring_bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Recurring bills viewable by members" ON public.recurring_bills
  FOR ALL TO authenticated USING (public.is_household_member(household_id));

-- ------------------------------------------------------------------------------
-- 16. SHARED SHOPPING LIST (Roadmap Phase 3 & Section 7)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shopping_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  added_by UUID NOT NULL REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'needed', -- 'needed' | 'in_cart' | 'purchased'
  is_low BOOLEAN NOT NULL DEFAULT false,
  purchased_by UUID REFERENCES public.profiles(id),
  purchased_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER DEFAULT 1
);

CREATE TRIGGER trg_shopping_items_version BEFORE UPDATE ON public.shopping_items
FOR EACH ROW EXECUTE FUNCTION set_updated_and_version();

ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shopping items viewable by members" ON public.shopping_items
  FOR ALL TO authenticated USING (public.is_household_member(household_id));

-- ------------------------------------------------------------------------------
-- 17. MOVE-IN CONDITION SNAPSHOTS (Roadmap Phase 3 & Section 7)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.move_in_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  room_name TEXT NOT NULL,
  condition_notes TEXT DEFAULT '',
  photos TEXT[] DEFAULT '{}',
  confirmed_by JSONB DEFAULT '[]'::jsonb, -- array of { userId, confirmedAt }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER DEFAULT 1
);

CREATE TRIGGER trg_move_in_snapshots_version BEFORE UPDATE ON public.move_in_snapshots
FOR EACH ROW EXECUTE FUNCTION set_updated_and_version();

ALTER TABLE public.move_in_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Move-in snapshots viewable by members" ON public.move_in_snapshots
  FOR ALL TO authenticated USING (public.is_household_member(household_id));

-- ------------------------------------------------------------------------------
-- 18. MAINTENANCE & LANDLORD LOG (Roadmap Phase 3 & Section 7)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.maintenance_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'reported', -- 'reported' | 'notified_landlord' | 'fixed'
  photos TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER DEFAULT 1
);

CREATE TRIGGER trg_maintenance_issues_version BEFORE UPDATE ON public.maintenance_issues
FOR EACH ROW EXECUTE FUNCTION set_updated_and_version();

ALTER TABLE public.maintenance_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Maintenance issues viewable by members" ON public.maintenance_issues
  FOR ALL TO authenticated USING (public.is_household_member(household_id));

-- ------------------------------------------------------------------------------
-- 19. WEEKLY ANONYMOUS VIBE PULSE (Roadmap Phase 2 & Section 7)
-- Anonymous: individual responses are strictly unlinked to user_id
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vibe_pulses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER DEFAULT 1
);

CREATE TRIGGER trg_vibe_pulses_version BEFORE UPDATE ON public.vibe_pulses
FOR EACH ROW EXECUTE FUNCTION set_updated_and_version();

ALTER TABLE public.vibe_pulses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vibe pulses viewable by members" ON public.vibe_pulses
  FOR SELECT TO authenticated USING (public.is_household_member(household_id));
CREATE POLICY "Vibe pulses insertable by members" ON public.vibe_pulses
  FOR INSERT TO authenticated WITH CHECK (public.is_household_member(household_id));

-- ------------------------------------------------------------------------------
-- 20. FAVOR TOKENS (Roadmap Phase 2 & Section 7)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.favor_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 3 CHECK (balance >= 0 AND balance <= 10),
  history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER DEFAULT 1,
  UNIQUE(household_id, user_id)
);

CREATE TRIGGER trg_favor_tokens_version BEFORE UPDATE ON public.favor_tokens
FOR EACH ROW EXECUTE FUNCTION set_updated_and_version();

ALTER TABLE public.favor_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Favor tokens viewable by members" ON public.favor_tokens
  FOR ALL TO authenticated USING (public.is_household_member(household_id));

-- ------------------------------------------------------------------------------
-- 21. SUPABASE STORAGE BUCKETS
-- Private buckets for receipts, chore proof photos, and avatars
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('receipts', 'receipts', false),
  ('chore-proof', 'chore-proof', false),
  ('snapshots', 'snapshots', false),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

