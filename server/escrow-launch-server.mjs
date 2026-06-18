import 'dotenv/config';
import express from 'express';
import { createHash, randomBytes } from 'node:crypto';
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
  SORSA_API_BASE: process.env.SORSA_API_BASE || process.env.VITE_SORSA_API_BASE || 'https://api.sorsa.io/v3',
  SORSA_API_KEY: process.env.SORSA_API_KEY || process.env.VITE_SORSA_API_KEY,
  SORSA_WEEKLY_SYNC_ENABLED: process.env.SORSA_WEEKLY_SYNC_ENABLED !== 'false',
  CREATOR_IDENTITY_SYNC_ENABLED: process.env.CREATOR_IDENTITY_SYNC_ENABLED !== 'false',
  CREATOR_IDENTITY_SYNC_INTERVAL_DAYS: process.env.CREATOR_IDENTITY_SYNC_INTERVAL_DAYS || '4',
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  TELEGRAM_BOT_USERNAME: process.env.TELEGRAM_BOT_USERNAME,
  TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET,
  TELEGRAM_RAFFLE_GROUP_CHAT_ID: process.env.TELEGRAM_RAFFLE_GROUP_CHAT_ID,
  TELEGRAM_RAFFLE_GROUP_THREAD_ID: process.env.TELEGRAM_RAFFLE_GROUP_THREAD_ID,
  TELEGRAM_CONNECT_CODE_TTL_MINUTES: process.env.TELEGRAM_CONNECT_CODE_TTL_MINUTES || '30',
  FRONTEND_URL: process.env.FRONTEND_URL || process.env.VITE_FRONTEND_URL,
  PAYOUT_AUTOMATION_ENABLED: process.env.PAYOUT_AUTOMATION_ENABLED !== 'false',
  PAYOUT_POLL_INTERVAL_SECONDS: process.env.PAYOUT_POLL_INTERVAL_SECONDS || '300',
  PAYOUT_MAX_PAYMENTS_PER_TX: process.env.PAYOUT_MAX_PAYMENTS_PER_TX || '50',
  SUBMISSION_WINDOW_NOTIFICATIONS_ENABLED: process.env.SUBMISSION_WINDOW_NOTIFICATIONS_ENABLED !== 'false',
  SUBMISSION_WINDOW_POLL_INTERVAL_SECONDS: process.env.SUBMISSION_WINDOW_POLL_INTERVAL_SECONDS || '300'
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
    res.setHeader('Access-Control-Allow-Credentials', 'true');
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
const appSessionCookieName = 'sorsa_session';
const appSessionTtlSeconds = 5 * 24 * 60 * 60;

function parseCookies(req) {
  return String(req.headers.cookie || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separator = part.indexOf('=');
      if (separator === -1) return cookies;
      const name = decodeURIComponent(part.slice(0, separator).trim());
      const value = decodeURIComponent(part.slice(separator + 1).trim());
      cookies[name] = value;
      return cookies;
    }, {});
}

function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function serializeAppSessionCookie(value, maxAgeSeconds) {
  const encodedName = encodeURIComponent(appSessionCookieName);
  const encodedValue = encodeURIComponent(value);
  return [
    `${encodedName}=${encodedValue}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`
  ].join('; ');
}

function setAppSessionCookie(res, token) {
  res.setHeader('Set-Cookie', serializeAppSessionCookie(token, appSessionTtlSeconds));
}

function clearAppSessionCookie(res) {
  res.setHeader('Set-Cookie', serializeAppSessionCookie('', 0));
}

function requireBearer(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) throw Object.assign(new Error('Missing bearer token'), { status: 401 });
  return token;
}

async function authenticate(req) {
  const cookies = parseCookies(req);
  const sessionToken = cookies[appSessionCookieName];
  if (!sessionToken) throw Object.assign(new Error('Missing app session'), { status: 401 });

  const tokenHash = hashSessionToken(sessionToken);
  const { data: sessionRow, error } = await supabase
    .from('app_sessions')
    .select('id, user_id, expires_at, revoked_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (error || !sessionRow || sessionRow.revoked_at || new Date(sessionRow.expires_at).getTime() <= Date.now()) {
    throw Object.assign(new Error('Invalid app session'), { status: 401 });
  }

  await supabase
    .from('app_sessions')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', sessionRow.id);
  return { id: sessionRow.user_id };
}

async function authenticateToken(token) {
  if (!token) throw Object.assign(new Error('Missing bearer token'), { status: 401 });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw Object.assign(new Error('Invalid session'), { status: 401 });
  return data.user;
}

async function createAppSession(userId) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + appSessionTtlSeconds * 1000).toISOString();
  const { error } = await supabase
    .from('app_sessions')
    .insert({
      user_id: userId,
      token_hash: hashSessionToken(token),
      expires_at: expiresAt
    });
  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  return { token, expiresAt };
}

async function revokeCurrentAppSession(req) {
  const token = parseCookies(req)[appSessionCookieName];
  if (!token) return false;
  const { error } = await supabase
    .from('app_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('token_hash', hashSessionToken(token))
    .is('revoked_at', null);
  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  return true;
}

const telegramStatusStreams = new Map();

function writeTelegramStatusEvent(res, status) {
  res.write(`data: ${JSON.stringify(status)}\n\n`);
}

function addTelegramStatusClient(userId, res) {
  const clients = telegramStatusStreams.get(userId) || new Set();
  clients.add(res);
  telegramStatusStreams.set(userId, clients);
}

function removeTelegramStatusClient(userId, res) {
  const clients = telegramStatusStreams.get(userId);
  if (!clients) return;
  clients.delete(res);
  if (clients.size === 0) {
    telegramStatusStreams.delete(userId);
  }
}

function pushTelegramStatus(userId, status) {
  const clients = telegramStatusStreams.get(userId);
  if (!clients) return;

  for (const client of [...clients]) {
    try {
      writeTelegramStatusEvent(client, status);
    } catch (error) {
      removeTelegramStatusClient(userId, client);
    }
  }
}

function mapTelegramPreferences(data) {
  return {
    connected: Boolean(data?.telegram_chat_id),
    telegramUsername: data?.telegram_username || null,
    connectedAt: data?.telegram_connected_at || null,
    preferences: {
      newCampaigns: Boolean(data?.notify_new_campaigns),
      campaignUpdates: Boolean(data?.notify_campaign_updates),
      payments: Boolean(data?.notify_payments)
    }
  };
}

async function getTelegramStatus(userId) {
  const { data, error } = await supabase
    .from('creator_profiles')
    .select('telegram_chat_id, telegram_username, telegram_connected_at, notify_new_campaigns, notify_campaign_updates, notify_payments')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return mapTelegramPreferences(data);
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

async function assertAdmin(userId) {
  const role = await getUserRole(userId);
  if (role !== 'admin') {
    throw Object.assign(new Error('Only admins can perform this action'), { status: 403 });
  }
}

async function getOrCreateNftBrandProfile(userId) {
  const profilePayload = {
    owner_id: userId,
    company_name: 'Sorsa NFT Campaigns',
    website: null,
    twitter_handle: null,
    telegram_handle: null,
    description: 'System profile for admin-created NFT campaigns.',
    logo_url: null
  };

  const { data: existing, error: existingError } = await supabase
    .from('brand_profiles')
    .select('id, company_name, logo_url, twitter_handle')
    .eq('owner_id', userId)
    .eq('company_name', profilePayload.company_name)
    .limit(1)
    .maybeSingle();
  if (existingError) throw Object.assign(new Error(existingError.message), { status: 500 });
  if (existing) return existing;

  const { data, error } = await supabase
    .from('brand_profiles')
    .insert([profilePayload])
    .select('id, company_name, logo_url, twitter_handle')
    .single();
  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  return data;
}

function isNftRaffleType(campaignType) {
  return campaignType === 'raffle' || campaignType === 'fcfs';
}

function isNftContentType(campaignType) {
  return campaignType === 'content' || campaignType === 'all';
}

function normalizeNftCampaignBody(body, userId, brandProfile) {
  const campaign = body?.campaign;
  if (!campaign || typeof campaign !== 'object') {
    throw Object.assign(new Error('Missing campaign payload'), { status: 400 });
  }

  const campaignType = String(campaign.campaign_type || '').toLowerCase();
  if (!['raffle', 'content'].includes(campaignType)) {
    throw Object.assign(new Error('NFT campaign type must be Raffle or Content'), { status: 400 });
  }

  const title = String(campaign.title || '').trim();
  const goal = String(campaign.goal || '').trim();
  const overview = String(campaign.overview || '').trim();
  const budget = Number(campaign.budget || 0);
  const minSorsaScore = Math.max(0, Math.min(1000, Number(campaign.min_sorsa_score || 0)));
  const imageUrl = typeof campaign.image_url === 'string' && campaign.image_url.trim() ? campaign.image_url.trim() : null;
  const backgroundImageUrl = typeof campaign.background_image_url === 'string' && campaign.background_image_url.trim()
    ? campaign.background_image_url.trim()
    : null;
  const maxCreators = null;
  const maxContentSubmissions = isNftContentType(campaignType)
    ? Math.max(1, Math.min(5, Number(campaign.max_content_submissions || 5)))
    : null;
  const followAccounts = Array.isArray(campaign.follow_accounts)
    ? campaign.follow_accounts
        .map((account) => cleanHandle(account))
        .filter(Boolean)
        .slice(0, 3)
    : [];
  const retweetLinks = Array.isArray(campaign.retweet_links)
    ? campaign.retweet_links
        .map((link) => String(link || '').trim())
        .filter(Boolean)
        .slice(0, 2)
    : [];

  if (!title) throw Object.assign(new Error('Campaign title is required'), { status: 400 });
  if (!goal) throw Object.assign(new Error('Campaign goal is required'), { status: 400 });
  if (!overview) throw Object.assign(new Error('Campaign brief is required'), { status: 400 });
  if (budget < 0) throw Object.assign(new Error('Total WL must be a positive number'), { status: 400 });
  const nftMetadata = {
    nft: true,
    image_url: imageUrl,
    background_image_url: backgroundImageUrl,
    max_creators: maxCreators,
    max_content_submissions: maxContentSubmissions,
    follow_accounts: Array.from(new Set(followAccounts)),
    retweet_links: Array.from(new Set(retweetLinks))
  };

  return {
    owner_id: userId,
    brand_profile_id: brandProfile.id,
    title,
    goal,
    campaign_type: campaignType,
    min_sorsa_score: minSorsaScore,
    language: JSON.stringify(nftMetadata),
    categories: Array.isArray(campaign.categories) ? campaign.categories : ['NFT'],
    overview,
    budget,
    platform_fee: 0,
    net_budget: budget,
    status: 'draft',
    start_date: campaign.start_date || null,
    end_date: campaign.end_date || null,
    brand_name: brandProfile.company_name || 'Sorsa NFT Campaigns',
    brand_logo_url: brandProfile.logo_url || null,
    brand_twitter_handle: brandProfile.twitter_handle || null
  };
}

function withNftCampaignMetadata(campaign) {
  let metadata = {};
  try {
    metadata = campaign.language ? JSON.parse(campaign.language) : {};
  } catch {
    metadata = {};
  }

  return {
    ...campaign,
    image_url: metadata.image_url || null,
    background_image_url: metadata.background_image_url || null,
    max_creators: metadata.max_creators ?? null,
    max_content_submissions: metadata.max_content_submissions ?? null,
    follow_accounts: Array.isArray(metadata.follow_accounts) ? metadata.follow_accounts : [],
    retweet_links: Array.isArray(metadata.retweet_links) ? metadata.retweet_links : [],
    raffle_results: Array.isArray(metadata.raffle_results) ? metadata.raffle_results : [],
    raffle_finalized_at: metadata.raffle_finalized_at || null
  };
}

async function getNftCampaignStatsMap(campaignIds) {
  const ids = Array.from(new Set((campaignIds || []).filter(Boolean)));
  const statsMap = new Map();

  for (const id of ids) {
    statsMap.set(id, {
      joined_count: 0,
      approved_count: 0,
      rejected_count: 0
    });
  }
  if (!ids.length) return statsMap;

  const { data: participants, error } = await supabase
    .from('campaign_participants')
    .select('campaign_id, status')
    .in('campaign_id', ids);
  if (error) throw Object.assign(new Error(error.message), { status: 500 });

  for (const participant of participants || []) {
    const stats = statsMap.get(participant.campaign_id) || {
      joined_count: 0,
      approved_count: 0,
      rejected_count: 0
    };
    stats.joined_count += 1;
    if (participant.status === 'approved') stats.approved_count += 1;
    if (participant.status === 'rejected') stats.rejected_count += 1;
    statsMap.set(participant.campaign_id, stats);
  }

  return statsMap;
}

function parseCampaignMetadata(campaign) {
  try {
    return campaign?.language ? JSON.parse(campaign.language) : {};
  } catch {
    return {};
  }
}

function randomIndex(max) {
  return randomBytes(4).readUInt32BE(0) % max;
}

function pickRandomItems(items, limit) {
  const pool = [...items];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1);
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }
  return pool.slice(0, limit);
}

