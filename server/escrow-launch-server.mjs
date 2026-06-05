import 'dotenv/config';
import express from 'express';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import {
  createPublicClient,
  createWalletClient,
  formatUnits,
  getAddress,
  http,
  isAddress,
  keccak256,
  parseUnits,
  parseEventLogs,
  stringify,
  toBytes
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { campaignEscrowAbi } from '../src/lib/escrowAbi.ts';

const env = {
  SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  ESCROW_RPC_URL: process.env.ESCROW_RPC_URL || process.env.VITE_ESCROW_RPC_URL,
  ESCROW_CHAIN_ID: process.env.ESCROW_CHAIN_ID || process.env.VITE_ESCROW_CHAIN_ID,
  ESCROW_CONTRACT_ADDRESS: process.env.ESCROW_CONTRACT_ADDRESS || process.env.VITE_ESCROW_CONTRACT_ADDRESS,
  PLATFORM_PRIVATE_KEY: process.env.PLATFORM_PRIVATE_KEY,
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || process.env.VITE_ALLOWED_ORIGINS,
  SORSA_API_BASE: process.env.SORSA_API_BASE || 'https://api.sorsa.io/v3',
  SORSA_API_KEY: process.env.SORSA_API_KEY,
  SORSA_WEEKLY_SYNC_ENABLED: process.env.SORSA_WEEKLY_SYNC_ENABLED !== 'false',
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  TELEGRAM_BOT_USERNAME: process.env.TELEGRAM_BOT_USERNAME,
  TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET,
  TELEGRAM_CONNECT_CODE_TTL_MINUTES: process.env.TELEGRAM_CONNECT_CODE_TTL_MINUTES || '30',
  FRONTEND_URL: process.env.FRONTEND_URL || process.env.VITE_FRONTEND_URL,
  PAYOUT_AUTOMATION_ENABLED: process.env.PAYOUT_AUTOMATION_ENABLED !== 'false',
  PAYOUT_POLL_INTERVAL_SECONDS: process.env.PAYOUT_POLL_INTERVAL_SECONDS || '300',
  PAYOUT_MAX_PAYMENTS_PER_TX: process.env.PAYOUT_MAX_PAYMENTS_PER_TX || '50'
};

const requiredEnv = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ESCROW_RPC_URL',
  'ESCROW_CONTRACT_ADDRESS',
  'PLATFORM_PRIVATE_KEY'
];
for (const key of requiredEnv) {
  if (!env[key]) {
    const serverOnly = key === 'SUPABASE_SERVICE_ROLE_KEY' || key === 'PLATFORM_PRIVATE_KEY';
    const hint = serverOnly ? ' This is a server-only secret; do not prefix it with VITE_.' : '';
    throw new Error(`Missing ${key}.${hint}`);
  }
}

const app = express();
app.use(express.json({ limit: '1mb' }));

const allowedOrigins = (env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (allowedOrigins.length === 0 || allowedOrigins.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});
const escrowAddress = getAddress(env.ESCROW_CONTRACT_ADDRESS);
const platformAccount = privateKeyToAccount(env.PLATFORM_PRIVATE_KEY);
const publicClient = createPublicClient({ transport: http(env.ESCROW_RPC_URL) });
const walletClient = createWalletClient({ account: platformAccount, transport: http(env.ESCROW_RPC_URL) });
const expectedChainId = env.ESCROW_CHAIN_ID ? BigInt(env.ESCROW_CHAIN_ID) : null;

function requireBearer(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) throw Object.assign(new Error('Missing bearer token'), { status: 401 });
  return token;
}

async function authenticate(req) {
  const token = requireBearer(req);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw Object.assign(new Error('Invalid session'), { status: 401 });
  return data.user;
}

function assertHex32(value, label) {
  if (typeof value !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw Object.assign(new Error(`Invalid ${label}`), { status: 400 });
  }
}

function normalizeLaunchBody(body) {
  const { campaign, brandWallet, authorization, draftCampaignId } = body || {};
  if (!campaign || typeof campaign !== 'object') throw Object.assign(new Error('Missing campaign payload'), { status: 400 });
  if (!authorization || typeof authorization !== 'object') throw Object.assign(new Error('Missing escrow authorization'), { status: 400 });
  if (!brandWallet || !isAddress(brandWallet)) throw Object.assign(new Error('Invalid brand wallet'), { status: 400 });
  if (!campaign.brand_profile_id) throw Object.assign(new Error('Missing campaign brand_profile_id'), { status: 400 });

  assertHex32(authorization.campaignId, 'campaignId');
  assertHex32(authorization.metadataHash, 'metadataHash');
  assertHex32(authorization.signature?.r, 'signature.r');
  assertHex32(authorization.signature?.s, 'signature.s');
  if (![27, 28].includes(Number(authorization.signature?.v))) {
    throw Object.assign(new Error('Invalid signature.v'), { status: 400 });
  }

  return {
    campaign,
    draftCampaignId: typeof draftCampaignId === 'string' && draftCampaignId.trim() ? draftCampaignId.trim() : null,
    brandWallet: getAddress(brandWallet),
    authorization: {
      campaignId: authorization.campaignId,
      budget: BigInt(authorization.budget),
      startsAt: BigInt(authorization.startsAt),
      endsAt: BigInt(authorization.endsAt),
      metadataHash: authorization.metadataHash,
      nonce: BigInt(authorization.nonce),
      deadline: BigInt(authorization.deadline),
      v: Number(authorization.signature.v),
      r: authorization.signature.r,
      s: authorization.signature.s
    }
  };
}


function buildMetadataHash(campaign) {
  return keccak256(toBytes(stringify(campaign)));
}

function buildCampaignId(campaign, brandWallet, nonce) {
  const seed = stringify({
    brandWallet: brandWallet.toLowerCase(),
    brandProfileId: campaign.brand_profile_id,
    title: campaign.title,
    budget: campaign.budget,
    startDate: campaign.start_date,
    endDate: campaign.end_date,
    nonce: nonce.toString()
  });
  return keccak256(toBytes(seed));
}

async function assertBrandProfileOwner(brandProfileId, userId) {
  const { data, error } = await supabase
    .from('brand_profiles')
    .select('id')
    .eq('id', brandProfileId)
    .eq('owner_id', userId)
    .single();
  if (error || !data) throw Object.assign(new Error('Brand profile does not belong to this user'), { status: 403 });
}

async function getBrandProfileSnapshot(brandProfileId, userId) {
  const { data, error } = await supabase
    .from('brand_profiles')
    .select('id, company_name, logo_url, twitter_handle')
    .eq('id', brandProfileId)
    .eq('owner_id', userId)
    .single();
  if (error || !data) throw Object.assign(new Error('Brand profile does not belong to this user'), { status: 403 });

  return {
    brand_name: data.company_name || null,
    brand_logo_url: data.logo_url || null,
    brand_twitter_handle: data.twitter_handle || null
  };
}

async function assertDraftCampaignOwner(draftCampaignId, userId, brandProfileId) {
  if (!draftCampaignId) return;

  const { data, error } = await supabase
    .from('campaigns')
    .select('id')
    .eq('id', draftCampaignId)
    .eq('owner_id', userId)
    .eq('brand_profile_id', brandProfileId)
    .eq('status', 'draft')
    .single();
  if (error || !data) {
    throw Object.assign(new Error('Draft campaign does not belong to this user'), { status: 403 });
  }
}

