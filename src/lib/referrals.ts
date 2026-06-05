import { supabase } from './supabase';

const STORAGE_KEY = 'sorsa_referral_code';

export function normalizeReferralCode(value: string | null | undefined) {
  return String(value || '')
    .replace(/^@/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');
}

export function buildReferralCode(handle: string | null | undefined, fallbackId: string | null | undefined) {
  const handleCode = normalizeReferralCode(handle);
  if (handleCode) return handleCode;
  return normalizeReferralCode(fallbackId)?.slice(0, 12) || 'creator';
}

export function saveReferralCode(code: string) {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return;
  window.localStorage.setItem(STORAGE_KEY, normalized);
}

export function getSavedReferralCode() {
  return normalizeReferralCode(window.localStorage.getItem(STORAGE_KEY));
}

export function clearSavedReferralCode() {
  window.localStorage.removeItem(STORAGE_KEY);
}

export async function ensureCreatorReferralCode(userId: string, handle?: string | null) {
  if (!supabase) return null;
  const code = buildReferralCode(handle, userId);
  const { error } = await supabase
    .from('creator_profiles')
    .update({ referral_code: code })
    .eq('id', userId)
    .is('referral_code', null);

  if (error) {
    console.warn('Could not save referral code:', error.message || error);
  }
  return code;
}

export async function attachSavedReferralToCreator(userId: string) {
  if (!supabase) return;
  const code = getSavedReferralCode();
  if (!code) return;

  const { data: referrer, error: referrerError } = await supabase
    .from('creator_profiles')
    .select('id, referral_code')
    .ilike('referral_code', code)
    .maybeSingle();

  if (referrerError || !referrer || referrer.id === userId) {
    clearSavedReferralCode();
    return;
  }

  const { error } = await supabase.from('referrals').insert({
    referrer_id: referrer.id,
    referred_id: userId,
    referral_code: code,
  });

  if (error && error.code !== '23505') {
    console.warn('Could not attach referral:', error.message || error);
  }
  clearSavedReferralCode();
}

export function referralPointsForScore(score: number) {
  if (score >= 751) return 500;
  if (score >= 501) return 300;
  if (score >= 251) return 150;
  if (score >= 101) return 50;
  return 10;
}