function getCampaignEndTime(endDate) {
  if (!endDate) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(endDate))) {
    return new Date(`${endDate}T23:59:59`).getTime();
  }
  const time = new Date(endDate).getTime();
  return Number.isNaN(time) ? null : time;
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

function isEscrowConfirmedCampaign(campaign) {
  return Boolean(
    campaign?.escrow_campaign_id &&
    campaign?.escrow_contract_address &&
    campaign?.escrow_tx_hash &&
    campaign?.metadata_hash &&
    campaign?.brand_wallet
  );
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

async function awardActivityPoints(creatorId, points, event) {
  const { data, error } = await supabase.rpc('award_creator_activity_points', {
    p_creator_id: creatorId,
    p_points: points,
    p_event: event
  });
  if (error) {
    console.warn(`Could not award activity points for ${creatorId}:`, error.message || error);
    return { awarded: false, reason: 'award_failed' };
  }

  return { awarded: Boolean(data), points: Boolean(data) ? points : 0 };
}

async function qualifyReferralForCreator(creatorId) {
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

  const award = await awardActivityPoints(referral.referrer_id, points, `referral_qualified:${referral.id}`);
  return { qualified: true, referralId: referral.id, points: award.awarded ? points : 0, award };
}

async function awardSubmissionActivityPoints(submission) {
  const creatorId = submission?.creator_id;
  const submissionId = submission?.id;
  if (!creatorId || !submissionId) return { awarded: false, reason: 'missing_submission' };

  return awardActivityPoints(creatorId, 10, `submission_approved:${submissionId}`);
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

function getTelegramBotLink(connectCode = '') {
  if (!env.TELEGRAM_BOT_USERNAME) return null;
  const username = env.TELEGRAM_BOT_USERNAME.replace('@', '');
  const startParam = connectCode ? `?start=${encodeURIComponent(connectCode)}` : '';
  return `https://t.me/${username}${startParam}`;
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

async function sendTelegramMessage(chatId, text, options = {}) {
  return telegramRequest('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...options
  });
}

async function appendTelegramPhoto(form, imageSource, filename = 'notification.jpg') {
  const source = typeof imageSource === 'string' ? imageSource : String(imageSource || '');
  if (/^https?:\/\//i.test(source)) {
    form.append('photo', source);
    return;
  }

  const dataUrlMatch = source.match(/^data:([^;,]+);base64,(.+)$/);
  if (dataUrlMatch) {
    const [, mimeType, base64Data] = dataUrlMatch;
    const extension = mimeType.split('/')[1] || 'jpg';
    const buffer = Buffer.from(base64Data, 'base64');
    form.append('photo', new Blob([buffer], { type: mimeType }), filename.replace(/\.[^.]+$/, `.${extension}`));
    return;
  }

  const imageBuffer = await readFile(imageSource);
  form.append('photo', new Blob([imageBuffer], { type: 'image/jpeg' }), filename);
}

async function sendTelegramPhoto(chatId, imageUrl, caption, buttonUrl = null, options = {}) {
  const form = new FormData();
  form.append('chat_id', chatId);
  if (options.message_thread_id) {
    form.append('message_thread_id', String(options.message_thread_id));
  }
  await appendTelegramPhoto(form, imageUrl, 'CampaignNotificationImage.JPG');
  form.append('caption', caption);
  form.append('parse_mode', 'HTML');
  if (buttonUrl) {
    form.append('reply_markup', JSON.stringify({
      inline_keyboard: [[{ text: 'View Campaign', url: buttonUrl }]]
    }));
  }

  return telegramRequest('sendPhoto', form);
}

function getCampaignNotificationImageUrl() {
  return new URL('../public/CampaignNotificationImage.JPG', import.meta.url);
}

function getSubmissionWindowNotificationImageUrl() {
  return new URL('../public/SubmissionWindowExpired.JPG', import.meta.url);
}

function getSubmissionWindowReminderImageUrl() {
  return new URL('../public/SubmissionWindowReminder.JPG', import.meta.url);
}

function getCampaignUrl(campaign) {
  if (!env.FRONTEND_URL || !campaign?.id) return null;
  return `${env.FRONTEND_URL.replace(/\/$/, '')}/creator/campaigns/${encodeURIComponent(campaign.id)}`;
}

function getCreatorCampaignUrl(campaign) {
  if (!env.FRONTEND_URL || !campaign?.id) return null;
  const metadata = parseCampaignMetadata(campaign);
  const isNftCampaign = metadata.is_nft_campaign || campaign.campaign_type === 'raffle' || campaign.campaign_type === 'content';
  const path = isNftCampaign ? 'creator/nft-campaigns' : 'creator/campaigns';
  return `${env.FRONTEND_URL.replace(/\/$/, '')}/${path}/${encodeURIComponent(campaign.id)}`;
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
    ? `\n\n<a href="${escapeTelegramHtml(campaignUrl)}">View Campaign</a>`
    : '\n\nOpen SorsaMarket to view details.';

  return `<b>${escapeTelegramHtml(label).toUpperCase()}</b>\n\nA new creator opportunity is now live on SorsaMarket.\n\nCampaign: <b>${title}</b>\nBrand: ${brand}\nReward Pool: ${budget} USDC${categories}\n\nOpen the campaign page to read the brief, review the requirements, and join if it fits your profile.${action}`;
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

function formatRaffleWinnerMention(winner, index) {
  const telegramUsername = String(winner.telegram_username || '').replace(/^@/, '').trim();
  if (telegramUsername) return `${index + 1}. @${escapeTelegramHtml(telegramUsername)}`;

  const label = winner.x_account
    ? `@${winner.x_account}`
    : winner.name || `Winner ${index + 1}`;
  return `${index + 1}. ${escapeTelegramHtml(label)}`;
}

function buildRaffleWinnersAnnouncement(campaign, winners) {
  const title = escapeTelegramHtml(campaign?.title || 'NFT raffle');
  const winnerLines = (winners || []).map(formatRaffleWinnerMention).join('\n');
  const fallbackWinnerLines = winnerLines || 'No winners selected.';

  return `<b>The draw is done</b>\n\n<b>${title}</b> has been finalized.\n\nToday's raffle winners:\n${fallbackWinnerLines}\n\nBig congratulations to the names selected.`;
}

async function notifyRaffleWinnersGroup(campaign, winners) {
  if (!env.TELEGRAM_RAFFLE_GROUP_CHAT_ID) {
    return { sent: 0, skipped: 1, reason: 'missing_group_chat_id' };
  }

  const caption = buildRaffleWinnersAnnouncement(campaign, winners);
  const imageUrl = campaign?.background_image_url || campaign?.image_url || null;
  const parsedThreadId = env.TELEGRAM_RAFFLE_GROUP_THREAD_ID
    ? Number(env.TELEGRAM_RAFFLE_GROUP_THREAD_ID)
    : null;
  const threadId = Number.isFinite(parsedThreadId) && parsedThreadId > 0 ? parsedThreadId : null;
  const topicOptions = threadId ? { message_thread_id: threadId } : {};
  if (imageUrl) {
    try {
      await sendTelegramPhoto(env.TELEGRAM_RAFFLE_GROUP_CHAT_ID, imageUrl, caption, null, topicOptions);
      return { sent: 1, skipped: 0, usedImage: true, threadId };
    } catch (error) {
      console.warn('Telegram raffle winners image failed, sending text fallback:', error.message || error);
    }
  }

  await sendTelegramMessage(env.TELEGRAM_RAFFLE_GROUP_CHAT_ID, caption, topicOptions);
  return { sent: 1, skipped: 0, threadId };
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

async function shouldNotifySubmissionDecision(submission, previousStatus) {
  if (!['approved', 'rejected'].includes(submission?.status)) return false;
  if (['approved', 'rejected'].includes(previousStatus)) return false;
  if (!submission?.participation_id || !submission?.id) return false;

  const { count, error } = await supabase
    .from('campaign_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('participation_id', submission.participation_id)
    .in('status', ['approved', 'rejected'])
    .neq('id', submission.id);
  if (error) {
    console.warn(`Could not check previous submission decisions for ${submission.id}:`, error.message || error);
    return false;
  }

  return Number(count || 0) === 0;
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

  const startedAt = new Date();
  const previousScore = profile.sorsa_score == null ? null : Math.round(Number(profile.sorsa_score || 0));
  console.log('Sorsa profile sync started:', {
    creatorId: profile.id,
    xHandle,
    previousScore,
    lastProfileSyncAt: profile.last_profile_sync_at || null
  });

  let scoreData;
  let stats;
  let about;
  try {
    [scoreData, stats, about] = await Promise.all([
      callSorsa(`/score?username=${encodeURIComponent(xHandle)}`),
      callSorsa(`/info?username=${encodeURIComponent(xHandle)}`),
      callSorsa(`/about?username=${encodeURIComponent(xHandle)}`).catch(() => ({ country: null }))
    ]);
  } catch (error) {
    console.warn('Sorsa profile sync failed during API fetch:', {
      creatorId: profile.id,
      xHandle,
      previousScore,
      error: error.message || error
    });
    throw error;
  }

  const score = Math.round(Number(scoreData?.score || 0));
  const finalLocation = stats?.location || about?.country || null;
  const syncedAt = new Date().toISOString();

  const { error } = await supabase
    .from('creator_profiles')
    .update({
      sorsa_score: score,
      follower_count: stats?.followers_count ?? null,
      avatar_url: normalizeAvatarUrl(stats?.profile_image_url),
      bio: stats?.description ?? null,
      country: finalLocation,
      full_name: stats?.display_name ?? null,
      last_profile_sync_at: syncedAt
    })
    .eq('id', profile.id);
  if (error) {
    console.warn('Sorsa profile sync failed during profile update:', {
      creatorId: profile.id,
      xHandle,
      previousScore,
      newScore: score,
      error: error.message || error
    });
    throw error;
  }

  const durationMs = Date.now() - startedAt.getTime();
  const scoreDelta = previousScore == null ? null : score - previousScore;
  if (scoreDelta != null && Math.abs(scoreDelta) >= 50) {
    console.warn('Sorsa profile score changed sharply:', {
      creatorId: profile.id,
      xHandle,
      previousScore,
      newScore: score,
      delta: scoreDelta,
      syncedAt
    });
  }

  console.log('Sorsa profile sync completed:', {
    creatorId: profile.id,
    xHandle,
    previousScore,
    newScore: score,
    delta: scoreDelta,
    followersCount: stats?.followers_count ?? null,
    syncedAt,
    durationMs
  });

  return { synced: true, previousScore, newScore: score };
}

function normalizeAvatarUrl(url) {
  if (!url || typeof url !== 'string') return null;
  return url
    .replace('_normal.', '_400x400.')
    .replace('_bigger.', '_400x400.')
    .replace('_mini.', '_400x400.');
}

function getCreatorIdentityFromAuthUser(authUser) {
  const metadata = authUser?.user_metadata || {};
  return {
    x_handle: metadata.user_name || metadata.preferred_username || authUser?.email?.split('@')[0] || null,
    full_name: metadata.full_name || metadata.name || authUser?.email?.split('@')[0] || null,
    avatar_url: normalizeAvatarUrl(metadata.avatar_url || metadata.picture),
    x_provider_id: metadata.provider_id || metadata.sub || null
  };
}

async function syncCreatorIdentityFromAuth(profile) {
  const { data, error } = await supabase.auth.admin.getUserById(profile.id);
  if (error) throw error;

  const identity = getCreatorIdentityFromAuthUser(data?.user);
  if (!identity.x_handle) return { synced: false, reason: 'missing_x_handle' };

  const updates = {};
  for (const key of ['x_handle', 'full_name', 'avatar_url', 'x_provider_id']) {
    const current = profile[key] || null;
    const next = identity[key] || null;
    if (current !== next) updates[key] = next;
  }

  if (Object.keys(updates).length === 0) {
    return { synced: false, reason: 'unchanged' };
  }

  const { error: updateError } = await supabase
    .from('creator_profiles')
    .update(updates)
    .eq('id', profile.id);
  if (updateError) throw updateError;

  return { synced: true, updates: Object.keys(updates) };
}

function calculatePerformanceRewardAmount({ baseReward, approvedPosts }) {
  const base = Number(baseReward || 0);
  const posts = Math.max(0, Math.min(10, Number(approvedPosts || 0)));
  const boost = base * 0.62 * (posts / 10);
  return Number(Math.min(boost, 125).toFixed(2));
}

let weeklySorsaSyncRunning = false;
let creatorIdentitySyncRunning = false;

async function runCreatorIdentitySync() {
  if (creatorIdentitySyncRunning) return { skipped: true, reason: 'already_running' };
  creatorIdentitySyncRunning = true;

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
        .select('id, x_handle, full_name, avatar_url, x_provider_id')
        .order('id', { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      if (!profiles?.length) break;

      for (const profile of profiles) {
        checked += 1;
        try {
          const result = await syncCreatorIdentityFromAuth(profile);
          if (result.synced) synced += 1;
          else skipped += 1;
        } catch (error) {
          failed += 1;
          console.warn(`Creator identity sync failed for ${profile.id}:`, error.message || error);
        }
      }

      if (profiles.length < pageSize) break;
      from += pageSize;
    }

    return { checked, synced, skipped, failed };
  } finally {
    creatorIdentitySyncRunning = false;
  }
}

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
        .select('id, x_handle, sorsa_score, last_profile_sync_at')
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

function scheduleCreatorIdentitySync() {
  if (!env.CREATOR_IDENTITY_SYNC_ENABLED) {
    console.log('Creator identity sync is disabled.');
    return;
  }

  const intervalDays = Math.max(1, Number(env.CREATOR_IDENTITY_SYNC_INTERVAL_DAYS || '4'));
  const intervalMs = intervalDays * 24 * 60 * 60 * 1000;
  const run = async () => {
    try {
      const result = await runCreatorIdentitySync();
      console.log('Creator identity sync finished:', result);
    } catch (error) {
      console.error('Creator identity sync failed:', error);
    }
  };

  setTimeout(run, 30_000);
  setInterval(run, intervalMs);
  console.log(`Creator identity sync scheduled every ${intervalDays} day(s).`);
}

let payoutAutomationRunning = false;

async function getEscrowCampaignState(campaign) {
  try {
    return await publicClient.readContract({
      address: campaignEscrowAddress(campaign),
      abi: campaignEscrowAbi,
      functionName: 'campaigns',
      args: [campaign.escrow_campaign_id]
    });
  } catch (error) {
    if (/out of bounds|Position `\d+` is out of bounds/i.test(error?.message || '')) {
      throw Object.assign(new Error('Escrow contract ABI does not match the deployed campaign contract'), {
        status: 409,
        code: 'ESCROW_ABI_MISMATCH',
        cause: error
      });
    }
    throw error;
  }
}

function getSubmissionWindowEndTime(joinedAt) {
  const joinedTime = joinedAt ? new Date(joinedAt).getTime() : null;
  return joinedTime && !Number.isNaN(joinedTime) ? joinedTime + 24 * 60 * 60 * 1000 : null;
}

function buildMissedSubmissionNotification(campaign, windowEndsAt) {
  const title = escapeTelegramHtml(campaign?.title || 'SorsaMarket campaign');
  const deadline = windowEndsAt
    ? new Date(windowEndsAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })
    : 'your 24 hour submission window';
  const campaignUrl = getCreatorCampaignUrl(campaign);
  const action = campaignUrl
    ? `\n\n<a href="${escapeTelegramHtml(campaignUrl)}">View Campaign</a>`
    : '\n\nOpen SorsaMarket to review campaign details.';

  return `<b>Submission window closed</b>\n\nThe 24 hour creator submission window for <b>${title}</b> has ended.\n\nNo eligible content submission was recorded from your account before the window closed.\n\nWindow ended: ${escapeTelegramHtml(deadline)}${action}`;
}

function buildJoinSubmissionReminder(campaign, windowEndsAt) {
  const title = escapeTelegramHtml(campaign?.title || 'SorsaMarket campaign');
  const deadline = windowEndsAt
    ? new Date(windowEndsAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })
    : '24 hours from now';
  const campaignUrl = getCreatorCampaignUrl(campaign);
  const action = campaignUrl
    ? `\n\n<a href="${escapeTelegramHtml(campaignUrl)}">View Campaign</a>`
    : '\n\nOpen SorsaMarket to view the campaign.';

  return `<b>Campaign joined</b>\n\nCongrats, you've successfully joined <b>${title}</b>.\n\nYou now have 24 hours to submit your content for this campaign.\n\nSubmission window ends: ${escapeTelegramHtml(deadline)}${action}`;
}

async function notifyCampaignJoinReminder(creator, campaign, participation) {
  if (!creator?.telegram_chat_id || !creator.notify_campaign_updates) {
    return { sent: 0, skipped: 1 };
  }

  const windowEndsAt = getSubmissionWindowEndTime(participation?.joined_at);
  const caption = buildJoinSubmissionReminder(campaign, windowEndsAt);
  const campaignUrl = getCreatorCampaignUrl(campaign);
  try {
    await sendTelegramPhoto(creator.telegram_chat_id, getSubmissionWindowReminderImageUrl(), caption, campaignUrl);
  } catch (error) {
    console.warn('Telegram join reminder photo failed, sending text fallback:', error.message || error);
    await sendTelegramMessage(creator.telegram_chat_id, caption);
  }
  return { sent: 1, skipped: 0 };
}

async function sendMissedSubmissionNotification(chatId, campaign, windowEndsAt) {
  const caption = buildMissedSubmissionNotification(campaign, windowEndsAt);
  const campaignUrl = getCreatorCampaignUrl(campaign);
  try {
    return await sendTelegramPhoto(chatId, getSubmissionWindowNotificationImageUrl(), caption, campaignUrl);
  } catch (error) {
    console.warn('Telegram submission window photo failed, sending text fallback:', error.message || error);
    return sendTelegramMessage(chatId, caption);
  }
}

async function markSubmissionWindowNotified(participantId) {
  const { error } = await supabase
    .from('campaign_participants')
    .update({ submission_window_notified_at: new Date().toISOString() })
    .eq('id', participantId);
  if (error) throw error;
}

async function hasParticipantSubmission(participant) {
  const { count, error } = await supabase
    .from('campaign_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('participation_id', participant.id);
  if (error) throw error;
  return Number(count || 0) > 0;
}

let submissionWindowNotificationsRunning = false;

async function runSubmissionWindowNotifications() {
  if (submissionWindowNotificationsRunning) {
    return { checked: 0, sent: 0, skipped: 0, failed: 0, marked: 0, alreadyRunning: true };
  }

  submissionWindowNotificationsRunning = true;
  const summary = { checked: 0, sent: 0, skipped: 0, failed: 0, marked: 0 };
  try {
    const { data: participants, error } = await supabase
      .from('campaign_participants')
      .select(`
        id,
        creator_id,
        campaign_id,
        status,
        joined_at,
        submission_window_notified_at,
        creator_profile:creator_profiles!creator_id (
          id,
          telegram_chat_id,
          notify_campaign_updates
        ),
        campaign:campaigns!campaign_id (
          id,
          title,
          end_date,
          campaign_type,
          language
        )
      `)
      .eq('status', 'active')
      .is('submission_window_notified_at', null)
      .limit(100);
    if (error) throw error;

    const now = Date.now();
    for (const participant of participants || []) {
      summary.checked += 1;
      const campaign = participant.campaign;
      const windowEndsAt = getSubmissionWindowEndTime(participant.joined_at);
      if (!campaign || !windowEndsAt || now < windowEndsAt) {
        summary.skipped += 1;
        continue;
      }

      if (campaign.campaign_type === 'raffle') {
        await markSubmissionWindowNotified(participant.id);
        summary.skipped += 1;
        summary.marked += 1;
        continue;
      }

      if (await hasParticipantSubmission(participant)) {
        await markSubmissionWindowNotified(participant.id);
        summary.skipped += 1;
        summary.marked += 1;
        continue;
      }

      const creator = participant.creator_profile;
      if (!creator?.telegram_chat_id || !creator.notify_campaign_updates) {
        await markSubmissionWindowNotified(participant.id);
        summary.skipped += 1;
        summary.marked += 1;
        continue;
      }

      try {
        await sendMissedSubmissionNotification(creator.telegram_chat_id, campaign, windowEndsAt);
        await markSubmissionWindowNotified(participant.id);
        summary.sent += 1;
        summary.marked += 1;
      } catch (error) {
        summary.failed += 1;
        console.warn(`Submission window notification failed for participant ${participant.id}:`, error.message || error);
      }
    }

    return summary;
  } finally {
    submissionWindowNotificationsRunning = false;
  }
}

function escrowCampaignField(state, index, name) {
  return state?.[name] ?? state?.[index];
}

function campaignEscrowAddress(campaign) {
  const address = campaign?.escrow_contract_address || escrowAddress;
  if (!isAddress(address)) throw Object.assign(new Error('Campaign escrow address is invalid'), { status: 500 });
  return getAddress(address);
}

async function writeCampaignEscrow(campaign, functionName, args) {
  const address = campaignEscrowAddress(campaign);
  const { request } = await publicClient.simulateContract({
    account: platformAccount,
    address,
    abi: campaignEscrowAbi,
    functionName,
    args
  });
  const txHash = await walletClient.writeContract(request);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== 'success') throw new Error(`Escrow ${functionName} transaction reverted`);
  return { txHash, receipt };
}

async function getApprovedPayoutCandidates(campaign) {
  const { data: participants, error } = await supabase
    .from('campaign_participants')
    .select(`
      id,
      creator_id,
      base_reward,
      calculated_reward,
      creator_profile:creator_profiles!creator_id (
        id,
        wallet_address,
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

    const baseReward = Number(participant.base_reward || 0);
    if (baseReward <= 0) {
      console.warn(`Skipping payout for ${participant.creator_id}: missing reserved base reward`);
      continue;
    }

    const { count: approvedPosts, error: submissionsError } = await supabase
      .from('campaign_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaign.id)
      .eq('creator_id', participant.creator_id)
      .eq('status', 'approved');
    if (submissionsError) throw submissionsError;

    const performanceReward = calculatePerformanceRewardAmount({
      baseReward,
      approvedPosts
    });

    candidates.push({
      participant,
      creator,
      wallet: getAddress(creator.wallet_address),
      performanceReward
    });
  }

  return candidates;
}

function fitRewardsToPool(candidates, poolAmount) {
  const total = candidates.reduce((sum, item) => sum + item.performanceReward, 0);
  const scale = total > poolAmount && total > 0 ? poolAmount / total : 1;

  return candidates.map((item) => ({
    ...item,
    allocatedReward: Number((item.performanceReward * scale).toFixed(2))
  }));
}

async function prepareCampaignPayouts(campaign) {
  const escrowState = await getEscrowCampaignState(campaign);
  const cancelled = Boolean(escrowCampaignField(escrowState, 21, 'cancelled'));
  const allocationsSet = Boolean(escrowCampaignField(escrowState, 18, 'allocationsSet'));
  if (cancelled || allocationsSet) {
    return { prepared: false, reason: cancelled ? 'cancelled' : 'already_allocated' };
  }

  const now = Date.now();
  const endAt = campaign.end_date ? new Date(campaign.end_date).getTime() : Number(escrowCampaignField(escrowState, 15, 'endsAt')) * 1000;
  if (now < endAt) return { prepared: false, reason: 'campaign_active' };

  const candidates = await getApprovedPayoutCandidates(campaign);
  const poolAmount = Number(formatUnits(escrowCampaignField(escrowState, 5, 'performanceRewardPool'), 6));
  const payouts = fitRewardsToPool(candidates, poolAmount);
  if (payouts.length === 0) return { prepared: false, reason: 'no_approved_wallets' };

  const recipients = payouts.map((item) => item.wallet);
  if (new Set(recipients.map((recipient) => recipient.toLowerCase())).size !== recipients.length) {
    throw new Error('Approved payout recipients must use unique wallet addresses');
  }
  const baseRewards = payouts.map((item) => {
    const baseReward = Number(item.participant.base_reward || 0);
    if (baseReward <= 0) {
      throw new Error(`Approved participant ${item.participant.creator_id} has no valid base reward`);
    }
    return parseUnits(baseReward.toFixed(2), 6);
  });
  const performanceRewards = payouts.map((item) => parseUnits(item.allocatedReward.toFixed(2), 6));

  const { txHash, receipt } = await writeCampaignEscrow(
    campaign,
    'finalizeAllocations',
    [campaign.escrow_campaign_id, recipients, baseRewards, performanceRewards]
  );

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

async function prepareCampaignBasePayouts(campaign) {
  let escrowState = await getEscrowCampaignState(campaign);
  if (escrowCampaignField(escrowState, 19, 'basePayoutsPrepared')) {
    return { prepared: false, reason: 'already_prepared' };
  }

  const maxParticipants = BigInt(Math.max(1, Number(env.PAYOUT_MAX_PAYMENTS_PER_TX || '50')));
  const txHashes = [];
  while (!escrowCampaignField(escrowState, 19, 'basePayoutsPrepared')) {
    const { txHash } = await writeCampaignEscrow(
      campaign,
      'prepareBasePayouts',
      [campaign.escrow_campaign_id, maxParticipants]
    );
    txHashes.push(txHash);
    escrowState = await getEscrowCampaignState(campaign);
  }

  return { prepared: true, txHashes };
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
      approved_at: new Date().toISOString(),
      paid_at: new Date().toISOString(),
      payout_tx_hash: txHash
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
  let escrowState = await getEscrowCampaignState(campaign);
  if (escrowCampaignField(escrowState, 21, 'cancelled')) return { distributed: false, reason: 'cancelled' };
  if (!escrowCampaignField(escrowState, 18, 'allocationsSet')) return { distributed: false, reason: 'allocations_missing' };

  if (!escrowCampaignField(escrowState, 19, 'basePayoutsPrepared')) {
    await prepareCampaignBasePayouts(campaign);
    escrowState = await getEscrowCampaignState(campaign);
  }

  const releaseAt = campaign.release_at ? new Date(campaign.release_at).getTime() : Number(escrowCampaignField(escrowState, 16, 'releaseAt')) * 1000;
  if (Date.now() < releaseAt) return { distributed: false, reason: 'too_early' };

  const maxPayments = BigInt(Math.max(1, Number(env.PAYOUT_MAX_PAYMENTS_PER_TX || '50')));
  const { txHash, receipt } = await writeCampaignEscrow(
    campaign,
    'distribute',
    [campaign.escrow_campaign_id, maxPayments]
  );

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
  const escrowState = await getEscrowCampaignState(campaign);
  if (escrowCampaignField(escrowState, 21, 'cancelled')) {
    return { refunded: false, reason: 'already_cancelled' };
  }
  if (escrowCampaignField(escrowState, 18, 'allocationsSet')) {
    return { refunded: false, reason: 'allocations_set' };
  }

  const releaseAt = campaign.release_at ? new Date(campaign.release_at).getTime() : Number(escrowCampaignField(escrowState, 16, 'releaseAt')) * 1000;
  if (Date.now() < releaseAt) return { refunded: false, reason: 'too_early' };

  const { txHash, receipt } = await writeCampaignEscrow(
    campaign,
    'cancelUnallocatedCampaign',
    [campaign.escrow_campaign_id]
  );

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
    .select('id, title, status, end_date, release_at, escrow_campaign_id, escrow_contract_address')
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
          let result = await distributeCampaignPayouts(campaign);
          if (result.reason === 'allocations_missing') {
            const prepared = await prepareCampaignPayouts(campaign);
            if (prepared.prepared) {
              result = await distributeCampaignPayouts(campaign);
            } else if (prepared.reason === 'no_approved_wallets') {
              const refund = await refundUnallocatedCampaign(campaign);
              if (refund.refunded) summary.distributed += 1;
              else summary.skipped += 1;
              continue;
            }
          }
          if (result.distributed) {
            summary.distributed += 1;
          } else {
            summary.skipped += 1;
          }
        } else {
          const result = await prepareCampaignPayouts(campaign);
          if (result.prepared) summary.prepared += 1;
          else summary.skipped += 1;
        }
      } catch (error) {
        if (error?.code === 'ESCROW_ABI_MISMATCH') {
          summary.skipped += 1;
          console.warn(
            `Payout automation skipped campaign ${campaign.id}: escrow ABI does not match ${campaignEscrowAddress(campaign)}. ` +
            'Deploy/use the matching escrow contract before automating payouts for this campaign.'
          );
        } else {
          summary.failed += 1;
          console.warn(`Payout automation failed for campaign ${campaign.id}:`, error.message || error);
        }
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

function scheduleSubmissionWindowNotifications() {
  if (!env.SUBMISSION_WINDOW_NOTIFICATIONS_ENABLED) {
    console.log('Submission window notifications are disabled.');
    return;
  }

  const intervalMs = Math.max(60, Number(env.SUBMISSION_WINDOW_POLL_INTERVAL_SECONDS || '300')) * 1000;
  const run = async () => {
    try {
      const result = await runSubmissionWindowNotifications();
      console.log('Submission window notifications finished:', result);
    } catch (error) {
      console.error('Submission window notifications failed:', error);
    }
  };

  setTimeout(run, 20_000);
  setInterval(run, intervalMs);
  console.log(`Submission window notifications scheduled every ${intervalMs / 1000}s.`);
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

app.post('/auth/session', async (req, res) => {
  try {
    const token = requireBearer(req);
    const user = await authenticateToken(token);
    const session = await createAppSession(user.id);
    setAppSessionCookie(res, session.token);
    return res.status(201).json({
      userId: user.id,
      expiresAt: session.expiresAt,
      maxAge: appSessionTtlSeconds
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'Could not create app session' });
  }
});

app.post('/auth/logout', async (req, res) => {
  try {
    await revokeCurrentAppSession(req);
    clearAppSessionCookie(res);
    return res.json({ ok: true });
  } catch (error) {
    clearAppSessionCookie(res);
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'Could not end app session' });
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

app.post('/telegram/webhook/:secret', async (req, res) => {
  try {
    if (!env.TELEGRAM_WEBHOOK_SECRET || req.params.secret !== env.TELEGRAM_WEBHOOK_SECRET) {
      return res.sendStatus(404);
    }

    const message = req.body?.message;
    const text = String(message?.text || '').trim();
    const chatId = message?.chat?.id ? String(message.chat.id) : null;
    const chatType = message?.chat?.type || null;
    if (!chatId || !text) return res.json({ ok: true });
    if (chatType !== 'private') return res.json({ ok: true });

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

    pushTelegramStatus(profile.id, await getTelegramStatus(profile.id));

    await sendTelegramMessage(chatId, 'Telegram notifications are connected for SorsaMarket. You can manage notification types from Creator Settings.');
    return res.json({ ok: true });
  } catch (error) {
    console.error('telegram webhook failed:', error);
    return res.json({ ok: true });
  }
});

app.get('/telegram/status/stream', async (req, res) => {
  let userId = null;
  let heartbeat = null;
  try {
    const user = await authenticate(req);
    userId = user.id;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    if (typeof res.flushHeaders === 'function') res.flushHeaders();

    addTelegramStatusClient(userId, res);
    writeTelegramStatusEvent(res, await getTelegramStatus(userId));

    heartbeat = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 25_000);

    req.on('close', () => {
      if (heartbeat) clearInterval(heartbeat);
      removeTelegramStatusClient(userId, res);
    });
  } catch (error) {
    if (heartbeat) clearInterval(heartbeat);
    if (userId) removeTelegramStatusClient(userId, res);
    if (!res.headersSent) {
      const status = error.status || 500;
      return res.status(status).json({ error: error.message || 'Could not open Telegram status stream' });
    }
    res.end();
  }
});

app.get('/telegram/preferences', async (req, res) => {
  try {
    const user = await authenticate(req);
    return res.json(await getTelegramStatus(user.id));
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
      telegramBotLink: getTelegramBotLink(),
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
    pushTelegramStatus(user.id, await getTelegramStatus(user.id));
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

app.post('/admin/nft-campaigns', async (req, res) => {
  try {
    const user = await authenticate(req);
    await assertAdmin(user.id);
    const brandProfile = await getOrCreateNftBrandProfile(user.id);
    const payload = normalizeNftCampaignBody(req.body, user.id, brandProfile);

    const { data, error } = await supabase
      .from('campaigns')
      .insert([payload])
      .select()
      .single();
    if (error) throw Object.assign(new Error(error.message), { status: 500 });

    return res.status(201).json({
      campaign: withNftCampaignMetadata(data)
    });
  } catch (error) {
    const status = error.status || 500;
    console.error('admin nft campaign create failed:', error);
    return res.status(status).json({ error: error.message || 'NFT campaign could not be created' });
  }
});

app.get('/admin/raffles', async (req, res) => {
  try {
    const user = await authenticate(req);
    await assertAdmin(user.id);

    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('id, title, goal, campaign_type, categories, overview, budget, min_sorsa_score, language, status, start_date, end_date, created_at')
      .in('campaign_type', ['raffle', 'fcfs'])
      .order('created_at', { ascending: false });
    if (error) throw Object.assign(new Error(error.message), { status: 500 });

    const campaignIds = (campaigns || []).map((campaign) => campaign.id);
    const participantStats = new Map();

    if (campaignIds.length) {
      const { data: participants, error: participantError } = await supabase
        .from('campaign_participants')
        .select('campaign_id, status')
        .in('campaign_id', campaignIds);
      if (participantError) throw Object.assign(new Error(participantError.message), { status: 500 });

      for (const participant of participants || []) {
        const stats = participantStats.get(participant.campaign_id) || {
          joined_count: 0,
          approved_count: 0,
          rejected_count: 0
        };
        stats.joined_count += 1;
        if (participant.status === 'approved') stats.approved_count += 1;
        if (participant.status === 'rejected') stats.rejected_count += 1;
        participantStats.set(participant.campaign_id, stats);
      }
    }

    return res.json({
      campaigns: (campaigns || []).map((campaign) => ({
        ...withNftCampaignMetadata(campaign),
        stats: participantStats.get(campaign.id) || {
          joined_count: 0,
          approved_count: 0,
          rejected_count: 0
        }
      }))
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'Raffle campaigns could not be loaded' });
  }
});

app.get('/admin/raffles/:campaignId', async (req, res) => {
  try {
    const user = await authenticate(req);
    await assertAdmin(user.id);
    const campaignId = String(req.params.campaignId || '').trim();
    if (!campaignId) throw Object.assign(new Error('Missing campaign id'), { status: 400 });

    const [{ data: campaign, error }, { data: participants, error: participantError }] = await Promise.all([
      supabase
        .from('campaigns')
        .select('id, title, goal, campaign_type, categories, overview, budget, min_sorsa_score, language, status, start_date, end_date, created_at')
        .eq('id', campaignId)
        .in('campaign_type', ['raffle', 'fcfs'])
        .single(),
      supabase
        .from('campaign_participants')
        .select(`
          id,
          creator_id,
          status,
          joined_at,
          approved_at,
          base_reward,
          creator_profile:creator_profiles!creator_id (
            id,
            x_handle,
            full_name,
            avatar_url,
            sorsa_score,
            follower_count,
            wallet_address
          )
        `)
        .eq('campaign_id', campaignId)
        .order('joined_at', { ascending: false })
    ]);
    if (error || !campaign) throw Object.assign(new Error('Raffle campaign not found'), { status: 404 });
    if (participantError) throw Object.assign(new Error(participantError.message), { status: 500 });

    const stats = {
      joined_count: participants?.length || 0,
      approved_count: (participants || []).filter((participant) => participant.status === 'approved').length,
      rejected_count: (participants || []).filter((participant) => participant.status === 'rejected').length
    };

    return res.json({
      campaign: withNftCampaignMetadata(campaign),
      participants: participants || [],
      stats
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'Raffle campaign could not be loaded' });
  }
});

app.get('/admin/nft-content-campaigns', async (req, res) => {
  try {
    const user = await authenticate(req);
    await assertAdmin(user.id);

    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('id, title, goal, campaign_type, categories, overview, budget, min_sorsa_score, language, status, start_date, end_date, created_at')
      .in('campaign_type', ['content', 'all'])
      .order('created_at', { ascending: false });
    if (error) throw Object.assign(new Error(error.message), { status: 500 });

    const statsMap = await getNftCampaignStatsMap((campaigns || []).map((campaign) => campaign.id));
    return res.json({
      campaigns: (campaigns || []).map((campaign) => ({
        ...withNftCampaignMetadata(campaign),
        stats: statsMap.get(campaign.id) || {
          joined_count: 0,
          approved_count: 0,
          rejected_count: 0
        }
      }))
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'NFT content campaigns could not be loaded' });
  }
});

app.get('/admin/nft-content-campaigns/:campaignId', async (req, res) => {
  try {
    const user = await authenticate(req);
    await assertAdmin(user.id);
    const campaignId = String(req.params.campaignId || '').trim();
    if (!campaignId) throw Object.assign(new Error('Missing campaign id'), { status: 400 });

    const [
      { data: campaign, error: campaignError },
      { data: participants, error: participantError },
      { data: submissions, error: submissionError }
    ] = await Promise.all([
      supabase
        .from('campaigns')
        .select('id, title, goal, campaign_type, categories, overview, budget, min_sorsa_score, language, status, start_date, end_date, created_at')
        .eq('id', campaignId)
        .in('campaign_type', ['content', 'all'])
        .single(),
      supabase
        .from('campaign_participants')
        .select(`
          id,
          creator_id,
          status,
          joined_at,
          creator_profile:creator_profiles!creator_id (
            full_name,
            x_handle,
            wallet_address,
            avatar_url,
            sorsa_score
          )
        `)
        .eq('campaign_id', campaignId)
        .order('joined_at', { ascending: false }),
      supabase
        .from('campaign_submissions')
        .select('id, participation_id, campaign_id, creator_id, tweet_url, status, submitted_at')
        .eq('campaign_id', campaignId)
        .order('submitted_at', { ascending: false })
    ]);

    if (campaignError || !campaign) throw Object.assign(new Error('NFT content campaign not found'), { status: 404 });
    if (participantError) throw Object.assign(new Error(participantError.message), { status: 500 });
    if (submissionError) throw Object.assign(new Error(submissionError.message), { status: 500 });

    return res.json({
      campaign: withNftCampaignMetadata(campaign),
      participants: participants || [],
      submissions: submissions || []
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'NFT content campaign could not be loaded' });
  }
});

app.get('/admin/nft-content-submissions', async (req, res) => {
  try {
    const user = await authenticate(req);
    await assertAdmin(user.id);

    const { data: submissions, error } = await supabase
      .from('campaign_submissions')
      .select(`
        id,
        participation_id,
        campaign_id,
        creator_id,
        tweet_url,
        status,
        submitted_at,
        campaign:campaigns!inner (
          id,
          title,
          campaign_type,
          budget
        ),
        creator_profile:creator_profiles!creator_id (
          x_handle,
          full_name,
          avatar_url
        )
      `)
      .in('campaign.campaign_type', ['content', 'all'])
      .order('submitted_at', { ascending: false });
    if (error) throw Object.assign(new Error(error.message), { status: 500 });

    return res.json({ submissions: submissions || [] });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'NFT content submissions could not be loaded' });
  }
});

app.post('/admin/raffles/:campaignId/finalize', async (req, res) => {
  try {
    const user = await authenticate(req);
    await assertAdmin(user.id);
    const campaignId = String(req.params.campaignId || '').trim();
    if (!campaignId) throw Object.assign(new Error('Missing campaign id'), { status: 400 });

    const [{ data: campaign, error }, { data: participants, error: participantError }] = await Promise.all([
      supabase
        .from('campaigns')
        .select('id, title, campaign_type, budget, language, status')
        .eq('id', campaignId)
        .in('campaign_type', ['raffle', 'fcfs'])
        .single(),
      supabase
        .from('campaign_participants')
        .select(`
          id,
          creator_id,
          status,
          joined_at,
          creator_profile:creator_profiles!creator_id (
            id,
            x_handle,
            full_name,
            wallet_address,
            telegram_username
          )
        `)
        .eq('campaign_id', campaignId)
        .neq('status', 'rejected')
    ]);
    if (error || !campaign) throw Object.assign(new Error('Raffle campaign not found'), { status: 404 });
    if (participantError) throw Object.assign(new Error(participantError.message), { status: 500 });

    const metadata = parseCampaignMetadata(campaign);
    const raffleCampaign = withNftCampaignMetadata(campaign);
    if (Array.isArray(metadata.raffle_results) && metadata.raffle_results.length > 0) {
      return res.json({
        winners: metadata.raffle_results,
        finalized_at: metadata.raffle_finalized_at || null,
        alreadyFinalized: true
      });
    }

    const totalWl = Math.floor(Number(campaign.budget || 0));
    if (!Number.isFinite(totalWl) || totalWl < 1) {
      throw Object.assign(new Error('Total WL must be at least 1 before finalizing this raffle'), { status: 400 });
    }

    const eligibleParticipants = (participants || []).filter((participant) => participant.creator_profile);
    if (eligibleParticipants.length === 0) {
      throw Object.assign(new Error('No eligible joined creators found for this raffle'), { status: 400 });
    }

    const winners = pickRandomItems(eligibleParticipants, Math.min(totalWl, eligibleParticipants.length)).map((participant) => ({
      participant_id: participant.id,
      creator_id: participant.creator_id,
      name: participant.creator_profile?.full_name || participant.creator_profile?.x_handle || 'Creator',
      x_account: participant.creator_profile?.x_handle || '',
      wallet_address: participant.creator_profile?.wallet_address || '',
      telegram_username: participant.creator_profile?.telegram_username || ''
    }));
    const finalizedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('campaigns')
      .update({
        status: 'completed',
        language: JSON.stringify({
          ...metadata,
          raffle_results: winners,
          raffle_finalized_at: finalizedAt
        })
      })
      .eq('id', campaignId);
    if (updateError) throw Object.assign(new Error(updateError.message), { status: 500 });

    const telegram = await notifyRaffleWinnersGroup(raffleCampaign, winners).catch((error) => {
      console.warn(`Raffle winners Telegram group announcement failed for campaign ${campaignId}:`, error.message || error);
      return { sent: 0, skipped: 0, failed: 1 };
    });

    return res.json({
      winners,
      finalized_at: finalizedAt,
      alreadyFinalized: false,
      telegram
    });
  } catch (error) {
    const status = error.status || 500;
    console.error('admin raffle finalize failed:', error);
    return res.status(status).json({ error: error.message || 'Raffle could not be finalized' });
  }
});

app.get('/nft-campaigns', async (req, res) => {
  try {
    const [, { data, error }] = await Promise.all([
      authenticate(req),
      supabase
        .from('campaigns')
        .select('id, title, goal, campaign_type, categories, overview, budget, min_sorsa_score, language, status, start_date, end_date, created_at')
        .in('status', ['draft', 'completed'])
        .in('campaign_type', ['raffle', 'content', 'fcfs', 'all'])
        .order('created_at', { ascending: false })
    ]);
    if (error) throw Object.assign(new Error(error.message), { status: 500 });
    const statsMap = await getNftCampaignStatsMap((data || []).map((campaign) => campaign.id));

    return res.json({
      campaigns: (data || []).map((campaign) => ({
        ...withNftCampaignMetadata(campaign),
        stats: statsMap.get(campaign.id) || {
          joined_count: 0,
          approved_count: 0,
          rejected_count: 0
        }
      }))
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'NFT campaigns could not be loaded' });
  }
});

app.get('/nft-campaigns/mine', async (req, res) => {
  try {
    const user = await authenticate(req);
    const { data, error } = await supabase
      .from('campaign_participants')
      .select(`
        id,
        campaign_id,
        creator_id,
        status,
        joined_at,
        approved_at,
        campaign:campaigns (
          id,
          title,
          goal,
          campaign_type,
          categories,
          overview,
          budget,
          min_sorsa_score,
          language,
          status,
          start_date,
          end_date,
          created_at
        )
      `)
      .eq('creator_id', user.id)
      .neq('status', 'rejected')
      .order('joined_at', { ascending: false });
    if (error) throw Object.assign(new Error(error.message), { status: 500 });

    const now = Date.now();
    const campaignIds = (data || []).map((item) => item.campaign?.id).filter(Boolean);
    const statsMap = await getNftCampaignStatsMap(campaignIds);
    const nftParticipations = (data || [])
      .filter((item) => item.campaign && ['raffle', 'content', 'fcfs', 'all'].includes(item.campaign.campaign_type))
      .map((item) => ({
        ...item,
        campaign: {
          ...withNftCampaignMetadata(item.campaign),
          stats: statsMap.get(item.campaign.id) || {
            joined_count: 0,
            approved_count: 0,
            rejected_count: 0
          }
        }
      }));

    const isPastNftCampaign = (campaign) => {
      if (campaign.status === 'completed') return true;
      const endTime = getCampaignEndTime(campaign.end_date);
      return Boolean(endTime && endTime <= now);
    };

    return res.json({
      active: nftParticipations.filter((item) => !isPastNftCampaign(item.campaign)),
      past: nftParticipations.filter((item) => isPastNftCampaign(item.campaign))
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'Creator NFT campaigns could not be loaded' });
  }
});

app.get('/nft-campaigns/:campaignId', async (req, res) => {
  try {
    const user = await authenticate(req);
    const campaignId = String(req.params.campaignId || '').trim();
    if (!campaignId) throw Object.assign(new Error('Missing campaign id'), { status: 400 });

    const [{ data: campaign, error }, { data: participation, error: participationError }] = await Promise.all([
      supabase
        .from('campaigns')
        .select('id, title, goal, campaign_type, categories, overview, budget, min_sorsa_score, language, status, start_date, end_date, created_at')
        .eq('id', campaignId)
        .in('status', ['draft', 'completed'])
        .in('campaign_type', ['raffle', 'content', 'fcfs', 'all'])
        .single(),
      supabase
        .from('campaign_participants')
        .select('id, status, joined_at')
        .eq('campaign_id', campaignId)
        .eq('creator_id', user.id)
        .maybeSingle()
    ]);
    if (error || !campaign) throw Object.assign(new Error('NFT campaign not found'), { status: 404 });
    if (participationError) throw Object.assign(new Error(participationError.message), { status: 500 });
    const statsMap = await getNftCampaignStatsMap([campaign.id]);

    return res.json({
      campaign: {
        ...withNftCampaignMetadata(campaign),
        stats: statsMap.get(campaign.id) || {
          joined_count: 0,
          approved_count: 0,
          rejected_count: 0
        }
      },
      participation: participation || null
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'NFT campaign could not be loaded' });
  }
});

app.post('/nft-campaigns/:campaignId/verify-task', async (req, res) => {
  try {
    const user = await authenticate(req);
    const campaignId = String(req.params.campaignId || '').trim();
    const taskType = String(req.body?.type || '').trim().toLowerCase();
    const taskValue = String(req.body?.value || '').trim();
    if (!campaignId) throw Object.assign(new Error('Missing campaign id'), { status: 400 });
    if (!['follow', 'retweet'].includes(taskType) || !taskValue) {
      throw Object.assign(new Error('Missing task to verify'), { status: 400 });
    }

    const [{ data: creator, error: creatorError }, { data: campaign, error: campaignError }] = await Promise.all([
      supabase
        .from('creator_profiles')
        .select('id, x_handle, sorsa_score, wallet_address, telegram_chat_id, notify_campaign_updates')
        .eq('id', user.id)
        .single(),
      supabase
        .from('campaigns')
        .select('id, title, campaign_type, min_sorsa_score, language, status')
        .eq('id', campaignId)
        .eq('status', 'draft')
        .in('campaign_type', ['raffle', 'content', 'fcfs', 'all'])
        .single()
    ]);

    if (creatorError || !creator) {
      throw Object.assign(new Error('Creator profile is required to verify NFT tasks'), { status: 403 });
    }
    if (campaignError || !campaign) {
      throw Object.assign(new Error('NFT campaign not found'), { status: 404 });
    }
    if (taskType === 'retweet' && !isNftRaffleType(campaign.campaign_type)) {
      throw Object.assign(new Error('Retweet verification is only available for raffle campaigns'), { status: 400 });
    }

    const creatorHandle = cleanHandle(creator.x_handle);
    if (!creatorHandle) {
      throw Object.assign(new Error('Add your X handle to your creator profile before verifying tasks'), { status: 403 });
    }

    const nftCampaign = withNftCampaignMetadata(campaign);
    if (taskType === 'follow') {
      const targetAccount = cleanHandle(taskValue);
      const requiredFollowAccounts = Array.isArray(nftCampaign.follow_accounts)
        ? nftCampaign.follow_accounts.map((account) => cleanHandle(account)).filter(Boolean).slice(0, 3)
        : [];
      if (!requiredFollowAccounts.includes(targetAccount)) {
        throw Object.assign(new Error('This follow task is not part of the campaign'), { status: 400 });
      }

      const followResult = await callSorsa('/check-follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username_1: targetAccount,
          username_2: creatorHandle
        })
      });

      if (followResult?.follow !== true) {
        throw Object.assign(new Error(`Follow @${targetAccount} on X, then verify again`), { status: 403 });
      }

      return res.json({ verified: true, type: 'follow', value: targetAccount });
    }

    const tweetLink = taskValue;
    const requiredRetweetLinks = Array.isArray(nftCampaign.retweet_links)
      ? nftCampaign.retweet_links.map((link) => String(link || '').trim()).filter(Boolean).slice(0, 2)
      : [];
    if (!requiredRetweetLinks.includes(tweetLink)) {
      throw Object.assign(new Error('This retweet task is not part of the campaign'), { status: 400 });
    }

    let nextCursor = null;
    let retweeted = false;
    for (let page = 0; page < 5; page += 1) {
      const retweetResult = await callSorsa('/check-retweet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tweet_link: tweetLink,
          username: creatorHandle,
          ...(nextCursor ? { next_cursor: nextCursor } : {})
        })
      });

      if (retweetResult?.retweet === true) {
        retweeted = true;
        break;
      }
      if (!retweetResult?.next_cursor) break;
      nextCursor = retweetResult.next_cursor;
    }

    if (!retweeted) {
      throw Object.assign(new Error('Retweet this X post, then verify again'), { status: 403 });
    }

    return res.json({ verified: true, type: 'retweet', value: tweetLink });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'Task could not be verified' });
  }
});

app.post('/nft-campaigns/:campaignId/join', async (req, res) => {
  try {
    const user = await authenticate(req);
    const campaignId = String(req.params.campaignId || '').trim();
    if (!campaignId) throw Object.assign(new Error('Missing campaign id'), { status: 400 });

    const [{ data: creator, error: creatorError }, { data: campaign, error: campaignError }] = await Promise.all([
      supabase
        .from('creator_profiles')
        .select('id, x_handle, sorsa_score, wallet_address')
        .eq('id', user.id)
        .single(),
      supabase
        .from('campaigns')
        .select('id, campaign_type, min_sorsa_score, language, status')
        .eq('id', campaignId)
        .eq('status', 'draft')
        .in('campaign_type', ['raffle', 'content', 'fcfs', 'all'])
        .single()
    ]);

    if (creatorError || !creator) {
      throw Object.assign(new Error('Creator profile is required to join NFT campaigns'), { status: 403 });
    }
    if (campaignError || !campaign) {
      throw Object.assign(new Error('NFT campaign not found'), { status: 404 });
    }
    if (!creator.wallet_address || !isAddress(creator.wallet_address)) {
      throw Object.assign(new Error('Add a valid wallet address to your creator profile before joining campaigns'), { status: 403 });
    }

    const nftCampaign = withNftCampaignMetadata(campaign);
    const { data: existing, error: existingError } = await supabase
      .from('campaign_participants')
      .select('id, status, joined_at')
      .eq('campaign_id', campaignId)
      .eq('creator_id', user.id)
      .maybeSingle();
    if (existingError) throw Object.assign(new Error(existingError.message), { status: 500 });
    if (existing && existing.status !== 'rejected') {
      return res.json({ participation: existing, alreadyJoined: true });
    }

    const requiredScore = Number(campaign.min_sorsa_score || 0);
    if (requiredScore > 0 && Number(creator.sorsa_score || 0) < requiredScore) {
      throw Object.assign(new Error(`You need a Sorsa Score of at least ${requiredScore} to join this NFT campaign`), { status: 403 });
    }

    const requiredFollowAccounts = Array.isArray(nftCampaign.follow_accounts)
      ? nftCampaign.follow_accounts.map((account) => cleanHandle(account)).filter(Boolean).slice(0, 3)
      : [];
    if (requiredFollowAccounts.length > 0) {
      const creatorHandle = cleanHandle(creator.x_handle);
      if (!creatorHandle) {
        throw Object.assign(new Error('Add your X handle to your creator profile before joining this campaign'), { status: 403 });
      }

      for (const account of requiredFollowAccounts) {
        const followResult = await callSorsa('/check-follow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username_1: account,
            username_2: creatorHandle
          })
        });

        if (followResult?.follow !== true) {
          throw Object.assign(new Error(`Follow @${account} on X before joining this NFT campaign`), { status: 403 });
        }
      }
    }

    const requiredRetweetLinks = isNftRaffleType(campaign.campaign_type) && Array.isArray(nftCampaign.retweet_links)
      ? nftCampaign.retweet_links.map((link) => String(link || '').trim()).filter(Boolean).slice(0, 2)
      : [];
    if (requiredRetweetLinks.length > 0) {
      const creatorHandle = cleanHandle(creator.x_handle);
      if (!creatorHandle) {
        throw Object.assign(new Error('Add your X handle to your creator profile before joining this campaign'), { status: 403 });
      }

      for (const tweetLink of requiredRetweetLinks) {
        let nextCursor = null;
        let retweeted = false;
        for (let page = 0; page < 5; page += 1) {
          const retweetResult = await callSorsa('/check-retweet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tweet_link: tweetLink,
              username: creatorHandle,
              ...(nextCursor ? { next_cursor: nextCursor } : {})
            })
          });

          if (retweetResult?.retweet === true) {
            retweeted = true;
            break;
          }
          if (!retweetResult?.next_cursor) break;
          nextCursor = retweetResult.next_cursor;
        }

        if (!retweeted) {
          throw Object.assign(new Error('Retweet all required X posts before joining this NFT campaign'), { status: 403 });
        }
      }
    }

    if (isNftRaffleType(campaign.campaign_type) && nftCampaign.max_creators) {
      const { count, error: countError } = await supabase
        .from('campaign_participants')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaignId)
        .neq('status', 'rejected');
      if (countError) throw Object.assign(new Error(countError.message), { status: 500 });
      if (Number(count || 0) >= Number(nftCampaign.max_creators)) {
        throw Object.assign(new Error('This raffle NFT campaign is full'), { status: 409 });
      }
    }

    const mutation = existing
      ? supabase
          .from('campaign_participants')
          .update({
            status: 'active',
            base_reward: 0,
            joined_at: new Date().toISOString(),
            submission_window_notified_at: null
          })
          .eq('id', existing.id)
          .select()
          .single()
      : supabase
          .from('campaign_participants')
          .insert({
            campaign_id: campaignId,
            creator_id: user.id,
            status: 'active',
            base_reward: 0
          })
          .select()
          .single();

    const { data: participation, error: mutationError } = await mutation;
    if (mutationError) {
      if (mutationError.code === '23505') {
        throw Object.assign(new Error('You have already joined this NFT campaign'), { status: 409 });
      }
      throw Object.assign(new Error(mutationError.message), { status: 500 });
    }

    const telegram = isNftContentType(campaign.campaign_type)
      ? await notifyCampaignJoinReminder(creator, withNftCampaignMetadata(campaign), participation).catch((error) => {
          console.warn(`NFT join reminder Telegram notification failed for ${participation.id}:`, error.message || error);
          return { sent: 0, skipped: 0, failed: 1 };
        })
      : { sent: 0, skipped: 1 };

    return res.status(existing ? 200 : 201).json({ participation, alreadyJoined: false, telegram });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'Could not join NFT campaign' });
  }
});

app.post('/nft-campaigns/:campaignId/submissions', async (req, res) => {
  try {
    const user = await authenticate(req);
    const campaignId = String(req.params.campaignId || '').trim();
    const tweetUrl = String(req.body?.tweet_url || '').trim();
    if (!campaignId) throw Object.assign(new Error('Missing campaign id'), { status: 400 });
    if (!/^https?:\/\/(x|twitter)\.com\/.+\/status\/\d+/i.test(tweetUrl)) {
      throw Object.assign(new Error('Submit a valid X post link'), { status: 400 });
    }

    const [{ data: campaign, error: campaignError }, { data: participation, error: participationError }] = await Promise.all([
      supabase
        .from('campaigns')
        .select('id, campaign_type, status')
        .eq('id', campaignId)
        .eq('status', 'draft')
        .in('campaign_type', ['content', 'all'])
        .single(),
      supabase
        .from('campaign_participants')
        .select('id, status')
        .eq('campaign_id', campaignId)
        .eq('creator_id', user.id)
        .maybeSingle()
    ]);

    if (campaignError || !campaign || !isNftContentType(campaign.campaign_type)) {
      throw Object.assign(new Error('Content NFT campaign not found'), { status: 404 });
    }
    if (participationError) throw Object.assign(new Error(participationError.message), { status: 500 });
    if (!participation || participation.status === 'rejected') {
      throw Object.assign(new Error('Join this content campaign before submitting'), { status: 403 });
    }

    const { data: duplicate, error: duplicateError } = await supabase
      .from('campaign_submissions')
      .select('id')
      .eq('participation_id', participation.id)
      .eq('tweet_url', tweetUrl)
      .maybeSingle();
    if (duplicateError) throw Object.assign(new Error(duplicateError.message), { status: 500 });
    if (duplicate) throw Object.assign(new Error('This content link has already been submitted'), { status: 409 });

    const { data: submission, error: submissionError } = await supabase
      .from('campaign_submissions')
      .insert([{
        participation_id: participation.id,
        campaign_id: campaignId,
        creator_id: user.id,
        tweet_url: tweetUrl,
        status: 'submitted'
      }])
      .select()
      .single();
    if (submissionError) throw Object.assign(new Error(submissionError.message), { status: 500 });

    const { error: participantError } = await supabase
      .from('campaign_participants')
      .update({ status: 'submitted' })
      .eq('id', participation.id);
    if (participantError) throw Object.assign(new Error(participantError.message), { status: 500 });

    return res.status(201).json({ submission });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'Content submission failed' });
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

app.post('/creator/sorsa/sync', async (req, res) => {
  try {
    const user = await authenticate(req);
    const { data: profile, error } = await supabase
      .from('creator_profiles')
      .select('id, x_handle, sorsa_score, last_profile_sync_at')
      .eq('id', user.id)
      .single();
    if (error || !profile) {
      throw Object.assign(new Error('Creator profile is required to sync Sorsa score'), { status: 403 });
    }

    const result = await syncCreatorProfileFromSorsa(profile);
    if (!result.synced) {
      throw Object.assign(new Error('Add your X handle before syncing Sorsa score'), { status: 400 });
    }

    const { data: updatedProfile, error: updatedError } = await supabase
      .from('creator_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (updatedError) throw Object.assign(new Error(updatedError.message), { status: 500 });

    return res.json({ profile: updatedProfile });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'Sorsa profile sync failed' });
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

app.post('/campaigns/:campaignId/join', async (req, res) => {
  try {
    const user = await authenticate(req);
    const campaignId = String(req.params.campaignId || '').trim();
    if (!campaignId) throw Object.assign(new Error('Missing campaign id'), { status: 400 });

    const [{ data: creator, error: creatorError }, { data: campaign, error: campaignError }] = await Promise.all([
      supabase
        .from('creator_profiles')
        .select('id, sorsa_score, wallet_address, telegram_chat_id, notify_campaign_updates')
        .eq('id', user.id)
        .single(),
      supabase
        .from('campaigns')
        .select('id, title, status, min_sorsa_score, escrow_campaign_id, escrow_contract_address, escrow_tx_hash, metadata_hash, brand_wallet')
        .eq('id', campaignId)
        .single()
    ]);

    if (creatorError || !creator) {
      throw Object.assign(new Error('Creator profile is required to join campaigns'), { status: 403 });
    }
    if (campaignError || !campaign) {
      throw Object.assign(new Error('Campaign not found'), { status: 404 });
    }
    if (!creator.wallet_address || !isAddress(creator.wallet_address)) {
      throw Object.assign(new Error('Add a valid wallet address to your creator profile before joining campaigns'), { status: 403 });
    }
    if (campaign.status !== 'live') {
      throw Object.assign(new Error('Campaign is not open for joining'), { status: 400 });
    }
    if (!isEscrowConfirmedCampaign(campaign)) {
      throw Object.assign(new Error('Campaign escrow is not confirmed'), { status: 400 });
    }
    const requiredScore = Number(campaign.min_sorsa_score || 0);
    const creatorScore = Number(creator.sorsa_score || 0);
    if (requiredScore > 0 && creatorScore < requiredScore) {
      throw Object.assign(new Error(`You need a Sorsa score of at least ${requiredScore} to join this campaign`), { status: 403 });
    }

    const { data: existing, error: existingError } = await supabase
      .from('campaign_participants')
      .select('id, status')
      .eq('campaign_id', campaignId)
      .eq('creator_id', user.id)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing && existing.status !== 'rejected') {
      return res.json({ participation: existing, alreadyJoined: true });
    }

    const { data: stats, error: statsError } = await supabase
      .from('campaign_stats')
      .select('max_base_pool, allocated_base_pool')
      .eq('campaign_id', campaignId)
      .maybeSingle();
    if (statsError) {
      console.warn(`Could not check campaign capacity for ${campaignId}:`, statsError.message || statsError);
    }
    const baseReward = Number((creatorScore * 0.1).toFixed(2));
    if (baseReward <= 0) {
      throw Object.assign(new Error('Creator Sorsa score does not qualify for a base reward'), { status: 400 });
    }
    if (
      stats &&
      Number(stats.max_base_pool || 0) > 0 &&
      Number(stats.allocated_base_pool || 0) + baseReward > Number(stats.max_base_pool || 0)
    ) {
      throw Object.assign(new Error('Campaign does not have enough base reward capacity'), { status: 409 });
    }

    const mutation = existing
      ? supabase
          .from('campaign_participants')
          .update({
            status: 'active',
            base_reward: baseReward,
            joined_at: new Date().toISOString(),
            submission_window_notified_at: null,
            approved_at: null,
            paid_at: null,
            payout_tx_hash: null
          })
          .eq('id', existing.id)
          .select()
          .single()
      : supabase
          .from('campaign_participants')
          .insert({
            campaign_id: campaignId,
            creator_id: user.id,
            status: 'active',
            base_reward: baseReward
          })
          .select()
          .single();

    const { data: participation, error: mutationError } = await mutation;
    if (mutationError) {
      if (mutationError.code === '23505') {
        throw Object.assign(new Error('You have already joined this campaign'), { status: 409 });
      }
      throw mutationError;
    }

    const telegram = await notifyCampaignJoinReminder(creator, campaign, participation).catch((error) => {
      console.warn(`Campaign join reminder Telegram notification failed for ${participation.id}:`, error.message || error);
      return { sent: 0, skipped: 0, failed: 1 };
    });

    return res.status(existing ? 200 : 201).json({ participation, alreadyJoined: false, telegram });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'Could not join campaign' });
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
      .select(`
        id,
        campaign_id,
        creator_id,
        participation_id,
        status,
        submitted_at,
        campaign:campaigns (
          id,
          owner_id,
          campaign_type,
          categories,
          language,
          escrow_campaign_id,
          escrow_contract_address
        )
      `)
      .eq('id', submissionId)
      .single();
    if (existingError) throw existingError;

    const role = await getUserRole(user.id);
    if (role !== 'admin' && existingSubmission.campaign?.owner_id !== user.id) {
      throw Object.assign(new Error('Campaign does not belong to this user'), { status: 403 });
    }

    if (status === 'approved' && existingSubmission.status !== 'approved') {
      let nftMetadata = {};
      try {
        nftMetadata = existingSubmission.campaign?.language ? JSON.parse(existingSubmission.campaign.language) : {};
      } catch {
        nftMetadata = {};
      }
      const campaignType = String(existingSubmission.campaign?.campaign_type || '').toLowerCase();
      const categories = Array.isArray(existingSubmission.campaign?.categories) ? existingSubmission.campaign.categories : [];
      const isNftContentCampaign =
        isNftContentType(campaignType) &&
        (nftMetadata.nft || categories.some((category) => String(category).toLowerCase() === 'nft'));

      if (isNftContentCampaign) {
        const maxAccepted = Math.max(1, Math.min(5, Number(nftMetadata.max_content_submissions || 5)));
        const { count: approvedCount, error: approvedCountError } = await supabase
          .from('campaign_submissions')
          .select('id', { count: 'exact', head: true })
          .eq('campaign_id', existingSubmission.campaign_id)
          .eq('status', 'approved')
          .neq('id', submissionId);
        if (approvedCountError) throw approvedCountError;
        if (Number(approvedCount || 0) >= maxAccepted) {
          throw Object.assign(new Error(`This NFT content campaign already has ${maxAccepted} approved submission${maxAccepted === 1 ? '' : 's'}`), { status: 409 });
        }
      }
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
      let shouldReleaseBaseReward = false;
      if (status === 'rejected') {
        const { data: firstSubmission, error: firstSubmissionError } = await supabase
          .from('campaign_submissions')
          .select('id')
          .eq('participation_id', submission.participation_id)
          .order('submitted_at', { ascending: true })
          .order('id', { ascending: true })
          .limit(1)
          .maybeSingle();
        if (firstSubmissionError) throw firstSubmissionError;
        shouldReleaseBaseReward = firstSubmission?.id === submission.id;
      }

      const participantPayload = {
        ...(status !== 'rejected' || shouldReleaseBaseReward ? { status } : {}),
        ...(status === 'approved' ? { approved_at: new Date().toISOString() } : {}),
        ...(shouldReleaseBaseReward ? { base_reward: 0 } : {})
      };
      if (Object.keys(participantPayload).length > 0) {
        const { error: participantError } = await supabase
          .from('campaign_participants')
          .update(participantPayload)
          .eq('id', submission.participation_id);
        if (participantError) throw participantError;
      }
    }

    let activityPoints = { awarded: false };
    let referral = { qualified: false };
    if (status === 'approved' && submission.creator_id) {
      activityPoints = await awardSubmissionActivityPoints(submission);
      referral = await qualifyReferralForCreator(submission.creator_id);
    }

    let telegram = { sent: 0, skipped: 1 };
    if (await shouldNotifySubmissionDecision(submission, existingSubmission.status)) {
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
  scheduleCreatorIdentitySync();
  schedulePayoutAutomation();
  scheduleSubmissionWindowNotifications();
});