async function getUserRole(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  return data?.role || null;
}

async function userOwnsBrandProfile(userId) {
  const { data, error } = await supabase
    .from('brand_profiles')
    .select('id')
    .eq('owner_id', userId)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn(`Could not check brand profile ownership for ${userId}:`, error.message || error);
    return false;
  }
  return Boolean(data);
}

async function assertBrandOperator(userId, message = 'Only brand operators can perform this action') {
  const role = await getUserRole(userId);
  if (role === 'admin' || role === 'brand') return role;
  if (await userOwnsBrandProfile(userId)) return 'brand_operator';
  throw Object.assign(new Error(message), { status: 403 });
}

async function assertCampaignSchemaReady() {
  const { error } = await supabase
    .from('campaigns')
    .select('escrow_campaign_id, escrow_contract_address, escrow_tx_hash, metadata_hash, brand_wallet, escrowed_budget, release_at, brand_name, brand_logo_url, brand_twitter_handle')
    .limit(0);
  if (error) {
    throw Object.assign(
      new Error(`Supabase campaigns table is missing campaign confirmation/snapshot columns. Apply enforce_escrow_confirmed_campaigns.sql and campaign_brand_snapshot.sql. ${error.message}`),
      { status: 500 }
    );
  }
}

function buildDraftPayload(campaign, userId) {
  if (!campaign || typeof campaign !== 'object') {
    throw Object.assign(new Error('Missing campaign payload'), { status: 400 });
  }
  if (!campaign.brand_profile_id && campaign.brand_id) {
    campaign.brand_profile_id = campaign.brand_id;
  }
  if (!campaign.brand_profile_id) {
    throw Object.assign(new Error('Missing campaign brand_profile_id'), { status: 400 });
  }

  const {
    id,
    brand_id,
    created_at,
    updated_at,
    escrow_campaign_id,
    escrow_contract_address,
    escrow_tx_hash,
    metadata_hash,
    brand_wallet,
    escrowed_budget,
    release_at,
    ...draft
  } = campaign;

  const normalizedBudget = Number(draft.budget || 0);
  const normalizedPlatformFee = Number(draft.platform_fee || 0);
  const normalizedNetBudget = Number(draft.net_budget || Math.max(normalizedBudget - normalizedPlatformFee, 0));

  return {
    ...draft,
    title: String(draft.title || ''),
    goal: String(draft.goal || ''),
    overview: String(draft.overview || ''),
    categories: Array.isArray(draft.categories) ? draft.categories : [],
    budget: normalizedBudget,
    platform_fee: normalizedPlatformFee,
    net_budget: normalizedNetBudget,
    start_date: draft.start_date || null,
    end_date: draft.end_date || null,
    owner_id: userId,
    status: 'draft'
  };
}

function eventMatches(args, launch) {
  return (
    String(args.campaignId).toLowerCase() === launch.authorization.campaignId.toLowerCase() &&
    getAddress(args.brand) === launch.brandWallet &&
    args.budget === launch.authorization.budget &&
    args.startsAt === launch.authorization.startsAt &&
    args.endsAt === launch.authorization.endsAt &&
    String(args.metadataHash).toLowerCase() === launch.authorization.metadataHash.toLowerCase()
  );
}

function cleanHandle(handle) {
  return String(handle || '').replace('@', '').trim();
}

function referralPointsForScore(score) {
  const value = Number(score || 0);
  if (value >= 751) return 500;
  if (value >= 501) return 300;
  if (value >= 251) return 150;
  if (value >= 101) return 50;
  return 10;
}

async function qualifyReferralForCreator(creatorId, campaignId) {
  const { data: referral, error: referralError } = await supabase
    .from('referrals')
    .select(`
      id,
      referrer_id,
      referred_id,
      status,
      referred_profile:creator_profiles!referrals_referred_id_fkey (
        id,
        x_handle,
        sorsa_score
      )
    `)
    .eq('referred_id', creatorId)
    .eq('status', 'pending')
    .maybeSingle();

  if (referralError) {
    console.warn(`Could not load referral for creator ${creatorId}:`, referralError.message || referralError);
    return { qualified: false, reason: 'lookup_failed' };
  }
  if (!referral) return { qualified: false, reason: 'no_pending_referral' };

  const points = referralPointsForScore(referral.referred_profile?.sorsa_score);
  const now = new Date().toISOString();
  const { data: updatedReferral, error: updateError } = await supabase
    .from('referrals')
    .update({
      status: 'qualified',
      points_awarded: points,
      qualified_at: now,
      updated_at: now
    })
    .eq('id', referral.id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();

  if (updateError || !updatedReferral) {
    console.warn(`Could not qualify referral ${referral.id}:`, updateError?.message || updateError || 'already updated');
    return { qualified: false, reason: 'update_failed' };
  }

  const { data: referrer } = await supabase
    .from('creator_profiles')
    .select('activity_points')
    .eq('id', referral.referrer_id)
    .maybeSingle();

  const currentPoints = Number(referrer?.activity_points || 0);
  const { error: profileError } = await supabase
    .from('creator_profiles')
    .update({ activity_points: currentPoints + points })
    .eq('id', referral.referrer_id);
  if (profileError) {
    console.warn(`Could not update referral points for ${referral.referrer_id}:`, profileError.message || profileError);
  }

  const referredHandle = referral.referred_profile?.x_handle || 'creator';
  const { error: logError } = await supabase.from('points_log').insert({
    creator_id: referral.referrer_id,
    amount: points,
    event_type: 'referral',
    description: `Referral qualified by ${referredHandle} on campaign ${campaignId}`
  });
  if (logError) {
    console.warn(`Could not write referral points log for ${referral.referrer_id}:`, logError.message || logError);
  }

  return { qualified: true, referralId: referral.id, points };
}

async function awardSubmissionActivityPoints(submission) {
  const creatorId = submission?.creator_id;
  const submissionId = submission?.id;
  if (!creatorId || !submissionId) return { awarded: false, reason: 'missing_submission' };

  const description = `Rewarded for approved submission ${submissionId}`;
  const { data: existing, error: existingError } = await supabase
    .from('points_log')
    .select('id')
    .eq('creator_id', creatorId)
    .eq('event_type', 'tweet_rewarded')
    .eq('description', description)
    .maybeSingle();
  if (existingError) {
    console.warn(`Could not check activity points for submission ${submissionId}:`, existingError.message || existingError);
    return { awarded: false, reason: 'lookup_failed' };
  }
  if (existing) return { awarded: false, reason: 'already_awarded' };

  const points = 10;
  const { data: creator, error: creatorError } = await supabase
    .from('creator_profiles')
    .select('activity_points')
    .eq('id', creatorId)
    .maybeSingle();
  if (creatorError) {
    console.warn(`Could not load creator activity points for ${creatorId}:`, creatorError.message || creatorError);
    return { awarded: false, reason: 'creator_lookup_failed' };
  }

  const currentPoints = Number(creator?.activity_points || 0);
  const { error: profileError } = await supabase
    .from('creator_profiles')
    .update({ activity_points: currentPoints + points })
    .eq('id', creatorId);
  if (profileError) {
    console.warn(`Could not update activity points for ${creatorId}:`, profileError.message || profileError);
    return { awarded: false, reason: 'profile_update_failed' };
  }

  const { error: logError } = await supabase.from('points_log').insert({
    creator_id: creatorId,
    amount: points,
    event_type: 'tweet_rewarded',
    description
  });
  if (logError) {
    console.warn(`Could not write activity points log for ${creatorId}:`, logError.message || logError);
  }

  return { awarded: true, points };
}

async function callSorsa(path, options = {}) {
  if (!env.SORSA_API_KEY) {
    throw Object.assign(new Error('Unable to verify'), { status: 500 });
  }

  const response = await fetch(`${env.SORSA_API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ApiKey: env.SORSA_API_KEY
    }
  });

  if (!response.ok) {
    throw Object.assign(new Error('Unable to verify'), { status: response.status });
  }

  return response.json();
}

function getBackendBaseUrl(req) {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const proto = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto || req.protocol;
  return `${proto}://${req.get('host')}`;
}

function getTelegramBotLink() {
  if (!env.TELEGRAM_BOT_USERNAME) return null;
  return `https://t.me/${env.TELEGRAM_BOT_USERNAME.replace('@', '')}`;
}

function escapeTelegramHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function telegramRequest(method, payload) {
  if (!env.TELEGRAM_BOT_TOKEN) {
    throw Object.assign(new Error('Telegram bot is not configured'), { status: 500 });
  }

  const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData;
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: isFormData ? undefined : { 'Content-Type': 'application/json' },
    body: isFormData ? payload : JSON.stringify(payload)
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.ok === false) {
    throw Object.assign(new Error(body?.description || 'Telegram request failed'), { status: 502 });
  }
  return body?.result;
}

async function sendTelegramMessage(chatId, text) {
  return telegramRequest('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true
  });
}

