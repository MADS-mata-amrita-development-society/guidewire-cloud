-- ================================================
-- Atomic wallet top-up function
-- Fixes race condition in client-side read-then-write
-- Run this in the Supabase SQL Editor
-- ================================================

CREATE OR REPLACE FUNCTION public.atomic_wallet_topup(
  p_user_id uuid,
  p_amount numeric,
  p_description text DEFAULT 'Admin top-up'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_wallet_id uuid;
  v_new_balance numeric;
BEGIN
  -- Authorization: only admins may top up wallets
  IF NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role = 'admin'
  ) THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('error', 'Amount must be positive');
  END IF;

  -- Find the wallet
  SELECT id INTO v_wallet_id FROM wallets WHERE user_id = p_user_id;

  -- Create wallet if it doesn't exist
  IF v_wallet_id IS NULL THEN
    INSERT INTO wallets (user_id, balance, updated_at)
    VALUES (p_user_id, 0, now())
    RETURNING id INTO v_wallet_id;
  END IF;

  -- Atomically update balance (no read-then-write race)
  UPDATE wallets
  SET balance = balance + p_amount,
      updated_at = now()
  WHERE id = v_wallet_id
  RETURNING balance INTO v_new_balance;

  -- Log the transaction in the same DB transaction
  INSERT INTO wallet_transactions (wallet_id, amount, type, description)
  VALUES (v_wallet_id, p_amount, 'credit', p_description);

  RETURN jsonb_build_object(
    'wallet_id', v_wallet_id,
    'new_balance', v_new_balance
  );
END;
$$;
