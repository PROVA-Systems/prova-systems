-- ════════════════════════════════════════════════════════════════════════════
-- PROVA — Migration 12: Referral-System (MEGA²⁷)
-- 2026-05-09
--
-- Referrals-Tabelle für Founding-Member Empfehlungs-Programm.
-- Werber empfiehlt Geworbenen → 50€ Rabatt für Geworbenen + 1 Monat gratis
-- für Werber nach 30-Tage-Hold-Period.
--
-- Idempotent (CREATE TABLE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS).
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Werber
  referrer_user_id UUID NOT NULL,
  referrer_email TEXT NOT NULL,

  -- Geworbener
  referred_email TEXT NOT NULL,
  referred_user_id UUID,

  -- Code + Stripe
  code TEXT UNIQUE NOT NULL,
  stripe_promo_code_id TEXT,
  stripe_coupon_id TEXT NOT NULL DEFAULT 'FRIEND-50',

  -- Persönliche Nachricht
  personal_message TEXT,

  -- Status-Lifecycle
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'active', 'hold', 'rewarded', 'expired', 'cancelled'
  )),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  signed_up_at TIMESTAMPTZ,
  subscribed_at TIMESTAMPTZ,
  reward_eligible_at TIMESTAMPTZ,
  reward_given_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Werber-Reward
  reward_stripe_coupon_id TEXT,
  reward_amount_eur DECIMAL(10,2) DEFAULT 99.00,

  -- Anti-Fraud
  signup_ip TEXT,
  signup_user_agent TEXT,
  fraud_flags JSONB DEFAULT '[]'::jsonb,

  -- Audit
  email_sent_at TIMESTAMPTZ,
  email_delivery_status TEXT,
  reminder_count INTEGER DEFAULT 0,

  -- Workspace (Multi-Tenancy)
  workspace_id UUID NOT NULL
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(code);
CREATE INDEX IF NOT EXISTS idx_referrals_expires ON public.referrals(expires_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_referrals_reward_eligible ON public.referrals(reward_eligible_at) WHERE status IN ('active', 'hold');
CREATE INDEX IF NOT EXISTS idx_referrals_workspace ON public.referrals(workspace_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_email_active ON public.referrals(referred_email)
  WHERE status IN ('pending', 'active', 'hold', 'rewarded');

-- RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "referrals_self_select" ON public.referrals;
CREATE POLICY "referrals_self_select"
  ON public.referrals FOR SELECT
  USING (referrer_user_id = auth.uid());

DROP POLICY IF EXISTS "referrals_service_all" ON public.referrals;
CREATE POLICY "referrals_service_all"
  ON public.referrals FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- updated_at-Trigger (idempotent)
CREATE OR REPLACE FUNCTION public.referrals_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_referrals_updated_at ON public.referrals;
CREATE TRIGGER trg_referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.referrals_set_updated_at();

-- Comment
COMMENT ON TABLE public.referrals IS 'MEGA²⁷ Referral-System: Founding-Member empfehlen Kollegen, 30-Tage-Hold + Auto-Reward';