async function sendTelegramPhoto(chatId, imageUrl, caption, buttonUrl = null) {
  const imageBuffer = await readFile(imageUrl);
  const form = new FormData();
  form.append('chat_id', chatId);
  form.append('photo', new Blob([imageBuffer], { type: 'image/jpeg' }), 'CampaignNotificationImage.JPG');
  form.append('caption', caption);
  form.append('parse_mode', 'HTML');
  if (buttonUrl) {
    form.append('reply_markup', JSON.stringify({
      inline_keyboard: [[{ text: 'View campaign', url: buttonUrl }]]
    }));
  }

  return telegramRequest('sendPhoto', form);
}

function getCampaignNotificationImageUrl() {
  return new URL('../public/CampaignNotificationImage.JPG', import.meta.url);
}

function getCampaignUrl(campaign) {
  if (!env.FRONTEND_URL || !campaign?.id) return null;
  return `${env.FRONTEND_URL.replace(/\/$/, '')}/creator/campaigns/${encodeURIComponent(campaign.id)}`;
}

function buildCampaignNotification(campaign, label = 'New campaign') {
  const title = escapeTelegramHtml(campaign.title || 'Campaign');
  const brand = escapeTelegramHtml(campaign.brand_profile?.company_name || campaign.brand_name || 'SorsaMarket brand');
  const budget = Number(campaign.budget || 0).toLocaleString();
  const categories = Array.isArray(campaign.categories) && campaign.categories.length
    ? `\nCategories: ${escapeTelegramHtml(campaign.categories.join(', '))}`
    : '';
  const campaignUrl = getCampaignUrl(campaign);
  const action = campaignUrl
    ? `\n\n<a href="${escapeTelegramHtml(campaignUrl)}">View campaign</a>`
    : '\n\nOpen SorsaMarket to view details.';

  return `<b>${escapeTelegramHtml(label).toUpperCase()}: ${title}</b>\n\nA new creator campaign is live.\n\nBrand: ${brand}\nBudget: ${budget} USDC${categories}${action}`;
}

async function sendNewCampaignNotification(chatId, campaign) {
  const caption = buildCampaignNotification(campaign, 'New campaign');
  const campaignUrl = getCampaignUrl(campaign);
  try {
    return await sendTelegramPhoto(chatId, getCampaignNotificationImageUrl(), caption, campaignUrl);
  } catch (error) {
    console.warn('Telegram campaign photo failed, sending text fallback:', error.message || error);
    return sendTelegramMessage(chatId, caption);
  }
}

async function notifyTelegramCreators(kind, campaign, text) {
  const preferenceColumn =
    kind === 'payment'
      ? 'notify_payments'
      : kind === 'campaign_update'
        ? 'notify_campaign_updates'
        : 'notify_new_campaigns';

  const { data: creators, error } = await supabase
    .from('creator_profiles')
    .select(`id, telegram_chat_id, ${preferenceColumn}`)
    .not('telegram_chat_id', 'is', null)
    .eq(preferenceColumn, true);
  if (error) {
    console.warn('Could not load Telegram notification recipients:', error.message || error);
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;
  for (const creator of creators || []) {
    try {
      if (kind === 'new_campaign') {
        await sendNewCampaignNotification(creator.telegram_chat_id, campaign);
      } else {
        await sendTelegramMessage(creator.telegram_chat_id, text || buildCampaignNotification(campaign));
      }
      sent += 1;
    } catch (error) {
      failed += 1;
      console.warn(`Telegram notification failed for creator ${creator.id}:`, error.message || error);
    }
  }
  return { sent, failed };
}

async function notifySubmissionDecision(submission) {
  if (!['approved', 'rejected'].includes(submission?.status)) {
    return { sent: 0, skipped: 1 };
  }

  const creator = submission.creator_profile;
  if (!creator?.telegram_chat_id || !creator.notify_campaign_updates) {
    return { sent: 0, skipped: 1 };
  }

  const campaignTitle = submission.campaign?.title || 'SorsaMarket campaign';
  const decision = submission.status === 'approved' ? 'approved' : 'rejected';
  const feedbackLine = submission.feedback ? `\nFeedback: ${escapeTelegramHtml(submission.feedback)}` : '';

  await sendTelegramMessage(
    creator.telegram_chat_id,
    `<b>Submission ${decision}</b>\n${escapeTelegramHtml(campaignTitle)}${feedbackLine}\nOpen SorsaMarket to review details.`
  );

  return { sent: 1, skipped: 0 };
}

function getCurrentSundayMidnightUtc(now = new Date()) {
  const day = now.getUTCDay();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day, 0, 0, 0, 0));
}

function getNextSundayMidnightUtc(now = new Date()) {
  const currentSunday = getCurrentSundayMidnightUtc(now);
  const nextSunday = new Date(currentSunday);
  nextSunday.setUTCDate(currentSunday.getUTCDate() + (currentSunday > now ? 0 : 7));
  return nextSunday;
}

async function syncCreatorProfileFromSorsa(profile) {
  const xHandle = cleanHandle(profile.x_handle);
  if (!xHandle) return { synced: false, reason: 'missing_x_handle' };

  const [scoreData, stats, about] = await Promise.all([
    callSorsa(`/score?username=${encodeURIComponent(xHandle)}`),
    callSorsa(`/info?username=${encodeURIComponent(xHandle)}`),
    callSorsa(`/about?username=${encodeURIComponent(xHandle)}`).catch(() => ({ country: null }))
  ]);
  const score = Math.round(Number(scoreData?.score || 0));
  const finalLocation = stats?.location || about?.country || null;

  const { error } = await supabase
    .from('creator_profiles')
    .update({
      sorsa_score: score,
      follower_count: stats?.followers_count ?? null,
      avatar_url: normalizeAvatarUrl(stats?.profile_image_url),
      bio: stats?.description ?? null,
      country: finalLocation,
      full_name: stats?.display_name ?? null,
      last_profile_sync_at: new Date().toISOString()
    })
    .eq('id', profile.id);
  if (error) throw error;

  return { synced: true };
}

function normalizeAvatarUrl(url) {
  if (!url || typeof url !== 'string') return null;
  return url
    .replace('_normal.', '_400x400.')
    .replace('_bigger.', '_400x400.')
    .replace('_mini.', '_400x400.');
}

function calculateRewardAmount({ sorsaScore, followerCount, totalImpressions, engagementScore }) {
  const base = Number(sorsaScore || 0) * 0.1;
  const followerBoost = Math.min((Number(followerCount || 0) / 5000) * 0.1, 0.1);
  const impressionBoost = Math.min((Number(totalImpressions || 0) / 10000) * 0.1, 0.1);
  let engagementBoost = 0;
  if (Number(engagementScore || 0) >= 1000) engagementBoost = 0.5;
  else if (Number(engagementScore || 0) >= 250) engagementBoost = 0.25;
  else if (Number(engagementScore || 0) >= 50) engagementBoost = 0.1;

  return Number((base * (1 + followerBoost + impressionBoost + engagementBoost)).toFixed(2));
}

let weeklySorsaSyncRunning = false;

async function runWeeklySorsaProfileSync() {
  if (weeklySorsaSyncRunning) return { skipped: true, reason: 'already_running' };
  weeklySorsaSyncRunning = true;

  const weekStart = getCurrentSundayMidnightUtc();
  const pageSize = 100;
  let from = 0;
  let checked = 0;
  let synced = 0;
  let skipped = 0;
  let failed = 0;

  try {
    while (true) {
      const { data: profiles, error } = await supabase
        .from('creator_profiles')
        .select('id, x_handle, last_profile_sync_at')
        .not('x_handle', 'is', null)
        .order('id', { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      if (!profiles?.length) break;

      for (const profile of profiles) {
        checked += 1;
        const lastSyncAt = profile.last_profile_sync_at ? new Date(profile.last_profile_sync_at) : null;
        if (lastSyncAt && lastSyncAt >= weekStart) {
          skipped += 1;
          continue;
        }

        try {
          const result = await syncCreatorProfileFromSorsa(profile);
          if (result.synced) synced += 1;
          else skipped += 1;
        } catch (error) {
          failed += 1;
          console.warn(`Weekly Sorsa sync failed for creator ${profile.id}:`, error.message || error);
        }
      }

      if (profiles.length < pageSize) break;
      from += pageSize;
    }

    return { checked, synced, skipped, failed, weekStart: weekStart.toISOString() };
  } finally {
    weeklySorsaSyncRunning = false;
  }
}

function scheduleWeeklySorsaProfileSync() {
  if (!env.SORSA_WEEKLY_SYNC_ENABLED) {
    console.log('Weekly Sorsa profile sync is disabled.');
    return;
  }

  const scheduleNextRun = () => {
    const nextRunAt = getNextSundayMidnightUtc();
    const delayMs = Math.max(0, nextRunAt.getTime() - Date.now());
    console.log(`Next weekly Sorsa profile sync scheduled for ${nextRunAt.toISOString()}`);

    setTimeout(async () => {
      try {
        const result = await runWeeklySorsaProfileSync();
        console.log('Weekly Sorsa profile sync finished:', result);
      } catch (error) {
        console.error('Weekly Sorsa profile sync failed:', error);
      } finally {
        scheduleNextRun();
      }
    }, delayMs);
  };

  scheduleNextRun();
}

let payoutAutomationRunning = false;

async function getEscrowCampaignState(escrowCampaignId) {
  return publicClient.readContract({
    address: escrowAddress,
    abi: campaignEscrowAbi,
    functionName: 'campaigns',
    args: [escrowCampaignId]
  });
}

function escrowCampaignField(state, index, name) {
  return state?.[name] ?? state?.[index];
}

async function getApprovedPayoutCandidates(campaign) {
  const { data: participants, error } = await supabase
    .from('campaign_participants')
    .select(`
      id,
      creator_id,
      calculated_reward,
      creator_profile:creator_profiles!creator_id (
        id,
        wallet_address,
        sorsa_score,
        follower_count,
        telegram_chat_id,
        notify_payments,
        total_earned
      )
    `)
    .eq('campaign_id', campaign.id)
    .eq('status', 'approved');
  if (error) throw error;

  const candidates = [];
  for (const participant of participants || []) {
    const creator = participant.creator_profile;
    if (!creator?.wallet_address || !isAddress(creator.wallet_address)) {
      console.warn(`Skipping payout for ${participant.creator_id}: missing creator wallet`);
      continue;
    }

    let reward = Number(participant.calculated_reward || 0);
    if (reward <= 0) {
      const { data: submissions, error: submissionsError } = await supabase
        .from('campaign_submissions')
        .select('tweet_url')
        .eq('campaign_id', campaign.id)
        .eq('creator_id', participant.creator_id)
        .eq('status', 'approved');
      if (submissionsError) throw submissionsError;

      for (const submission of submissions || []) {
        try {
          const tweetData = await callSorsa('/tweet-info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tweet_link: submission.tweet_url })
          });
          const impressions = Number(tweetData?.view_count || 0);
          const engagement =
            Number(tweetData?.favorite_count || 0) +
            Number(tweetData?.retweet_count || 0) +
            Number(tweetData?.reply_count || 0);
          reward += calculateRewardAmount({
            sorsaScore: creator.sorsa_score,
            followerCount: creator.follower_count,
            totalImpressions: impressions,
            engagementScore: engagement
          });
        } catch (error) {
          console.warn(`Could not calculate tweet reward for ${participant.creator_id}:`, error.message || error);
        }
      }
    }

    if (reward <= 0) {
      reward = Number(((Number(creator.sorsa_score || 0) || 0) * 0.1).toFixed(2));
    }
    if (reward <= 0) continue;

    candidates.push({
      participant,
      creator,
      wallet: getAddress(creator.wallet_address),
      reward
    });
  }

  return candidates;
}

function fitRewardsToPool(candidates, poolAmount) {
  const total = candidates.reduce((sum, item) => sum + item.reward, 0);
  if (total <= 0) return [];
  const scale = total > poolAmount ? poolAmount / total : 1;

  return candidates
    .map((item) => ({
      ...item,
      allocatedReward: Number((item.reward * scale).toFixed(2))
    }))
    .filter((item) => item.allocatedReward > 0);
}

async function prepareCampaignPayouts(campaign) {
  const escrowState = await getEscrowCampaignState(campaign.escrow_campaign_id);
  const cancelled = Boolean(escrowCampaignField(escrowState, 15, 'cancelled'));
  const allocationsSet = Boolean(escrowCampaignField(escrowState, 14, 'allocationsSet'));
  if (cancelled || allocationsSet) {
    return { prepared: false, reason: cancelled ? 'cancelled' : 'already_allocated' };
  }

  const now = Date.now();
  const endAt = campaign.end_date ? new Date(campaign.end_date).getTime() : Number(escrowCampaignField(escrowState, 11, 'endsAt')) * 1000;
  const releaseAt = campaign.release_at ? new Date(campaign.release_at).getTime() : Number(escrowCampaignField(escrowState, 12, 'releaseAt')) * 1000;
  if (now < endAt) return { prepared: false, reason: 'campaign_active' };
  if (now >= releaseAt) return { prepared: false, reason: 'allocation_window_missed' };

  const candidates = await getApprovedPayoutCandidates(campaign);
  const poolAmount = Number(formatUnits(escrowCampaignField(escrowState, 5, 'performanceRewardPool'), 6));
  const payouts = fitRewardsToPool(candidates, poolAmount);
  if (payouts.length === 0) return { prepared: false, reason: 'no_approved_wallets' };

  const recipients = payouts.map((item) => item.wallet);
  const amounts = payouts.map((item) => parseUnits(item.allocatedReward.toFixed(2), 6));

  const { request } = await publicClient.simulateContract({
    account: platformAccount,
    address: escrowAddress,
    abi: campaignEscrowAbi,
    functionName: 'setAllocations',
    args: [campaign.escrow_campaign_id, recipients, amounts]
  });
  const txHash = await walletClient.writeContract(request);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== 'success') throw new Error('Escrow allocation transaction reverted');

  const events = parseEventLogs({
    abi: campaignEscrowAbi,
    eventName: 'AllocationsSet',
    logs: receipt.logs
  });
  const allocationEvent = events.find(
    (event) => String(event.args.campaignId).toLowerCase() === campaign.escrow_campaign_id.toLowerCase()
  );
  if (!allocationEvent) throw new Error('AllocationsSet event not found');

  for (const payout of payouts) {
    const { error } = await supabase
      .from('campaign_participants')
      .update({ calculated_reward: payout.allocatedReward })
      .eq('id', payout.participant.id);
    if (error) throw error;
  }

  return { prepared: true, txHash, recipients: payouts.length };
}

async function sendPaymentNotification(creator, campaignTitle, amount) {
  if (!creator?.telegram_chat_id || !creator.notify_payments) {
    return { sent: 0, skipped: 1 };
  }

  await sendTelegramMessage(
    creator.telegram_chat_id,
    `<b>Payment sent</b>\n${escapeTelegramHtml(campaignTitle || 'SorsaMarket campaign')}\nAmount: ${escapeTelegramHtml(amount)} USDC\nOpen SorsaMarket to review your wallet history.`
  );
  return { sent: 1, skipped: 0 };
}

async function updatePaidParticipant(campaign, recipient, amount, txHash) {
  const { data: participant, error } = await supabase
    .from('campaign_participants')
    .select(`
      id,
      creator_id,
      creator_profile:creator_profiles!creator_id (
        id,
        wallet_address,
        telegram_chat_id,
        notify_payments,
        total_earned,
        campaigns_completed
      )
    `)
    .eq('campaign_id', campaign.id)
    .eq('status', 'approved');
  if (error) throw error;

  const match = (participant || []).find((item) => {
    const wallet = item.creator_profile?.wallet_address;
    return wallet && isAddress(wallet) && getAddress(wallet) === getAddress(recipient);
  });
  if (!match) return { updated: false, reason: 'participant_not_found' };

  const amountNumber = Number(formatUnits(amount, 6));
  const { error: participantError } = await supabase
    .from('campaign_participants')
    .update({
      status: 'paid',
      calculated_reward: amountNumber,
      approved_at: new Date().toISOString()
    })
    .eq('id', match.id);
  if (participantError) throw participantError;

  const currentEarned = Number(match.creator_profile?.total_earned || 0);
  const currentCompleted = Number(match.creator_profile?.campaigns_completed || 0);
  const { error: profileError } = await supabase
    .from('creator_profiles')
    .update({
      total_earned: Number((currentEarned + amountNumber).toFixed(2)),
      campaigns_completed: currentCompleted + 1
    })
    .eq('id', match.creator_id);
  if (profileError) {
    console.warn(`Could not update creator payout stats for ${match.creator_id}:`, profileError.message || profileError);
  }

  const telegram = await sendPaymentNotification(match.creator_profile, campaign.title, amountNumber.toFixed(2));
  console.log(`Paid ${amountNumber.toFixed(2)} USDC to ${recipient} in tx ${txHash}`);
  return { updated: true, telegram };
}

async function distributeCampaignPayouts(campaign) {
  const escrowState = await getEscrowCampaignState(campaign.escrow_campaign_id);
  if (escrowCampaignField(escrowState, 15, 'cancelled')) return { distributed: false, reason: 'cancelled' };
  if (!escrowCampaignField(escrowState, 14, 'allocationsSet')) return { distributed: false, reason: 'allocations_missing' };

  const releaseAt = campaign.release_at ? new Date(campaign.release_at).getTime() : Number(escrowCampaignField(escrowState, 12, 'releaseAt')) * 1000;
  if (Date.now() < releaseAt) return { distributed: false, reason: 'too_early' };

  const maxPayments = BigInt(Math.max(1, Number(env.PAYOUT_MAX_PAYMENTS_PER_TX || '50')));
  const { request } = await publicClient.simulateContract({
    account: platformAccount,
    address: escrowAddress,
    abi: campaignEscrowAbi,
    functionName: 'distribute',
    args: [campaign.escrow_campaign_id, maxPayments]
  });
  const txHash = await walletClient.writeContract(request);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== 'success') throw new Error('Escrow payout transaction reverted');

  const payoutEvents = parseEventLogs({
    abi: campaignEscrowAbi,
    eventName: 'PayoutSent',
    logs: receipt.logs
  }).filter((event) => String(event.args.campaignId).toLowerCase() === campaign.escrow_campaign_id.toLowerCase());
  if (payoutEvents.length === 0) throw new Error('PayoutSent event not found');

  const updates = [];
  for (const event of payoutEvents) {
    updates.push(await updatePaidParticipant(campaign, event.args.recipient, event.args.amount, txHash));
  }

  const paidEvents = parseEventLogs({
    abi: campaignEscrowAbi,
    eventName: 'CampaignPaid',
    logs: receipt.logs
  }).filter((event) => String(event.args.campaignId).toLowerCase() === campaign.escrow_campaign_id.toLowerCase());
  if (paidEvents.length > 0) {
    const { error } = await supabase
      .from('campaigns')
      .update({ status: 'completed' })
      .eq('id', campaign.id);
    if (error) throw error;
  }

  return { distributed: true, txHash, payouts: updates.length, completed: paidEvents.length > 0 };
}

async function refundUnallocatedCampaign(campaign) {
  const escrowState = await getEscrowCampaignState(campaign.escrow_campaign_id);
  if (escrowCampaignField(escrowState, 15, 'cancelled')) {
    return { refunded: false, reason: 'already_cancelled' };
  }
  if (escrowCampaignField(escrowState, 14, 'allocationsSet')) {
    return { refunded: false, reason: 'allocations_set' };
  }

  const releaseAt = campaign.release_at ? new Date(campaign.release_at).getTime() : Number(escrowCampaignField(escrowState, 12, 'releaseAt')) * 1000;
  if (Date.now() < releaseAt) return { refunded: false, reason: 'too_early' };

  const { request } = await publicClient.simulateContract({
    account: platformAccount,
    address: escrowAddress,
    abi: campaignEscrowAbi,
    functionName: 'cancelUnallocatedCampaign',
    args: [campaign.escrow_campaign_id]
  });
  const txHash = await walletClient.writeContract(request);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== 'success') throw new Error('Escrow refund transaction reverted');

  const refundEvents = parseEventLogs({
    abi: campaignEscrowAbi,
    eventName: 'CampaignCancelled',
    logs: receipt.logs
  }).filter((event) => String(event.args.campaignId).toLowerCase() === campaign.escrow_campaign_id.toLowerCase());
  if (refundEvents.length === 0) throw new Error('CampaignCancelled event not found');

  const { error } = await supabase
    .from('campaigns')
    .update({ status: 'completed' })
    .eq('id', campaign.id);
  if (error) throw error;

  const refunded = refundEvents[0]?.args?.refunded ?? 0n;
  return { refunded: true, txHash, amount: Number(formatUnits(refunded, 6)) };
}

async function getPayoutAutomationCampaigns() {
  const { data, error } = await supabase
    .from('campaigns')
    .select('id, title, status, end_date, release_at, escrow_campaign_id')
    .eq('status', 'live')
    .not('escrow_campaign_id', 'is', null)
    .lte('end_date', new Date().toISOString())
    .order('end_date', { ascending: true })
    .limit(25);
  if (error) throw error;
  return data || [];
}

async function runPayoutAutomation() {
  if (payoutAutomationRunning) return { skipped: true, reason: 'already_running' };
  payoutAutomationRunning = true;

  const summary = { checked: 0, prepared: 0, distributed: 0, skipped: 0, failed: 0 };
  try {
    const campaigns = await getPayoutAutomationCampaigns();
    for (const campaign of campaigns) {
      summary.checked += 1;
      try {
        const releaseAt = campaign.release_at ? new Date(campaign.release_at).getTime() : 0;
        if (releaseAt && Date.now() >= releaseAt) {
          const result = await distributeCampaignPayouts(campaign);
          if (result.distributed) {
            summary.distributed += 1;
          } else if (result.reason === 'allocations_missing') {
            const refund = await refundUnallocatedCampaign(campaign);
            if (refund.refunded) summary.distributed += 1;
            else summary.skipped += 1;
          } else {
            summary.skipped += 1;
          }
        } else {
          const result = await prepareCampaignPayouts(campaign);
          if (result.prepared) summary.prepared += 1;
          else summary.skipped += 1;
        }
      } catch (error) {
        summary.failed += 1;
        console.warn(`Payout automation failed for campaign ${campaign.id}:`, error.message || error);
      }
    }

    return summary;
  } finally {
    payoutAutomationRunning = false;
  }
}

function schedulePayoutAutomation() {
  if (!env.PAYOUT_AUTOMATION_ENABLED) {
    console.log('Payout automation is disabled.');
    return;
  }

  const intervalMs = Math.max(60, Number(env.PAYOUT_POLL_INTERVAL_SECONDS || '300')) * 1000;
  const run = async () => {
    try {
      const result = await runPayoutAutomation();
      console.log('Payout automation finished:', result);
    } catch (error) {
      console.error('Payout automation failed:', error);
    }
  };

  setTimeout(run, 10_000);
  setInterval(run, intervalMs);
  console.log(`Payout automation scheduled every ${intervalMs / 1000}s.`);
}

app.get('/campaigns/launch/ready', async (_req, res) => {
  try {
    await assertCampaignSchemaReady();
    return res.json({ ready: true });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ ready: false, error: error.message || 'Escrow launch backend is not ready' });
  }
});

app.post('/telegram/webhook/:secret', async (req, res) => {
  try {
    if (!env.TELEGRAM_WEBHOOK_SECRET || req.params.secret !== env.TELEGRAM_WEBHOOK_SECRET) {
      return res.sendStatus(404);
    }

    const message = req.body?.message;
    const text = String(message?.text || '').trim();
    const chatId = message?.chat?.id ? String(message.chat.id) : null;
    if (!chatId || !text) return res.json({ ok: true });

    const isStartCommand = text.startsWith('/start');
    const connectCode = isStartCommand ? text.split(/\s+/)[1]?.trim() : text.replace(/^\/connect\s+/i, '').trim();
    if (!connectCode) {
      await sendTelegramMessage(chatId, 'Send the Telegram connect code shown in SorsaMarket Creator Settings.');
      return res.json({ ok: true });
    }

    const { data: profile, error } = await supabase
      .from('creator_profiles')
      .select('id, telegram_connect_expires_at')
      .eq('telegram_connect_code', connectCode)
      .maybeSingle();
    const expiresAt = profile?.telegram_connect_expires_at ? new Date(profile.telegram_connect_expires_at) : null;
    if (error || !profile || !expiresAt || expiresAt < new Date()) {
      await sendTelegramMessage(chatId, 'That SorsaMarket Telegram code is invalid or expired. Generate a new code from Creator Settings.');
      return res.json({ ok: true });
    }

    const telegramUsername = message?.from?.username || null;
    const { error: updateError } = await supabase
      .from('creator_profiles')
      .update({
        telegram_chat_id: chatId,
        telegram_username: telegramUsername,
        telegram_connected_at: new Date().toISOString(),
        telegram_connect_code: null,
        telegram_connect_expires_at: null
      })
      .eq('id', profile.id);
    if (updateError) throw updateError;

    await sendTelegramMessage(chatId, 'Telegram notifications are connected for SorsaMarket. You can manage notification types from Creator Settings.');
    return res.json({ ok: true });
  } catch (error) {
    console.error('telegram webhook failed:', error);
    return res.json({ ok: true });
  }
});

app.post('/telegram/webhook/setup', async (req, res) => {
  try {
    const user = await authenticate(req);
    const role = await getUserRole(user.id);
    if (role !== 'brand' && role !== 'admin') {
      throw Object.assign(new Error('Only admins can configure Telegram webhooks'), { status: 403 });
    }
    if (!env.TELEGRAM_WEBHOOK_SECRET) {
      throw Object.assign(new Error('Missing TELEGRAM_WEBHOOK_SECRET'), { status: 500 });
    }

    const webhookUrl = `${getBackendBaseUrl(req)}/telegram/webhook/${encodeURIComponent(env.TELEGRAM_WEBHOOK_SECRET)}`;
    const result = await telegramRequest('setWebhook', {
      url: webhookUrl,
      allowed_updates: ['message']
    });
    return res.json({ webhookUrl, result });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'Telegram webhook setup failed' });
  }
});

app.get('/telegram/preferences', async (req, res) => {
  try {
    const user = await authenticate(req);
    const { data, error } = await supabase
      .from('creator_profiles')
      .select('telegram_chat_id, telegram_username, telegram_connected_at, notify_new_campaigns, notify_campaign_updates, notify_payments')
      .eq('id', user.id)
      .single();
    if (error) throw error;

    return res.json({
      connected: Boolean(data.telegram_chat_id),
      telegramUsername: data.telegram_username,
      connectedAt: data.telegram_connected_at,
      preferences: {
        newCampaigns: data.notify_new_campaigns,
        campaignUpdates: data.notify_campaign_updates,
        payments: data.notify_payments
      }
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'Could not load Telegram preferences' });
  }
});

app.post('/telegram/connect-code', async (req, res) => {
  try {
    const user = await authenticate(req);
    const ttlMinutes = Math.max(5, Number(env.TELEGRAM_CONNECT_CODE_TTL_MINUTES || '30'));
    const connectCode = randomBytes(18).toString('base64url');
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

    const { error } = await supabase
      .from('creator_profiles')
      .update({
        telegram_connect_code: connectCode,
        telegram_connect_expires_at: expiresAt
      })
      .eq('id', user.id);
    if (error) throw error;

    return res.json({
      connectCode,
      expiresAt,
      botUsername: env.TELEGRAM_BOT_USERNAME || null,
      telegramLink: getTelegramBotLink(connectCode)
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'Could not create Telegram connect link' });
  }
});

app.post('/telegram/disconnect', async (req, res) => {
  try {
    const user = await authenticate(req);
    const { error } = await supabase
      .from('creator_profiles')
      .update({
        telegram_chat_id: null,
        telegram_username: null,
        telegram_connected_at: null,
        telegram_connect_code: null,
        telegram_connect_expires_at: null
      })
      .eq('id', user.id);
    if (error) throw error;
    return res.json({ connected: false });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'Could not disconnect Telegram' });
  }
});

app.post('/telegram/preferences', async (req, res) => {
  try {
    const user = await authenticate(req);
    const preferences = req.body?.preferences || {};
    const payload = {
      notify_new_campaigns: Boolean(preferences.newCampaigns),
      notify_campaign_updates: Boolean(preferences.campaignUpdates),
      notify_payments: Boolean(preferences.payments)
    };

    const { error } = await supabase
      .from('creator_profiles')
      .update(payload)
      .eq('id', user.id);
    if (error) throw error;

    return res.json({
      preferences: {
        newCampaigns: payload.notify_new_campaigns,
        campaignUpdates: payload.notify_campaign_updates,
        payments: payload.notify_payments
      }
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'Could not update Telegram preferences' });
  }
});

app.post('/campaigns/drafts', async (req, res) => {
  try {
    const user = await authenticate(req);
    const draftCampaignId =
      typeof req.body?.draftCampaignId === 'string' && req.body.draftCampaignId.trim()
        ? req.body.draftCampaignId.trim()
        : null;
    const draftPayload = buildDraftPayload(req.body?.campaign, user.id);

    const brandSnapshot = await getBrandProfileSnapshot(draftPayload.brand_profile_id, user.id);
    await assertDraftCampaignOwner(draftCampaignId, user.id, draftPayload.brand_profile_id);
    Object.assign(draftPayload, brandSnapshot);

    const mutation = draftCampaignId
      ? supabase
          .from('campaigns')
          .update(draftPayload)
          .eq('id', draftCampaignId)
          .eq('owner_id', user.id)
          .eq('status', 'draft')
          .select('id, status')
          .single()
      : supabase
          .from('campaigns')
          .insert([draftPayload])
          .select('id, status')
          .single();

    const { data, error } = await mutation;
    if (error) throw Object.assign(new Error(error.message), { status: 500 });

    return res.status(draftCampaignId ? 200 : 201).json({
      campaignId: data.id,
      status: 'draft'
    });
  } catch (error) {
    const status = error.status || 500;
    console.error('campaign draft save failed:', error);
    return res.status(status).json({ error: error.message || 'Campaign draft could not be saved' });
  }
});

app.get('/sorsa/info', async (req, res) => {
  try {
    await authenticate(req);
    const username = cleanHandle(req.query.username);
    if (!username) throw Object.assign(new Error('Missing username'), { status: 400 });
    const data = await callSorsa(`/info?username=${encodeURIComponent(username)}`);
    return res.json(data);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'Unable to verify' });
  }
});

app.get('/sorsa/about', async (req, res) => {
  try {
    await authenticate(req);
    const username = cleanHandle(req.query.username);
    if (!username) throw Object.assign(new Error('Missing username'), { status: 400 });
    const data = await callSorsa(`/about?username=${encodeURIComponent(username)}`);
    return res.json(data);
  } catch (error) {
    const status = error.status || 500;
    if (status === 404) return res.json({ country: null });
    return res.status(status).json({ error: error.message || 'Unable to verify' });
  }
});

app.get('/sorsa/score', async (req, res) => {
  try {
    await authenticate(req);
    const username = cleanHandle(req.query.username);
    if (!username) throw Object.assign(new Error('Missing username'), { status: 400 });
    const data = await callSorsa(`/score?username=${encodeURIComponent(username)}`);
    return res.json(data);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'Unable to verify' });
  }
});

app.post('/sorsa/tweet-info', async (req, res) => {
  try {
    await authenticate(req);
    const tweetLink = req.body?.tweet_link;
    if (!tweetLink) throw Object.assign(new Error('Missing tweet_link'), { status: 400 });
    const data = await callSorsa('/tweet-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tweet_link: tweetLink })
    });
    return res.json(data);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'Unable to verify' });
  }
});

app.post('/sorsa/check-follow', async (req, res) => {
  try {
    await authenticate(req);
    const username1 = cleanHandle(req.body?.username_1);
    const username2 = cleanHandle(req.body?.username_2);
    if (!username1 || !username2) throw Object.assign(new Error('Missing username'), { status: 400 });
    const data = await callSorsa('/check-follow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username_1: username1, username_2: username2 })
    });
    return res.json(data);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'Unable to verify' });
  }
});

app.post('/payouts/run', async (req, res) => {
  try {
    const user = await authenticate(req);
    await assertBrandOperator(user.id, 'Only brand operators can run payout automation');

    const result = await runPayoutAutomation();
    return res.json(result);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'Payout automation failed' });
  }
});

app.post('/campaigns/launch', async (req, res) => {
  try {
    const user = await authenticate(req);
    const launch = normalizeLaunchBody(req.body);
    await assertCampaignSchemaReady();
    const brandSnapshot = await getBrandProfileSnapshot(launch.campaign.brand_profile_id, user.id);
    await assertDraftCampaignOwner(launch.draftCampaignId, user.id, launch.campaign.brand_profile_id);

    const expectedMetadataHash = buildMetadataHash(launch.campaign);
    if (expectedMetadataHash.toLowerCase() !== launch.authorization.metadataHash.toLowerCase()) {
      throw Object.assign(new Error('metadataHash does not match campaign payload'), { status: 400 });
    }
    const expectedCampaignId = buildCampaignId(launch.campaign, launch.brandWallet, launch.authorization.nonce);
    if (expectedCampaignId.toLowerCase() !== launch.authorization.campaignId.toLowerCase()) {
      throw Object.assign(new Error('campaignId does not match campaign payload'), { status: 400 });
    }

    const chainId = await publicClient.getChainId();
    if (expectedChainId && BigInt(chainId) !== expectedChainId) {
      throw Object.assign(new Error(`Configured RPC is on chain ${chainId}, expected ${expectedChainId}`), { status: 500 });
    }

    const platform = await publicClient.readContract({
      address: escrowAddress,
      abi: campaignEscrowAbi,
      functionName: 'platform'
    });
    if (getAddress(platform) !== platformAccount.address) {
      throw Object.assign(new Error('PLATFORM_PRIVATE_KEY does not match escrow platform address'), { status: 500 });
    }

    const args = [
      launch.authorization.campaignId,
      launch.brandWallet,
      launch.authorization.budget,
      launch.authorization.startsAt,
      launch.authorization.endsAt,
      launch.authorization.metadataHash,
      launch.authorization.deadline,
      launch.authorization.v,
      launch.authorization.r,
      launch.authorization.s
    ];

    const { request } = await publicClient.simulateContract({
      account: platformAccount,
      address: escrowAddress,
      abi: campaignEscrowAbi,
      functionName: 'createCampaignWithSignature',
      args
    });
    const txHash = await walletClient.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    if (receipt.status !== 'success') {
      throw Object.assign(new Error('Escrow transaction reverted'), { status: 502 });
    }

    const events = parseEventLogs({
      abi: campaignEscrowAbi,
      eventName: 'CampaignCreated',
      logs: receipt.logs
    });
    const created = events.find((event) => eventMatches(event.args, launch));
    if (!created) {
      throw Object.assign(new Error('CampaignCreated event not found or did not match request'), { status: 502 });
    }

    const event = created.args;
    const insertPayload = {
      ...launch.campaign,
      owner_id: user.id,
      status: 'live',
      budget: Number(formatUnits(event.budget, 6)),
      platform_fee: Number(formatUnits(event.platformFee, 6)),
      net_budget: Number(formatUnits(event.escrowedBudget, 6)),
      escrowed_budget: Number(formatUnits(event.escrowedBudget, 6)),
      escrow_campaign_id: event.campaignId,
      escrow_contract_address: escrowAddress,
      escrow_tx_hash: txHash,
      metadata_hash: event.metadataHash,
      brand_wallet: launch.brandWallet,
      start_date: new Date(Number(event.startsAt) * 1000).toISOString(),
      end_date: new Date(Number(event.endsAt) * 1000).toISOString(),
      release_at: new Date(Number(event.releaseAt) * 1000).toISOString()
    };
    Object.assign(insertPayload, brandSnapshot);
    delete insertPayload.brand_id;

    const campaignMutation = launch.draftCampaignId
      ? supabase
          .from('campaigns')
          .update(insertPayload)
          .eq('id', launch.draftCampaignId)
          .eq('owner_id', user.id)
          .eq('status', 'draft')
          .select()
          .single()
      : supabase
          .from('campaigns')
          .insert([insertPayload])
          .select()
          .single();

    const { data: campaignRow, error: insertError } = await campaignMutation;
    if (insertError) throw Object.assign(new Error(insertError.message), { status: 500 });

    notifyTelegramCreators('new_campaign', campaignRow, buildCampaignNotification(campaignRow))
      .then((result) => console.log('Telegram new campaign notifications:', result))
      .catch((error) => console.warn('Telegram new campaign notifications failed:', error.message || error));

    return res.status(201).json({
      campaignId: campaignRow.id,
      escrowCampaignId: event.campaignId,
      escrowTxHash: txHash,
      escrowContractAddress: escrowAddress,
      metadataHash: event.metadataHash,
      releaseAt: insertPayload.release_at,
      status: 'live'
    });
  } catch (error) {
    const status = error.status || 500;
    console.error('campaign launch failed:', error);
    return res.status(status).json({ error: error.message || 'Campaign launch failed' });
  }
});

app.post('/submissions/:submissionId/status', async (req, res) => {
  try {
    const user = await authenticate(req);
    const submissionId = req.params.submissionId;
    const status = String(req.body?.status || '').trim();
    const feedback = typeof req.body?.feedback === 'string' ? req.body.feedback : null;
    if (!submissionId) throw Object.assign(new Error('Missing submissionId'), { status: 400 });
    if (!['approved', 'revision', 'rejected'].includes(status)) {
      throw Object.assign(new Error('Invalid submission status'), { status: 400 });
    }

    const { data: existingSubmission, error: existingError } = await supabase
      .from('campaign_submissions')
      .select('id, campaign_id, campaign:campaigns (id, owner_id)')
      .eq('id', submissionId)
      .single();
    if (existingError) throw existingError;

    const role = await getUserRole(user.id);
    if (role !== 'admin' && existingSubmission.campaign?.owner_id !== user.id) {
      throw Object.assign(new Error('Campaign does not belong to this user'), { status: 403 });
    }

    const { data: submission, error } = await supabase
      .from('campaign_submissions')
      .update({ status, feedback })
      .eq('id', submissionId)
      .select(`
        *,
        campaign:campaigns (*),
        creator_profile:creator_profiles!creator_id (*)
      `)
      .single();
    if (error) throw error;

    if (submission.participation_id) {
      const participantPayload = {
        status,
        ...(status === 'approved' ? { approved_at: new Date().toISOString() } : {})
      };
      const { error: participantError } = await supabase
        .from('campaign_participants')
        .update(participantPayload)
        .eq('id', submission.participation_id);
      if (participantError) throw participantError;
    }

    let activityPoints = { awarded: false };
    let referral = { qualified: false };
    if (status === 'approved' && submission.creator_id) {
      activityPoints = await awardSubmissionActivityPoints(submission);
      referral = await qualifyReferralForCreator(submission.creator_id, submission.campaign_id);
    }

    let telegram = { sent: 0, skipped: 1 };
    if (status === 'approved' || status === 'rejected') {
      telegram = await notifySubmissionDecision(submission);
    }

    return res.json({ submission, telegram, activityPoints, referral });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'Submission status update failed' });
  }
});

app.post('/notifications/telegram/payment', async (req, res) => {
  try {
    const user = await authenticate(req);
    const role = await assertBrandOperator(user.id, 'Only brand operators can send payment notifications');
    const creatorId = req.body?.creatorId;
    const campaignId = req.body?.campaignId;
    const amount = req.body?.amount;
    if (!creatorId) throw Object.assign(new Error('Missing creatorId'), { status: 400 });
    if (!campaignId) throw Object.assign(new Error('Missing campaignId'), { status: 400 });

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, title, owner_id')
      .eq('id', campaignId)
      .single();
    if (campaignError) throw campaignError;
    if (role !== 'admin' && campaign.owner_id !== user.id) {
      throw Object.assign(new Error('Campaign does not belong to this user'), { status: 403 });
    }

    const { data: participation, error: participationError } = await supabase
      .from('campaign_participants')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('creator_id', creatorId)
      .maybeSingle();
    if (participationError) throw participationError;
    if (!participation) {
      throw Object.assign(new Error('Creator did not participate in this campaign'), { status: 403 });
    }

    const { data: creator, error } = await supabase
      .from('creator_profiles')
      .select('id, telegram_chat_id, notify_payments')
      .eq('id', creatorId)
      .single();
    if (error) throw error;
    if (!creator.telegram_chat_id || !creator.notify_payments) {
      return res.json({ sent: 0, skipped: 1 });
    }

    const amountLine = amount ? `\nAmount: ${escapeTelegramHtml(amount)} USDC` : '';
    await sendTelegramMessage(
      creator.telegram_chat_id,
      `<b>Payment update</b>\n${escapeTelegramHtml(campaign.title || 'SorsaMarket campaign')}${amountLine}\nOpen SorsaMarket to review your wallet history.`
    );
    return res.json({ sent: 1, skipped: 0 });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'Telegram payment notification failed' });
  }
});

const port = Number(process.env.PORT || 8787);
app.listen(port, () => {
  console.log(`Escrow launch server listening on http://localhost:${port}`);
  scheduleWeeklySorsaProfileSync();
  schedulePayoutAutomation();
});
