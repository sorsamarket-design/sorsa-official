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
  SORSA_PROFILE_SYNC_ENABLED: process.env.SORSA_PROFILE_SYNC_ENABLED === 'true',
  SORSA_WEEKLY_SYNC_ENABLED: process.env.SORSA_WEEKLY_SYNC_ENABLED !== 'false',
  CREATOR_IDENTITY_SYNC_ENABLED: process.env.CREATOR_IDENTITY_SYNC_ENABLED !== 'false',
  CREATOR_IDENTITY_SYNC_INTERVAL_DAYS: process.env.CREATOR_IDENTITY_SYNC_INTERVAL_DAYS || '4',
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  TELEGRAM_BOT_USERNAME: process.env.TELEGRAM_BOT_USERNAME,
  TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET,
  TELEGRAM_RAFFLE_GROUP_CHAT_ID: process.env.TELEGRAM_RAFFLE_GROUP_CHAT_ID,
  TELEGRAM_RAFFLE_GROUP_THREAD_ID: process.env.TELEGRAM_RAFFLE_GROUP_THREAD_ID,
  TELEGRAM_NFT_LAUNCH_GROUP_THREAD_ID: process.env.TELEGRAM_NFT_LAUNCH_GROUP_THREAD_ID,
  TELEGRAM_CONNECT_CODE_TTL_MINUTES: process.env.TELEGRAM_CONNECT_CODE_TTL_MINUTES || '30',
  FRONTEND_URL: process.env.FRONTEND_URL || process.env.VITE_FRONTEND_URL,
  PAYOUT_AUTOMATION_ENABLED: process.env.PAYOUT_AUTOMATION_ENABLED !== 'false',
  PAYOUT_POLL_INTERVAL_SECONDS: process.env.PAYOUT_POLL_INTERVAL_SECONDS || '300',
  PAYOUT_MAX_PAYMENTS_PER_TX: process.env.PAYOUT_MAX_PAYMENTS_PER_TX || '50',
  SUBMISSION_WINDOW_NOTIFICATIONS_ENABLED: process.env.SUBMISSION_WINDOW_NOTIFICATIONS_ENABLED !== 'false',
  SUBMISSION_WINDOW_POLL_INTERVAL_SECONDS: process.env.SUBMISSION_WINDOW_POLL_INTERVAL_SECONDS || '300',
  APP_SESSION_TTL_DAYS: process.env.APP_SESSION_TTL_DAYS || '90',
  NFT_X_TASK_VERIFICATION_BYPASS_ENABLED: process.env.NFT_X_TASK_VERIFICATION_BYPASS_ENABLED !== 'false',
  NFT_CAMPAIGN_ASSET_BUCKET: process.env.NFT_CAMPAIGN_ASSET_BUCKET || 'nft-campaign-assets'
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
app.use(express.json({ limit: '3mb' }));

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
const defaultAppSessionCookieName = 'sorsa_session';
const adminAppSessionCookieName = 'sorsa_admin_session';
const appSessionTtlDays = Math.max(1, Number(env.APP_SESSION_TTL_DAYS || '90'));
const appSessionTtlSeconds = appSessionTtlDays * 24 * 60 * 60;
const nftCampaignAssetBucket = env.NFT_CAMPAIGN_ASSET_BUCKET;
const maxNftCampaignAssetBytes = 2 * 1024 * 1024;
let nftCampaignAssetBucketReady = null;

function logAuthEvent(event, details = {}) {
  console.info('[auth.server]', JSON.stringify({
    event,
    ...details,
    at: new Date().toISOString()
  }));
}

function authRequestContext(req) {
  return {
    method: req.method,
    path: req.originalUrl || req.url || null
  };
}

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

function getAppSessionScope(req) {
  const requestedScope = String(req.headers['x-app-session-scope'] || '').trim().toLowerCase();
  if (requestedScope === 'admin') return 'admin';
  const path = String(req.originalUrl || req.url || '');
  return path.startsWith('/admin/') || path === '/auth/admin' ? 'admin' : 'default';
}

function getAppSessionCookieName(scope = 'default') {
  return scope === 'admin' ? adminAppSessionCookieName : defaultAppSessionCookieName;
}

function serializeAppSessionCookie(cookieName, value, maxAgeSeconds) {
  const encodedName = encodeURIComponent(cookieName);
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

function setAppSessionCookie(res, token, scope = 'default') {
  res.setHeader('Set-Cookie', serializeAppSessionCookie(getAppSessionCookieName(scope), token, appSessionTtlSeconds));
}

function clearAppSessionCookie(res, scope = 'default') {
  res.setHeader('Set-Cookie', serializeAppSessionCookie(getAppSessionCookieName(scope), '', 0));
}

function requireBearer(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) throw Object.assign(new Error('Missing bearer token'), { status: 401 });
  return token;
}

async function authenticate(req) {
  const cookies = parseCookies(req);
  const scope = getAppSessionScope(req);
  const cookieName = getAppSessionCookieName(scope);
  const sessionToken = cookies[cookieName];
  const requestContext = authRequestContext(req);
  const header = req.headers.authorization || '';
  const [scheme, bearerToken] = header.split(' ');
  const bearerPresent = scheme === 'Bearer' && Boolean(bearerToken);

  if (sessionToken) {
    const tokenHash = hashSessionToken(sessionToken);
    const { data: sessionRow, error } = await supabase
      .from('app_sessions')
      .select('id, user_id, expires_at, revoked_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (!error && sessionRow && !sessionRow.revoked_at && new Date(sessionRow.expires_at).getTime() > Date.now()) {
      await supabase
        .from('app_sessions')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', sessionRow.id);
      logAuthEvent('authenticate.success', {
        ...requestContext,
        authMethod: 'cookie',
        appSessionScope: scope,
        cookiePresent: true,
        bearerPresent,
        userId: sessionRow.user_id,
        appSessionId: sessionRow.id
      });
      return { id: sessionRow.user_id };
    }

    const reason = error
      ? 'cookie_lookup_error'
      : !sessionRow
        ? 'cookie_not_found'
        : sessionRow.revoked_at
          ? 'cookie_revoked'
          : 'cookie_expired';
    logAuthEvent('authenticate.cookie_rejected', {
      ...requestContext,
      authMethod: 'cookie',
      appSessionScope: scope,
      cookiePresent: true,
      bearerPresent,
      reason,
      appSessionId: sessionRow?.id || null,
      userId: sessionRow?.user_id || null
    });
  }

  // Fall back to the Supabase bearer token: the app-session cookie can be briefly
  // unavailable right after login (e.g. in-app browsers with stricter cookie jars),
  // so callers that still hold the access token in memory can authenticate with it.
  if (bearerPresent) {
    return authenticateToken(bearerToken, {
      ...requestContext,
      appSessionScope: scope,
      cookiePresent: Boolean(sessionToken),
      bearerPresent: true
    });
  }

  logAuthEvent('authenticate.failure', {
    ...requestContext,
    appSessionScope: scope,
    authMethod: 'none',
    cookiePresent: Boolean(sessionToken),
    bearerPresent: false,
    reason: 'missing_app_session'
  });
  throw Object.assign(new Error('Missing app session'), { status: 401 });
}

async function authenticateToken(token, context = {}) {
  if (!token) throw Object.assign(new Error('Missing bearer token'), { status: 401 });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    logAuthEvent('authenticate.failure', {
      ...context,
      authMethod: 'bearer',
      reason: 'invalid_session',
      supabaseError: error?.message || null
    });
    throw Object.assign(new Error('Invalid session'), { status: 401 });
  }
  logAuthEvent('authenticate.success', {
    ...context,
    authMethod: 'bearer',
    userId: data.user.id
  });
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

function parseImageDataUrl(value) {
  if (typeof value !== 'string') return null;
  const match = value.match(/^data:(image\/(?:png|jpe?g|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!match) return null;
  const mimeType = match[1].toLowerCase().replace('image/jpg', 'image/jpeg');
  const buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
  if (!buffer.length) {
    throw Object.assign(new Error('Campaign image is empty'), { status: 400 });
  }
  if (buffer.length > maxNftCampaignAssetBytes) {
    throw Object.assign(new Error('Campaign image must be under 2MB'), { status: 400 });
  }
  const extensions = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif'
  };
  return {
    buffer,
    mimeType,
    extension: extensions[mimeType] || 'jpg'
  };
}

async function ensureNftCampaignAssetBucket() {
  if (nftCampaignAssetBucketReady) return nftCampaignAssetBucketReady;
  nftCampaignAssetBucketReady = (async () => {
    const { data, error } = await supabase.storage.getBucket(nftCampaignAssetBucket);
    if (error || !data) {
      const { error: createError } = await supabase.storage.createBucket(nftCampaignAssetBucket, {
        public: true,
        fileSizeLimit: maxNftCampaignAssetBytes,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
      });
      if (createError) throw Object.assign(new Error(createError.message), { status: 500 });
      return;
    }

    if (!data.public) {
      const { error: updateError } = await supabase.storage.updateBucket(nftCampaignAssetBucket, {
        public: true,
        fileSizeLimit: maxNftCampaignAssetBytes,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
      });
      if (updateError) throw Object.assign(new Error(updateError.message), { status: 500 });
    }
  })().catch((error) => {
    nftCampaignAssetBucketReady = null;
    throw error;
  });
  return nftCampaignAssetBucketReady;
}

async function uploadNftCampaignAsset(source, campaignKey, slot) {
  const parsed = parseImageDataUrl(source);
  if (!parsed) return source;

  await ensureNftCampaignAssetBucket();
  const hash = createHash('sha256').update(parsed.buffer).digest('hex').slice(0, 16);
  const path = `nft-campaigns/${campaignKey}/${slot}-${hash}.${parsed.extension}`;
  const { error } = await supabase.storage
    .from(nftCampaignAssetBucket)
    .upload(path, parsed.buffer, {
      contentType: parsed.mimeType,
      cacheControl: '31536000',
      upsert: true
    });
  if (error) throw Object.assign(new Error(error.message), { status: 500 });

  const { data } = supabase.storage
    .from(nftCampaignAssetBucket)
    .getPublicUrl(path);
  return data.publicUrl;
}

async function uploadNftCampaignMetadataAssets(metadata, campaignKey) {
  return {
    ...metadata,
    image_url: metadata.image_url
      ? await uploadNftCampaignAsset(metadata.image_url, campaignKey, 'image')
      : null,
    background_image_url: metadata.background_image_url
      ? await uploadNftCampaignAsset(metadata.background_image_url, campaignKey, 'background')
      : null
  };
}

async function revokeCurrentAppSession(req) {
  const scope = getAppSessionScope(req);
  const token = parseCookies(req)[getAppSessionCookieName(scope)];
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
const telegramMembershipCache = new Map();
const telegramMembershipCacheTtlMs = 60 * 1000;
const raffleTaskAuditNote = 'Note: We may check your tasks again anytime before the raffle ends. If you didn\'t finish all of them, your entry will be void.';

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

function telegramTaskKey(chatId) {
  return String(chatId || '').trim();
}

function normalizeTelegramTasks(tasks) {
  if (!Array.isArray(tasks)) return [];
  const seen = new Set();
  const normalized = [];
  for (const task of tasks) {
    const chatId = telegramTaskKey(typeof task === 'object' ? task.chat_id : task);
    if (!chatId || seen.has(chatId)) continue;
    seen.add(chatId);
    normalized.push({
      chat_id: chatId,
      title: typeof task?.title === 'string' && task.title.trim() ? task.title.trim() : null,
      public_link: typeof task?.public_link === 'string' && task.public_link.trim() ? task.public_link.trim() : null
    });
  }
  return normalized.slice(0, 3);
}

function buildCollectionDetailsDescription(details = {}) {
  const rows = [
    ['Chain', details.chain],
    ['Mint Date', details.mint_date],
    ['Supply', details.supply],
    ['Mint Price', details.mint_price]
  ]
    .filter(([, value]) => String(value || '').trim())
    .map(([label, value]) => `${label}: ${String(value).trim()}`);

  const collectionDetails = rows.length
    ? `Collection Details\n${rows.join('\n')}`
    : 'Collection Details\nCollection details will be announced soon.';

  return `${collectionDetails}\n\n${raffleTaskAuditNote}`;
}

function normalizeAdditionalRequirements(requirements) {
  const telegramTasks = normalizeTelegramTasks(requirements?.telegram_tasks);
  return {
    telegram_enabled: Boolean(requirements?.telegram_enabled && telegramTasks.length > 0),
    telegram_tasks: telegramTasks.slice(0, 1)
  };
}

function getCampaignTelegramTasks(campaign) {
  return normalizeAdditionalRequirements(campaign?.additional_requirements).telegram_tasks;
}

function nftTaskKey(taskType, taskValue) {
  return `${String(taskType || '').trim().toLowerCase()}:${String(taskValue || '').trim()}`;
}

async function getNftTaskVerificationMap(campaignId, creatorId) {
  const { data, error } = await supabase
    .from('nft_task_verifications')
    .select('task_type, task_value, verified_at')
    .eq('campaign_id', campaignId)
    .eq('creator_id', creatorId);
  if (error) {
    console.warn('Could not load NFT task verifications:', error.message || error);
    return {};
  }
  const verified = {};
  for (const row of data || []) {
    verified[nftTaskKey(row.task_type, row.task_value)] = true;
  }
  return verified;
}

async function recordNftTaskVerification(campaignId, creatorId, taskType, taskValue, details = {}) {
  const payload = {
    campaign_id: campaignId,
    creator_id: creatorId,
    task_type: String(taskType || '').trim().toLowerCase(),
    task_value: String(taskValue || '').trim(),
    verification_details: details || {},
    verified_at: new Date().toISOString()
  };
  const { error } = await supabase
    .from('nft_task_verifications')
    .upsert(payload, { onConflict: 'campaign_id,creator_id,task_type,task_value' });
  if (error) {
    console.warn('Could not save NFT task verification:', error.message || error);
  }
}

function telegramBotPermissionStatus(member, chatType) {
  const status = String(member?.status || '').toLowerCase();
  if (status === 'creator' || status === 'administrator') return 'configured';
  if (status === 'left' || status === 'kicked') return 'bot_not_in_chat';
  if (status === 'member' && chatType === 'channel') return 'needs_admin';
  if (status === 'member') return 'needs_admin';
  if (status === 'restricted') return 'restricted';
  return 'unknown';
}

async function upsertTelegramGroupConfigFromChatMember(chat, member, lastError = null, extra = {}) {
  if (!chat?.id) return null;
  const chatId = String(chat.id);
  const payload = {
    chat_id: chatId,
    ...(extra.brand_profile_id ? { brand_profile_id: extra.brand_profile_id } : {}),
    chat_type: chat.type || null,
    title: chat.title || chat.username || null,
    ...(extra.public_link ? { public_link: extra.public_link } : {}),
    bot_status: member?.status || null,
    bot_permission_status: telegramBotPermissionStatus(member, chat.type),
    bot_permissions: member || {},
    last_error: lastError,
    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  const { data, error } = await supabase
    .from('telegram_group_configs')
    .upsert(payload, { onConflict: 'chat_id' })
    .select()
    .single();
  if (error) {
    console.warn(`Could not save Telegram group config for ${chatId}:`, error.message || error);
    return payload;
  }
  return data;
}

async function refreshTelegramGroupConfig(config) {
  if (!config?.chat_id || !env.TELEGRAM_BOT_TOKEN) return config;
  try {
    const botMember = await telegramRequest('getChatMember', {
      chat_id: config.chat_id,
      user_id: env.TELEGRAM_BOT_TOKEN.split(':')[0]
    });
    return upsertTelegramGroupConfigFromChatMember(
      {
        id: config.chat_id,
        type: config.chat_type,
        title: config.title
      },
      botMember,
      null,
      {
        brand_profile_id: config.brand_profile_id,
        public_link: config.public_link
      }
    );
  } catch (error) {
    const description = String(error?.message || '');
    if (error?.status === 429) {
      return {
        ...config,
        last_error: error.message || 'Telegram rate limit reached'
      };
    }
    if (!/chat not found|not enough rights|not a member|bot is not a member|forbidden|kicked|blocked/i.test(description)) {
      return {
        ...config,
        last_error: description || 'Telegram group status could not be refreshed'
      };
    }
    const payload = {
      bot_status: 'left',
      bot_permission_status: 'bot_not_in_chat',
      last_error: description || 'The Telegram bot is not in this group.',
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const { data, error: updateError } = await supabase
      .from('telegram_group_configs')
      .update(payload)
      .eq('chat_id', config.chat_id)
      .select('chat_id, brand_profile_id, chat_type, title, public_link, bot_status, bot_permission_status, last_error, last_seen_at, updated_at')
      .single();
    if (updateError) {
      console.warn(`Could not mark Telegram group ${config.chat_id} inactive:`, updateError.message || updateError);
      return { ...config, ...payload };
    }
    return data;
  }
}

async function getTelegramGroupConfigMap(chatIds) {
  const ids = Array.from(new Set((chatIds || []).map(telegramTaskKey).filter(Boolean)));
  const map = new Map();
  if (!ids.length) return map;
  const { data, error } = await supabase
    .from('telegram_group_configs')
    .select('chat_id, chat_type, title, public_link, bot_status, bot_permission_status, bot_permissions, last_error, last_seen_at, updated_at')
    .in('chat_id', ids);
  if (error) {
    console.warn('Could not read Telegram group configs:', error.message || error);
    return map;
  }
  for (const row of data || []) map.set(String(row.chat_id), row);
  return map;
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
    .maybeSingle();
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
    company_name: 'AtlasReach NFT Campaigns',
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

function formatNftAllocationTitle(title, allocationType) {
  const label = ['gtd', 'fcfs'].includes(allocationType) ? allocationType.toUpperCase() : 'WL';
  const cleanedTitle = String(title || '')
    .trim()
    .replace(/^\((?:WL|GTD|FCFS)\)\s*/i, '')
    .replace(/\s*\((?:WL|GTD|FCFS)\)$/i, '')
    .trim();
  if (!cleanedTitle) return '';
  return `${cleanedTitle} (${label})`;
}

function stripNftAllocationLabel(title) {
  return String(title || '')
    .trim()
    .replace(/^\((?:WL|GTD|FCFS)\)\s*/i, '')
    .replace(/\s*\((?:WL|GTD|FCFS)\)$/i, '')
    .trim();
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

  const rawTitle = String(campaign.title || '').trim();
  const goal = String(campaign.goal || '').trim();
  const rawOverview = String(campaign.overview || '').trim();
  const budget = Number(campaign.budget || 0);
  const totalGtd = Number(campaign.total_gtd || 0);
  const totalFcfs = Number(campaign.total_fcfs || 0);
  const rawAllocationType = String(campaign.allocation_type || '').toLowerCase();
  const allocationType = ['gtd', 'fcfs'].includes(rawAllocationType) ? rawAllocationType : 'wl';
  const title = formatNftAllocationTitle(rawTitle, allocationType);
  const minSorsaScore = Math.max(0, Math.min(1000, Number(campaign.min_sorsa_score || 0)));
  const imageUrl = typeof campaign.image_url === 'string' && campaign.image_url.trim() ? campaign.image_url.trim() : null;
  const backgroundImageUrl = typeof campaign.background_image_url === 'string' && campaign.background_image_url.trim()
    ? campaign.background_image_url.trim()
    : null;
  const collectionDetails = campaign.collection_details && typeof campaign.collection_details === 'object'
    ? {
        chain: String(campaign.collection_details.chain || '').trim(),
        mint_date: String(campaign.collection_details.mint_date || '').trim(),
        supply: String(campaign.collection_details.supply || '').trim(),
        mint_price: String(campaign.collection_details.mint_price || '').trim()
      }
    : {};
  const overview = rawOverview || (isNftRaffleType(campaignType) ? buildCollectionDetailsDescription(collectionDetails) : '');
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
  const commentLinks = Array.isArray(campaign.comment_links)
    ? campaign.comment_links
        .map((link) => String(link || '').trim())
        .filter(Boolean)
        .slice(0, 2)
    : [];
  const engagementLinks = Array.isArray(campaign.engagement_links)
    ? campaign.engagement_links
        .map((link) => String(link || '').trim())
        .filter(Boolean)
        .slice(0, 2)
    : [];
  const telegramTasks = isNftRaffleType(campaignType)
    ? normalizeTelegramTasks(campaign.telegram_tasks)
    : [];

  if (!title) throw Object.assign(new Error('Campaign title is required'), { status: 400 });
  if (!goal) throw Object.assign(new Error('Campaign goal is required'), { status: 400 });
  if (!overview) throw Object.assign(new Error('Campaign brief is required'), { status: 400 });
  if (budget < 0) throw Object.assign(new Error('Total WL must be a positive number'), { status: 400 });
  if (totalGtd < 0) throw Object.assign(new Error('Total GTD must be a positive number'), { status: 400 });
  if (totalFcfs < 0) throw Object.assign(new Error('Total FCFS must be a positive number'), { status: 400 });
  if (allocationType === 'wl' && budget <= 0) throw Object.assign(new Error('Total WL is required when WL is selected'), { status: 400 });
  if (allocationType === 'gtd' && totalGtd <= 0) throw Object.assign(new Error('Total GTD is required when GTD is selected'), { status: 400 });
  if (allocationType === 'fcfs' && totalFcfs <= 0) throw Object.assign(new Error('Total FCFS is required when FCFS is selected'), { status: 400 });
  const selectedAllocationTotal = allocationType === 'gtd'
    ? totalGtd
    : allocationType === 'fcfs'
      ? totalFcfs
      : budget;
  const nftMetadata = {
    nft: true,
    image_url: imageUrl,
    background_image_url: backgroundImageUrl,
    allocation_type: allocationType,
    total_gtd: totalGtd,
    total_fcfs: totalFcfs,
    max_creators: maxCreators,
    max_content_submissions: maxContentSubmissions,
    follow_accounts: Array.from(new Set(followAccounts)),
    retweet_links: Array.from(new Set(retweetLinks)),
    comment_links: Array.from(new Set(commentLinks)),
    engagement_links: Array.from(new Set(engagementLinks)),
    telegram_tasks: telegramTasks,
    collection_details: collectionDetails
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
    budget: selectedAllocationTotal,
    platform_fee: 0,
    net_budget: selectedAllocationTotal,
    status: 'draft',
    start_date: campaign.start_date || null,
    end_date: campaign.end_date || null,
    brand_name: brandProfile.company_name || 'AtlasReach NFT Campaigns',
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
    allocation_type: ['gtd', 'fcfs'].includes(metadata.allocation_type) ? metadata.allocation_type : 'wl',
    total_gtd: metadata.total_gtd ?? null,
    total_fcfs: metadata.total_fcfs ?? null,
    max_creators: metadata.max_creators ?? null,
    max_content_submissions: metadata.max_content_submissions ?? null,
    follow_accounts: Array.isArray(metadata.follow_accounts) ? metadata.follow_accounts : [],
    retweet_links: Array.isArray(metadata.retweet_links) ? metadata.retweet_links : [],
    comment_links: Array.isArray(metadata.comment_links) ? metadata.comment_links : [],
    engagement_links: Array.isArray(metadata.engagement_links) ? metadata.engagement_links : [],
    telegram_tasks: normalizeTelegramTasks(metadata.telegram_tasks),
    collection_details: metadata.collection_details && typeof metadata.collection_details === 'object' ? metadata.collection_details : {},
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
    additional_requirements: normalizeAdditionalRequirements(draft.additional_requirements),
    budget: normalizedBudget,
    platform_fee: normalizedPlatformFee,
    net_budget: normalizedNetBudget,
    start_date: draft.start_date || null,
    end_date: draft.end_date || null,
    owner_id: userId,
    status: 'draft'
  };
}

function isMissingCampaignColumnError(error, column) {
  const message = String(error?.message || error?.details || error?.hint || '').toLowerCase();
  return message.includes(column.toLowerCase()) && (
    message.includes('schema cache') ||
    message.includes('could not find') ||
    message.includes('does not exist') ||
    message.includes('column')
  );
}

function usesTelegramCampaignRequirements(payload) {
  return normalizeAdditionalRequirements(payload?.additional_requirements).telegram_enabled;
}

function missingAdditionalRequirementsError() {
  return Object.assign(
    new Error('Database migration required: apply telegram_group_tasks.sql so campaigns.additional_requirements exists before enabling Telegram campaign requirements.'),
    { status: 500 }
  );
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

async function awardNftCampaignCompletionPoints(creatorId, campaignId) {
  if (!creatorId || !campaignId) return { awarded: false, reason: 'missing_nft_completion' };
  return awardActivityPoints(creatorId, 5, `nft_campaign_completed:${campaignId}`);
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

async function verifySorsaComment(tweetLink, username) {
  const params = new URLSearchParams({
    tweet_link: tweetLink,
    username
  });
  const result = await callSorsa(`/check-comment?${params.toString()}`);
  return result?.commented === true;
}

async function verifySorsaRetweet(tweetLink, username) {
  let nextCursor = null;
  for (let page = 0; page < 5; page += 1) {
    const retweetResult = await callSorsa('/check-retweet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tweet_link: tweetLink,
        username,
        ...(nextCursor ? { next_cursor: nextCursor } : {})
      })
    });

    if (retweetResult?.retweet === true) return true;
    if (!retweetResult?.next_cursor) break;
    nextCursor = retweetResult.next_cursor;
  }
  return false;
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
    const retryAfter = body?.parameters?.retry_after ? Number(body.parameters.retry_after) : null;
    const status = response.status === 429 ? 429 : 502;
    throw Object.assign(new Error(body?.description || 'Telegram request failed'), {
      status,
      telegramStatus: response.status,
      retryAfter
    });
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

async function sendTelegramDocument(chatId, filename, content, caption = '', options = {}) {
  const form = new FormData();
  form.append('chat_id', chatId);
  if (options.message_thread_id) {
    form.append('message_thread_id', String(options.message_thread_id));
  }
  if (options.reply_to_message_id) {
    form.append('reply_to_message_id', String(options.reply_to_message_id));
  }
  form.append('document', new Blob([content], { type: 'text/csv;charset=utf-8' }), filename);
  if (caption) {
    form.append('caption', caption);
    form.append('parse_mode', 'HTML');
  }
  if (options.reply_markup) {
    form.append('reply_markup', JSON.stringify(options.reply_markup));
  }

  return telegramRequest('sendDocument', form);
}

async function editTelegramMessageCaption(chatId, messageId, caption, options = {}) {
  return telegramRequest('editMessageCaption', {
    chat_id: chatId,
    message_id: messageId,
    caption,
    parse_mode: 'HTML',
    ...options
  });
}

async function answerTelegramCallbackQuery(callbackQueryId, text = '') {
  return telegramRequest('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text
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

  return telegramRequest('sendPhoto', form);
}

function normalizeTelegramSupergroupChatId(chatId) {
  const value = String(chatId || '').trim();
  if (/^100\d{8,}$/.test(value)) return `-${value}`;
  return value;
}

function parseTelegramThreadId(value, fallback = null) {
  const raw = String(value ?? '').trim();
  const firstCandidate = raw.split(/[,\s]+/).find(Boolean);
  const parsed = Number(firstCandidate || fallback);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function telegramMembershipCacheKey(chatId, userId) {
  return `${telegramTaskKey(chatId)}:${telegramTaskKey(userId)}`;
}

function mapTelegramVerificationError(error, chatId) {
  const description = String(error?.message || '');
  if (error?.status === 429) {
    const suffix = error.retryAfter ? ` Try again in ${error.retryAfter} seconds.` : ' Try again shortly.';
    return Object.assign(new Error(`Telegram rate limit reached.${suffix}`), { status: 429 });
  }
  if (/PARTICIPANT_ID_INVALID|user not found|member not found|participant not found/i.test(description)) {
    return Object.assign(new Error("You haven't joined the group yet"), { status: 403 });
  }
  if (/chat not found/i.test(description)) {
    return Object.assign(new Error(`Telegram chat ${chatId} was not found. Add the bot to the group and refresh the task.`), { status: 404 });
  }
  if (/not enough rights|not a member|bot is not a member|forbidden/i.test(description)) {
    return Object.assign(new Error('The Telegram bot is not an admin in this group or cannot inspect members.'), { status: 403 });
  }
  return Object.assign(new Error(description || 'Telegram membership could not be verified'), { status: error?.status || 502 });
}

function parsePublicTelegramGroupReference(value) {
  const raw = String(value || '').trim();
  if (!raw) throw Object.assign(new Error('Enter a public Telegram group link or username'), { status: 400 });
  if (/^-?\d+$/.test(raw)) {
    throw Object.assign(new Error('Use a public Telegram group link or @username, not a private chat ID'), { status: 400 });
  }
  if (/t\.me\/(\+|joinchat\/)/i.test(raw)) {
    throw Object.assign(new Error('Private Telegram invite links are not supported. The group must be public.'), { status: 400 });
  }

  const match = raw.match(/(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me)\/([A-Za-z0-9_]+)/i);
  const username = (match ? match[1] : raw.replace(/^@/, '')).split(/[/?#]/)[0].trim();
  if (!/^[A-Za-z0-9_]{5,}$/.test(username)) {
    throw Object.assign(new Error('Enter a valid public Telegram group username or t.me link'), { status: 400 });
  }
  return {
    username,
    chatRef: `@${username}`,
    publicLink: `https://t.me/${username}`
  };
}

async function verifyBrandTelegramGroupSetup(brandProfileId, groupLink) {
  const group = parsePublicTelegramGroupReference(groupLink);
  let chat;
  try {
    chat = await telegramRequest('getChat', { chat_id: group.chatRef });
  } catch (error) {
    throw mapTelegramVerificationError(error, group.chatRef);
  }

  if (!['group', 'supergroup'].includes(String(chat?.type || '').toLowerCase())) {
    throw Object.assign(new Error('Connect a public Telegram group. Channels are not supported for brand join tasks.'), { status: 400 });
  }

  let botMember;
  try {
    botMember = await telegramRequest('getChatMember', {
      chat_id: chat.id,
      user_id: env.TELEGRAM_BOT_TOKEN.split(':')[0]
    });
  } catch (error) {
    throw mapTelegramVerificationError(error, String(chat?.id || group.chatRef));
  }

  const config = await upsertTelegramGroupConfigFromChatMember(chat, botMember, null, {
    brand_profile_id: brandProfileId,
    public_link: group.publicLink
  });
  if (config?.bot_permission_status !== 'configured') {
    throw Object.assign(new Error('The AtlasReach bot must be an admin in this Telegram group.'), { status: 403 });
  }
  return config;
}

async function verifyAdminTelegramGroupSetup(groupLink) {
  const group = parsePublicTelegramGroupReference(groupLink);
  let chat;
  try {
    chat = await telegramRequest('getChat', { chat_id: group.chatRef });
  } catch (error) {
    throw mapTelegramVerificationError(error, group.chatRef);
  }

  if (!['group', 'supergroup'].includes(String(chat?.type || '').toLowerCase())) {
    throw Object.assign(new Error('Connect a public Telegram group. Channels are not supported for raffle join tasks.'), { status: 400 });
  }

  let botMember;
  try {
    botMember = await telegramRequest('getChatMember', {
      chat_id: chat.id,
      user_id: env.TELEGRAM_BOT_TOKEN.split(':')[0]
    });
  } catch (error) {
    throw mapTelegramVerificationError(error, String(chat?.id || group.chatRef));
  }

  const config = await upsertTelegramGroupConfigFromChatMember(chat, botMember, null, {
    public_link: group.publicLink
  });
  if (config?.bot_permission_status !== 'configured') {
    throw Object.assign(new Error('The AtlasReach bot must be an admin in this Telegram group.'), { status: 403 });
  }
  return config;
}

async function verifyTelegramChatConfigured(chatId) {
  if (!env.TELEGRAM_BOT_TOKEN) {
    throw Object.assign(new Error('Telegram bot is not configured'), { status: 500 });
  }
  const [configMap, botMember] = await Promise.all([
    getTelegramGroupConfigMap([chatId]),
    telegramRequest('getChatMember', {
      chat_id: chatId,
      user_id: env.TELEGRAM_BOT_TOKEN.split(':')[0]
    }).catch((error) => {
      throw mapTelegramVerificationError(error, chatId);
    })
  ]);
  const existing = configMap.get(String(chatId));
  const chat = {
    id: chatId,
    type: existing?.chat_type || null,
    title: existing?.title || null
  };
  const config = await upsertTelegramGroupConfigFromChatMember(chat, botMember);
  if (config?.bot_permission_status !== 'configured') {
    throw Object.assign(new Error('The Telegram bot must be an admin in this group before this task can be verified.'), { status: 403 });
  }
  return config;
}

async function verifyTelegramGroupMembership(chatId, userId) {
  const key = telegramMembershipCacheKey(chatId, userId);
  const cached = telegramMembershipCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.result;

  await verifyTelegramChatConfigured(chatId);

  let member;
  try {
    member = await telegramRequest('getChatMember', {
      chat_id: chatId,
      user_id: userId
    });
  } catch (error) {
    throw mapTelegramVerificationError(error, chatId);
  }

  const status = String(member?.status || '').toLowerCase();
  const verified = ['creator', 'administrator', 'member'].includes(status);
  const result = {
    verified,
    status,
    member
  };
  telegramMembershipCache.set(key, {
    expiresAt: Date.now() + telegramMembershipCacheTtlMs,
    result
  });
  return result;
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

function getCampaignShortCode(id) {
  return String(id || '').replace(/-/g, '').slice(0, 16).toLowerCase();
}

function slugifyCampaignTitle(title) {
  return String(title || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getNftCampaignSlug(campaign) {
  const metadata = parseCampaignMetadata(campaign);
  const allocationType = ['gtd', 'fcfs'].includes(campaign?.allocation_type || metadata.allocation_type)
    ? String(campaign?.allocation_type || metadata.allocation_type).toUpperCase()
    : 'WL';
  const titleSlug = slugifyCampaignTitle(stripNftAllocationLabel(campaign?.title || ''));
  return titleSlug ? `${titleSlug}-${allocationType}` : getCampaignShortCode(campaign?.id);
}

function getCreatorCampaignUrl(campaign) {
  if (!env.FRONTEND_URL || !campaign?.id) return null;
  const metadata = parseCampaignMetadata(campaign);
  const isNftCampaign = metadata.is_nft_campaign || campaign.campaign_type === 'raffle' || campaign.campaign_type === 'content';
  if (isNftCampaign) {
    return `${env.FRONTEND_URL.replace(/\/$/, '')}/creator/nft-campaigns/${encodeURIComponent(getNftCampaignSlug(campaign))}`;
  }
  return `${env.FRONTEND_URL.replace(/\/$/, '')}/creator/campaigns/${encodeURIComponent(campaign.id)}`;
}

function getAdminNftCampaignUrl(campaign) {
  if (!env.FRONTEND_URL || !campaign?.id) return null;
  const baseUrl = env.FRONTEND_URL.replace(/\/$/, '');
  const path = isNftContentType(campaign.campaign_type)
    ? `/admin/nft-submissions/${encodeURIComponent(campaign.id)}`
    : `/admin/raffles/${encodeURIComponent(campaign.id)}`;
  return `${baseUrl}${path}`;
}

function buildCampaignNotification(campaign, label = 'New campaign') {
  const title = escapeTelegramHtml(campaign.title || 'Campaign');
  const brand = escapeTelegramHtml(campaign.brand_profile?.company_name || campaign.brand_name || 'AtlasReach brand');
  const budget = Number(campaign.budget || 0).toLocaleString();
  const categories = Array.isArray(campaign.categories) && campaign.categories.length
    ? `\nCategories: ${escapeTelegramHtml(campaign.categories.join(', '))}`
    : '';
  const campaignUrl = getCampaignUrl(campaign);
  const action = campaignUrl
    ? `\n\n<a href="${escapeTelegramHtml(campaignUrl)}">View Campaign</a>`
    : '\n\nOpen AtlasReach to view details.';

  return `<b>${escapeTelegramHtml(label).toUpperCase()}</b>\n\nA new creator opportunity is now live on AtlasReach.\n\nCampaign: <b>${title}</b>\nBrand: ${brand}\nReward Pool: ${budget} USDC${categories}\n\nOpen the campaign page to read the brief, review the requirements, and join if it fits your profile.${action}`;
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

  return `<b>The draw is done</b>\n\n<b>${title}</b> has been finalized.\n\nToday's raffle winners:\n${fallbackWinnerLines}`;
}

async function notifyRaffleWinnersGroup(campaign, winners) {
  if (!env.TELEGRAM_RAFFLE_GROUP_CHAT_ID) {
    return { sent: 0, skipped: 1, reason: 'missing_group_chat_id' };
  }

  const raffleGroupChatId = normalizeTelegramSupergroupChatId(env.TELEGRAM_RAFFLE_GROUP_CHAT_ID);
  const caption = buildRaffleWinnersAnnouncement(campaign, winners);
  const imageUrl = campaign?.background_image_url || campaign?.image_url || null;
  const threadId = parseTelegramThreadId(env.TELEGRAM_RAFFLE_GROUP_THREAD_ID, 6);
  const topicOptions = threadId ? { message_thread_id: threadId } : {};
  if (imageUrl) {
    try {
      await sendTelegramPhoto(raffleGroupChatId, imageUrl, caption, null, topicOptions);
      return { sent: 1, skipped: 0, usedImage: true, threadId };
    } catch (error) {
      console.warn('Telegram raffle winners image failed, sending text fallback:', error.message || error);
    }
  }

  await sendTelegramMessage(raffleGroupChatId, caption, topicOptions);
  return { sent: 1, skipped: 0, threadId };
}

function buildAdminNftLaunchAnnouncement(campaign) {
  const campaignTitle = escapeTelegramHtml(stripNftAllocationLabel(campaign?.title) || campaign?.title || 'NFT campaign');
  const campaignUrl = getCreatorCampaignUrl(campaign);
  const allocationType = ['gtd', 'fcfs'].includes(campaign?.allocation_type) ? campaign.allocation_type : 'wl';
  const allocationLabel = allocationType.toUpperCase();
  const allocationSpots = Number(campaign?.budget || 0).toLocaleString();
  const action = campaignUrl ? `\n\n${escapeTelegramHtml(campaignUrl)}` : '';

  return `<b>AtlasReach X ${campaignTitle}</b>\n\n${allocationSpots} ${allocationLabel} Spots${action}`;
}

async function notifyAdminNftCampaignLaunch(campaign) {
  if (!env.TELEGRAM_RAFFLE_GROUP_CHAT_ID) {
    return { sent: 0, skipped: 1, reason: 'missing_group_chat_id' };
  }

  const chatId = normalizeTelegramSupergroupChatId(env.TELEGRAM_RAFFLE_GROUP_CHAT_ID);
  const threadId = parseTelegramThreadId(env.TELEGRAM_NFT_LAUNCH_GROUP_THREAD_ID, 3);
  const topicOptions = threadId ? { message_thread_id: threadId } : {};
  const caption = buildAdminNftLaunchAnnouncement(campaign);
  const imageUrl = campaign?.background_image_url || null;
  const campaignUrl = getCreatorCampaignUrl(campaign);

  if (imageUrl) {
    try {
      await sendTelegramPhoto(chatId, imageUrl, caption, campaignUrl, topicOptions);
      return { sent: 1, skipped: 0, usedImage: true, threadId };
    } catch (error) {
      console.warn('Telegram admin NFT launch image failed, sending text fallback:', error.message || error);
    }
  }

  await sendTelegramMessage(chatId, caption, topicOptions);
  return { sent: 1, skipped: 0, threadId };
}

function getNftCampaignEndAdminTelegramIds() {
  return [6160210209, 7229118404, 1168423479];
}

function slugifyCsvFilenamePart(value, fallback = 'nft-raffle') {
  const slug = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || fallback;
}

function escapeCsvValue(value) {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildCsv(headers, rows) {
  const lines = [
    headers.map(escapeCsvValue).join(','),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(','))
  ];
  return `${lines.join('\n')}\n`;
}

function buildRaffleWinnerCsvFiles(campaign, winners) {
  const filenameBase = slugifyCsvFilenamePart(campaign?.title || campaign?.id || 'nft-raffle');
  const walletRows = (winners || []).map((winner) => ({
    wallet_address: winner?.wallet_address || ''
  }));

  return [
    {
      filename: `${filenameBase}-winner-wallets.csv`,
      content: buildCsv(['wallet_address'], walletRows)
    }
  ];
}

function getRaffleWalletSubmissionCaption(campaign, submitted = false) {
  const title = escapeTelegramHtml(campaign?.title || 'NFT campaign');
  return `<b>NFT raffle finalized</b>\n${title}\n\nWallets submitted: <b>${submitted ? '&#128994; Yes' : '&#128308; No'}</b>`;
}

function getRaffleWalletSubmittedKeyboard(campaignId, submitted = false) {
  if (submitted || !campaignId) return undefined;
  return {
    inline_keyboard: [[
      {
        text: 'Submitted',
        callback_data: `nftws:${campaignId}`
      }
    ]]
  };
}

async function notifyAdminNftRaffleWinnerCsvs(campaign, winners) {
  const adminIds = getNftCampaignEndAdminTelegramIds();
  const files = buildRaffleWinnerCsvFiles(campaign, winners);
  const imageCaption = `<b>NFT raffle finalized</b>\n${escapeTelegramHtml(campaign?.title || 'NFT campaign')}`;
  const caption = getRaffleWalletSubmissionCaption(campaign, false);
  const replyMarkup = getRaffleWalletSubmittedKeyboard(campaign?.id, false);
  const imageUrl = campaign?.background_image_url || campaign?.image_url || null;
  const summary = { sent: 0, imageSent: 0, failed: 0, skipped: 0, messageRefs: [] };

  if (!adminIds.length) {
    return { ...summary, skipped: files.length, reason: 'no_admin_recipients' };
  }

  for (const adminId of adminIds) {
    let imageMessageId = null;
    if (imageUrl) {
      try {
        const imageMessage = await sendTelegramPhoto(adminId, imageUrl, imageCaption);
        imageMessageId = imageMessage?.message_id || null;
        summary.imageSent += 1;
      } catch (error) {
        summary.failed += 1;
        console.warn(`Failed to send raffle winner image to admin ${adminId}:`, error.message || error);
      }
    }

    for (const file of files) {
      try {
        const replyOptions = {
          ...(imageMessageId ? { reply_to_message_id: imageMessageId } : {}),
          ...(replyMarkup ? { reply_markup: replyMarkup } : {})
        };
        const message = await sendTelegramDocument(adminId, file.filename, file.content, caption, replyOptions);
        summary.sent += 1;
        if (message?.chat?.id && message?.message_id) {
          summary.messageRefs.push({
            chat_id: String(message.chat.id),
            message_id: message.message_id,
            filename: file.filename
          });
        }
      } catch (error) {
        summary.failed += 1;
        console.warn(`Failed to send raffle winner CSV ${file.filename} to admin ${adminId}:`, error.message || error);
      }
    }
  }

  return summary;
}

async function notifySubmissionDecision(submission) {
  if (!['approved', 'rejected'].includes(submission?.status)) {
    return { sent: 0, skipped: 1 };
  }

  const creator = submission.creator_profile;
  if (!creator?.telegram_chat_id || !creator.notify_campaign_updates) {
    return { sent: 0, skipped: 1 };
  }

  const campaignTitle = submission.campaign?.title || 'AtlasReach campaign';
  const decision = submission.status === 'approved' ? 'approved' : 'rejected';
  const feedbackLine = submission.feedback ? `\nFeedback: ${escapeTelegramHtml(submission.feedback)}` : '';

  await sendTelegramMessage(
    creator.telegram_chat_id,
    `<b>Submission ${decision}</b>\n${escapeTelegramHtml(campaignTitle)}${feedbackLine}\nOpen AtlasReach to review details.`
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

async function syncCreatorProfileFromSorsa(profile, source = 'sorsa_profile_sync') {
  const previousScore = profile.sorsa_score == null ? null : Math.round(Number(profile.sorsa_score || 0));
  const xHandle = cleanHandle(profile.x_handle);

  if (!env.SORSA_PROFILE_SYNC_ENABLED) {
    console.log('Sorsa profile sync skipped; keeping stored creator score:', {
      creatorId: profile.id,
      xHandle: xHandle || null,
      storedScore: previousScore,
      source,
      reason: 'sorsa_profile_sync_disabled'
    });
    return {
      synced: false,
      frozen: true,
      reason: 'sorsa_profile_sync_disabled',
      previousScore,
      newScore: previousScore
    };
  }

  if (!xHandle) return { synced: false, reason: 'missing_x_handle' };

  const startedAt = new Date();
  console.log('Sorsa profile sync started:', {
    creatorId: profile.id,
    xHandle,
    previousScore,
    source,
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

  let score = Math.round(Number(scoreData?.score || 0));
  const followerCount = stats?.followers_count ?? 0;

  // Sorsa's /score endpoint has been observed to return a transient, wrong value for
  // accounts with a small follower graph (a fresh read of 65 that settled to 0 minutes
  // later with no profile change). Re-check once before trusting a low-follower score.
  const LOW_FOLLOWER_RECHECK_THRESHOLD = 100;
  if (followerCount < LOW_FOLLOWER_RECHECK_THRESHOLD) {
    let confirmScore = null;
    try {
      const confirmScoreData = await callSorsa(`/score?username=${encodeURIComponent(xHandle)}`);
      confirmScore = Math.round(Number(confirmScoreData?.score || 0));
    } catch (error) {
      confirmScore = null;
    }

    if (confirmScore === null || confirmScore !== score) {
      console.warn('Sorsa score unstable on re-check, keeping previous score:', {
        creatorId: profile.id,
        xHandle,
        followerCount,
        firstRead: score,
        secondRead: confirmScore,
        previousScore
      });
      score = previousScore ?? 0;
    }
  }

  const finalLocation = stats?.location || about?.country || null;
  const syncedAt = new Date().toISOString();

  const { data: scoreHistoryRows, error: scoreHistoryError } = await supabase.rpc(
    'update_creator_sorsa_score_with_history',
    {
      p_creator_id: profile.id,
      p_new_score: score,
      p_source: source,
      p_synced_at: syncedAt,
      p_metadata: {
        xHandle,
        followersCount: stats?.followers_count ?? null,
        displayName: stats?.display_name ?? null,
        reason: 'sorsa_profile_sync'
      }
    }
  );
  if (scoreHistoryError) {
    console.warn('Sorsa profile sync failed during score history write:', {
      creatorId: profile.id,
      xHandle,
      previousScore,
      newScore: score,
      source,
      error: scoreHistoryError.message || scoreHistoryError
    });
    throw scoreHistoryError;
  }

  const scoreHistory = Array.isArray(scoreHistoryRows) ? scoreHistoryRows[0] : null;
  const recordedPreviousScore = scoreHistory?.previous_score ?? previousScore;

  const { error } = await supabase
    .from('creator_profiles')
    .update({
      follower_count: stats?.followers_count ?? null,
      avatar_url: normalizeAvatarUrl(stats?.profile_image_url),
      bio: stats?.description ?? null,
      country: finalLocation,
      full_name: stats?.display_name ?? null
    })
    .eq('id', profile.id);
  if (error) {
    console.warn('Sorsa profile sync failed during profile update:', {
      creatorId: profile.id,
      xHandle,
      previousScore: recordedPreviousScore,
      newScore: score,
      source,
      error: error.message || error
    });
    throw error;
  }

  const durationMs = Date.now() - startedAt.getTime();
  const scoreDelta = recordedPreviousScore == null ? null : score - recordedPreviousScore;
  if (scoreDelta != null && Math.abs(scoreDelta) >= 50) {
    console.warn('Sorsa profile score changed sharply:', {
      creatorId: profile.id,
      xHandle,
      previousScore: recordedPreviousScore,
      newScore: score,
      delta: scoreDelta,
      source,
      syncedAt
    });
  }

  console.log('Sorsa profile sync completed:', {
    creatorId: profile.id,
    xHandle,
    previousScore: recordedPreviousScore,
    newScore: score,
    delta: scoreDelta,
    followersCount: stats?.followers_count ?? null,
    source,
    scoreHistoryId: scoreHistory?.history_id ?? null,
    syncedAt,
    durationMs
  });

  return { synced: true, previousScore: recordedPreviousScore, newScore: score, scoreHistoryId: scoreHistory?.history_id ?? null };
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
          const result = await syncCreatorProfileFromSorsa(profile, 'weekly_sorsa_profile_sync');
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

  if (!env.SORSA_PROFILE_SYNC_ENABLED) {
    console.log('Weekly Sorsa profile sync is frozen; stored creator scores will be kept.');
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
  const title = escapeTelegramHtml(campaign?.title || 'AtlasReach campaign');
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
    : '\n\nOpen AtlasReach to review campaign details.';

  return `<b>Submission window closed</b>\n\nThe 24 hour creator submission window for <b>${title}</b> has ended.\n\nNo eligible content submission was recorded from your account before the window closed.\n\nWindow ended: ${escapeTelegramHtml(deadline)}${action}`;
}

function buildJoinSubmissionReminder(campaign, windowEndsAt) {
  const title = escapeTelegramHtml(campaign?.title || 'AtlasReach campaign');
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
    : '\n\nOpen AtlasReach to view the campaign.';

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
    `<b>Payment sent</b>\n${escapeTelegramHtml(campaignTitle || 'AtlasReach campaign')}\nAmount: ${escapeTelegramHtml(amount)} USDC\nOpen AtlasReach to review your wallet history.`
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

let nftCampaignEndPolling = false;

function parseCampaignLanguageMetadata(language) {
  try {
    return language ? JSON.parse(language) : {};
  } catch {
    return {};
  }
}

function isRaffleFinalizedMetadata(metadata) {
  return Boolean(
    (Array.isArray(metadata?.raffle_results) && metadata.raffle_results.length > 0)
    || metadata?.raffle_finalization_result === 'no_eligible_participants'
  );
}

async function claimNftRaffleFinalization(campaignId, source = 'manual') {
  const { data, error } = await supabase.rpc('claim_nft_raffle_finalization', {
    p_campaign_id: campaignId,
    p_source: source,
    p_claim_timeout_minutes: 15
  });
  if (error) {
    const message = /claim_nft_raffle_finalization/i.test(error.message || '')
      ? 'Raffle finalization claim RPC is not installed. Apply nft_raffle_finalization_claim.sql before finalizing raffles.'
      : error.message;
    throw Object.assign(new Error(message), { status: 500 });
  }

  const claimedCampaign = Array.isArray(data) ? data[0] : data;
  if (claimedCampaign) {
    return { claimed: true, campaign: claimedCampaign };
  }

  const { data: existingCampaign, error: lookupError } = await supabase
    .from('campaigns')
    .select('id, title, campaign_type, budget, language, status, end_date, start_date')
    .eq('id', campaignId)
    .in('campaign_type', ['raffle', 'fcfs'])
    .single();
  if (lookupError || !existingCampaign) {
    throw Object.assign(new Error('Raffle campaign not found'), { status: 404 });
  }

  const metadata = parseCampaignMetadata(existingCampaign);
  if (isRaffleFinalizedMetadata(metadata)) {
    return { claimed: false, alreadyFinalized: true, campaign: existingCampaign };
  }

  throw Object.assign(new Error('Raffle finalization is already in progress'), { status: 409 });
}

async function handleRaffleWalletSubmittedCallback(callbackQuery) {
  const callbackId = callbackQuery?.id;
  const fromId = callbackQuery?.from?.id ? Number(callbackQuery.from.id) : null;
  const data = String(callbackQuery?.data || '');
  const campaignId = data.startsWith('nftws:') ? data.slice('nftws:'.length).trim() : '';
  const allowedAdminIds = getNftCampaignEndAdminTelegramIds().map(Number);

  if (!allowedAdminIds.includes(fromId)) {
    if (callbackId) await answerTelegramCallbackQuery(callbackId, 'Not authorized').catch(() => {});
    return;
  }
  if (!campaignId) {
    if (callbackId) await answerTelegramCallbackQuery(callbackId, 'Missing campaign').catch(() => {});
    return;
  }

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('id, title, campaign_type, language')
    .eq('id', campaignId)
    .in('campaign_type', ['raffle', 'fcfs'])
    .single();
  if (error || !campaign) {
    if (callbackId) await answerTelegramCallbackQuery(callbackId, 'Campaign not found').catch(() => {});
    return;
  }

  const metadata = parseCampaignMetadata(campaign);
  const submittedAt = metadata.raffle_wallets_submitted_at || new Date().toISOString();
  const nextMetadata = {
    ...metadata,
    raffle_wallets_submitted: true,
    raffle_wallets_submitted_at: submittedAt,
    raffle_wallets_submitted_by_telegram_id: fromId
  };

  const { error: updateError } = await supabase
    .from('campaigns')
    .update({ language: JSON.stringify(nextMetadata) })
    .eq('id', campaignId);
  if (updateError) {
    console.warn(`Failed to mark raffle wallets submitted for campaign ${campaignId}:`, updateError.message || updateError);
    if (callbackId) await answerTelegramCallbackQuery(callbackId, 'Could not update status').catch(() => {});
    return;
  }

  const refs = Array.isArray(metadata.raffle_admin_csv_message_refs)
    ? metadata.raffle_admin_csv_message_refs
    : [];
  const clickedMessageRef = callbackQuery?.message?.chat?.id && callbackQuery?.message?.message_id
    ? {
        chat_id: String(callbackQuery.message.chat.id),
        message_id: callbackQuery.message.message_id
      }
    : null;
  const editableRefs = [...refs];
  if (clickedMessageRef && !editableRefs.some((ref) => String(ref?.chat_id) === clickedMessageRef.chat_id && Number(ref?.message_id) === clickedMessageRef.message_id)) {
    editableRefs.push(clickedMessageRef);
  }
  const caption = getRaffleWalletSubmissionCaption(campaign, true);
  let edited = 0;
  let failed = 0;
  for (const ref of editableRefs) {
    if (!ref?.chat_id || !ref?.message_id) continue;
    try {
      await editTelegramMessageCaption(ref.chat_id, ref.message_id, caption, { reply_markup: { inline_keyboard: [] } });
      edited += 1;
    } catch (editError) {
      failed += 1;
      console.warn(`Failed to update raffle wallet submission CSV caption for campaign ${campaignId}:`, editError.message || editError);
    }
  }
  console.log(`Raffle wallet submission callback result for campaign ${campaignId}:`, {
    submittedByTelegramId: fromId,
    edited,
    failed,
    refsConsidered: editableRefs.length
  });

  if (callbackId) {
    await answerTelegramCallbackQuery(
      callbackId,
      failed > 0 ? `Marked submitted. Updated ${edited} messages, ${failed} failed.` : 'Wallets marked submitted.'
    ).catch(() => {});
  }
}

async function finalizeNftRaffleCampaign(campaignId, options = {}) {
  const source = options.source || 'manual';
  const claim = await claimNftRaffleFinalization(campaignId, source);
  const campaign = claim.campaign;

  const metadata = parseCampaignMetadata(campaign);
  const raffleCampaign = withNftCampaignMetadata(campaign);
  if (claim.alreadyFinalized || isRaffleFinalizedMetadata(metadata)) {
    return {
      campaign: raffleCampaign,
      winners: Array.isArray(metadata.raffle_results) ? metadata.raffle_results : [],
      finalized_at: metadata.raffle_finalized_at || null,
      alreadyFinalized: true,
      telegram: { skipped: 1, reason: 'already_finalized' },
      adminCsv: { skipped: 1, reason: 'already_finalized' },
      activityPoints: { awarded: 0, skipped: 0 },
      referrals: { qualified: 0, skipped: 0 }
    };
  }

  const { data: participants, error: participantError } = await supabase
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
    .neq('status', 'rejected');
  if (participantError) throw Object.assign(new Error(participantError.message), { status: 500 });

  const allocationType = raffleCampaign.allocation_type === 'gtd' || raffleCampaign.allocation_type === 'fcfs'
    ? raffleCampaign.allocation_type
    : 'wl';
  const allocationTotal = Math.floor(Number(
    allocationType === 'gtd'
      ? raffleCampaign.total_gtd || 0
      : allocationType === 'fcfs'
        ? raffleCampaign.total_fcfs || 0
        : campaign.budget || 0
  ));
  const allocationLabel = allocationType === 'gtd' ? 'Total GTD' : allocationType === 'fcfs' ? 'Total FCFS' : 'Total WL';
  if (!Number.isFinite(allocationTotal) || allocationTotal < 1) {
    throw Object.assign(new Error(`${allocationLabel} must be at least 1 before finalizing this raffle`), { status: 400 });
  }

  const eligibleParticipants = (participants || []).filter((participant) => participant.creator_profile);
  if (eligibleParticipants.length === 0) {
    const finalizedAt = new Date().toISOString();
    const noWinnerMetadata = {
      ...metadata,
      raffle_results: [],
      raffle_finalized_at: finalizedAt,
      raffle_finalized_source: source,
      raffle_finalization_result: 'no_eligible_participants',
      end_notified: true
    };
    const { error: noWinnerUpdateError } = await supabase
      .from('campaigns')
      .update({
        status: 'completed',
        language: JSON.stringify(noWinnerMetadata)
      })
      .eq('id', campaignId);
    if (noWinnerUpdateError) throw Object.assign(new Error(noWinnerUpdateError.message), { status: 500 });

    return {
      campaign: {
        ...raffleCampaign,
        status: 'completed',
        language: JSON.stringify(noWinnerMetadata)
      },
      winners: [],
      finalized_at: finalizedAt,
      alreadyFinalized: false,
      noEligibleParticipants: true,
      telegram: { skipped: 1, reason: 'no_eligible_participants' },
      adminCsv: { skipped: 1, reason: 'no_eligible_participants' },
      activityPoints: { awarded: 0, skipped: 0 },
      referrals: { qualified: 0, skipped: 0 }
    };
  }

  const winners = pickRandomItems(eligibleParticipants, Math.min(allocationTotal, eligibleParticipants.length)).map((participant) => ({
    participant_id: participant.id,
    creator_id: participant.creator_id,
    name: participant.creator_profile?.full_name || participant.creator_profile?.x_handle || 'Creator',
    x_account: participant.creator_profile?.x_handle || '',
    wallet_address: participant.creator_profile?.wallet_address || '',
    telegram_username: participant.creator_profile?.telegram_username || ''
  }));
  const finalizedAt = new Date().toISOString();
  const nextMetadata = {
    ...metadata,
    raffle_results: winners,
    raffle_finalized_at: finalizedAt,
    raffle_finalized_source: source,
    end_notified: true
  };

  const { error: updateError } = await supabase
    .from('campaigns')
    .update({
      status: 'completed',
      language: JSON.stringify(nextMetadata)
    })
    .eq('id', campaignId);
  if (updateError) throw Object.assign(new Error(updateError.message), { status: 500 });

  const finalizedCampaign = {
    ...raffleCampaign,
    status: 'completed',
    language: JSON.stringify(nextMetadata)
  };
  const telegram = await notifyRaffleWinnersGroup(finalizedCampaign, winners).catch((error) => {
    console.warn(`Raffle winners Telegram group announcement failed for campaign ${campaignId}:`, error.message || error);
    return { sent: 0, skipped: 0, failed: 1 };
  });
  console.log(`Raffle winners Telegram group announcement result for campaign ${campaignId}:`, telegram);

  const adminCsv = await notifyAdminNftRaffleWinnerCsvs(finalizedCampaign, winners).catch((error) => {
    console.warn(`Raffle winners admin CSV notification failed for campaign ${campaignId}:`, error.message || error);
    return { sent: 0, skipped: 0, failed: 1 };
  });
  console.log(`Raffle winners admin CSV notification result for campaign ${campaignId}:`, adminCsv);

  if (Array.isArray(adminCsv.messageRefs) && adminCsv.messageRefs.length > 0) {
    const existingMessageRefs = Array.isArray(metadata.raffle_admin_csv_message_refs)
      ? metadata.raffle_admin_csv_message_refs
      : [];
    const mergedMessageRefs = [...existingMessageRefs];
    for (const ref of adminCsv.messageRefs) {
      if (!ref?.chat_id || !ref?.message_id) continue;
      const exists = mergedMessageRefs.some((existingRef) => (
        String(existingRef?.chat_id) === String(ref.chat_id)
        && Number(existingRef?.message_id) === Number(ref.message_id)
      ));
      if (!exists) mergedMessageRefs.push(ref);
    }
    const metadataWithAdminMessages = {
      ...nextMetadata,
      raffle_admin_csv_message_refs: mergedMessageRefs,
      raffle_wallets_submitted: Boolean(metadata.raffle_wallets_submitted)
    };
    const { error: messageRefUpdateError } = await supabase
      .from('campaigns')
      .update({ language: JSON.stringify(metadataWithAdminMessages) })
      .eq('id', campaignId);
    if (messageRefUpdateError) {
      console.warn(`Failed to store raffle admin CSV message refs for campaign ${campaignId}:`, messageRefUpdateError.message || messageRefUpdateError);
    } else {
      finalizedCampaign.language = JSON.stringify(metadataWithAdminMessages);
    }
  }

  const activityPoints = await Promise.all(
    eligibleParticipants.map((participant) => awardNftCampaignCompletionPoints(participant.creator_id, campaignId))
  );
  const referrals = await Promise.all(
    eligibleParticipants.map((participant) => qualifyReferralForCreator(participant.creator_id))
  );

  return {
    campaign: finalizedCampaign,
    winners,
    finalized_at: finalizedAt,
    alreadyFinalized: false,
    telegram,
    adminCsv,
    activityPoints: {
      awarded: activityPoints.filter((award) => award.awarded).length,
      skipped: activityPoints.filter((award) => !award.awarded).length
    },
    referrals: {
      qualified: referrals.filter((referral) => referral.qualified).length,
      skipped: referrals.filter((referral) => !referral.qualified).length
    }
  };
}

async function runNftCampaignEndNotifications() {
  if (nftCampaignEndPolling) return;
  nftCampaignEndPolling = true;
  const summary = { checked: 0, finalized: 0, alreadyFinalized: 0, notified: 0, sent: 0, csvSent: 0, skipped: 0, failed: 0, marked: 0 };
  try {
    const now = Date.now();
    const lookbackMinutes = Math.max(1, Number(process.env.NFT_CAMPAIGN_END_NOTIFICATION_LOOKBACK_MINUTES || 30));
    const endedAfter = new Date(now - lookbackMinutes * 60 * 1000).toISOString();
    const endedAtOrBefore = new Date(now).toISOString();
    const [
      { data: raffleCampaigns, error: raffleError },
      { data: notificationCampaigns, error: notificationError }
    ] = await Promise.all([
      supabase
        .from('campaigns')
        .select('id, title, status, end_date, language, campaign_type')
        .in('status', ['draft', 'live', 'completed'])
        .in('campaign_type', ['raffle', 'fcfs'])
        .lte('end_date', endedAtOrBefore)
        .order('end_date', { ascending: true })
        .limit(10),
      supabase
        .from('campaigns')
        .select('id, title, status, end_date, language, campaign_type')
        .in('status', ['draft', 'live', 'completed'])
        .in('campaign_type', ['content', 'all', 'nft'])
        .gte('end_date', endedAfter)
        .lte('end_date', endedAtOrBefore)
        .order('end_date', { ascending: true })
        .limit(10)
    ]);
      
    if (raffleError) throw raffleError;
    if (notificationError) throw notificationError;
    const campaigns = [...(raffleCampaigns || []), ...(notificationCampaigns || [])];
    
    for (const campaign of campaigns || []) {
      summary.checked += 1;
      const metadata = parseCampaignLanguageMetadata(campaign.language);
      const isRaffleCampaign = ['raffle', 'fcfs'].includes(campaign.campaign_type);

      if (isRaffleCampaign) {
        if (isRaffleFinalizedMetadata(metadata)) {
          summary.alreadyFinalized += 1;
          summary.skipped += 1;
          continue;
        }
        try {
          const result = await finalizeNftRaffleCampaign(campaign.id, { source: 'automatic' });
          if (result.alreadyFinalized) {
            summary.alreadyFinalized += 1;
            summary.skipped += 1;
            continue;
          }
          summary.finalized += 1;
          summary.sent += Number(result.telegram?.sent || 0);
          summary.csvSent += Number(result.adminCsv?.sent || 0);
          summary.failed += Number(result.telegram?.failed || 0) + Number(result.adminCsv?.failed || 0);
          if (result.noEligibleParticipants) summary.skipped += 1;
          summary.marked += 1;
        } catch (err) {
          summary.failed += 1;
          console.warn(`Failed to auto-finalize ended NFT raffle campaign ${campaign.id}:`, err.message || err);
        }
        continue;
      }

      if (metadata.end_notified) {
        summary.skipped += 1;
        continue;
      }

      const adminCampaignUrl = getAdminNftCampaignUrl(campaign);
      const adminCampaignLink = adminCampaignUrl
        ? `\n\n<a href="${escapeTelegramHtml(adminCampaignUrl)}">View admin page</a>`
        : '';
      const adminNotificationText = `<b>NFT Campaign Ended</b>\n\nThe admin created NFT campaign <b>${escapeTelegramHtml(campaign.title)}</b> has ended.${adminCampaignLink}`;

      let successCount = 0;
      for (const adminId of getNftCampaignEndAdminTelegramIds()) {
        await sendTelegramMessage(adminId, adminNotificationText).then(() => successCount++).catch((err) => {
          summary.failed += 1;
          console.warn(`Failed to send campaign end notification to admin ${adminId}:`, err.message || err);
        });
      }
      summary.sent += successCount;
      summary.notified += successCount > 0 ? 1 : 0;

      if (successCount > 0) {
        const { error: updateError } = await supabase
          .from('campaigns')
          .update({
             language: JSON.stringify({ ...metadata, end_notified: true })
          })
          .eq('id', campaign.id);
        if (updateError) throw updateError;
        summary.marked += 1;
      }
    }
    return summary;
  } finally {
    nftCampaignEndPolling = false;
  }
}

function scheduleNftCampaignEndNotifications() {
  const intervalMs = 60 * 1000;
  const run = async () => {
    try {
      const result = await runNftCampaignEndNotifications();
      if (result && (result.checked > 0 || result.sent > 0 || result.failed > 0)) {
        console.log('NFT campaign end notifications finished:', result);
      }
    } catch (e) {
      console.error('NFT campaign end notifications failed:', e);
    }
  };
  
  setTimeout(run, 15_000);
  setInterval(run, intervalMs);
  console.log(`NFT campaign end notifications scheduled every ${intervalMs / 1000}s.`);
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
    const scope = getAppSessionScope(req);
    logAuthEvent('app_session.create.attempt', {
      ...authRequestContext(req),
      appSessionScope: scope,
      bearerPresent: true
    });
    const user = await authenticateToken(token, {
      ...authRequestContext(req),
      bearerPresent: true,
      cookiePresent: Boolean(parseCookies(req)[getAppSessionCookieName(scope)]),
      appSessionScope: scope
    });
    const session = await createAppSession(user.id);
    setAppSessionCookie(res, session.token, scope);
    logAuthEvent('app_session.create.success', {
      ...authRequestContext(req),
      appSessionScope: scope,
      userId: user.id,
      expiresAt: session.expiresAt
    });
    return res.status(201).json({
      userId: user.id,
      expiresAt: session.expiresAt,
      maxAge: appSessionTtlSeconds
    });
  } catch (error) {
    const status = error.status || 500;
    logAuthEvent('app_session.create.failure', {
      ...authRequestContext(req),
      status,
      reason: error.message || 'Could not create app session',
      appSessionScope: getAppSessionScope(req),
      bearerPresent: Boolean(req.headers.authorization)
    });
    return res.status(status).json({ error: error.message || 'Could not create app session' });
  }
});

app.post('/auth/logout', async (req, res) => {
  try {
    const scope = getAppSessionScope(req);
    const revoked = await revokeCurrentAppSession(req);
    clearAppSessionCookie(res, scope);
    logAuthEvent('app_session.logout.success', {
      ...authRequestContext(req),
      appSessionScope: scope,
      cookiePresent: Boolean(parseCookies(req)[getAppSessionCookieName(scope)]),
      bearerPresent: Boolean(req.headers.authorization),
      revoked
    });
    return res.json({ ok: true });
  } catch (error) {
    const scope = getAppSessionScope(req);
    clearAppSessionCookie(res, scope);
    const status = error.status || 500;
    logAuthEvent('app_session.logout.failure', {
      ...authRequestContext(req),
      status,
      reason: error.message || 'Could not end app session',
      appSessionScope: scope,
      cookiePresent: Boolean(parseCookies(req)[getAppSessionCookieName(scope)]),
      bearerPresent: Boolean(req.headers.authorization)
    });
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
      allowed_updates: ['message', 'my_chat_member', 'callback_query']
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

    const chatMemberUpdate = req.body?.my_chat_member;
    if (chatMemberUpdate?.chat && chatMemberUpdate?.new_chat_member) {
      await upsertTelegramGroupConfigFromChatMember(
        chatMemberUpdate.chat,
        chatMemberUpdate.new_chat_member
      );
      return res.json({ ok: true });
    }

    const callbackQuery = req.body?.callback_query;
    if (callbackQuery?.data) {
      const callbackData = String(callbackQuery.data || '');
      if (callbackData.startsWith('nftws:')) {
        await handleRaffleWalletSubmittedCallback(callbackQuery);
        return res.json({ ok: true });
      }
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
      const { data: connectedProfile, error: connectedError } = await supabase
        .from('creator_profiles')
        .select('id')
        .eq('telegram_chat_id', chatId)
        .maybeSingle();
      if (connectedError) throw connectedError;
      if (connectedProfile) {
        await sendTelegramMessage(chatId, 'Telegram notifications are already connected for AtlasReach. You can manage notification types from Creator Settings.');
        return res.json({ ok: true });
      }
      await sendTelegramMessage(chatId, 'Send the Telegram connect code shown in AtlasReach Creator Settings.');
      return res.json({ ok: true });
    }

    const { data: profile, error } = await supabase
      .from('creator_profiles')
      .select('id, telegram_connect_expires_at')
      .eq('telegram_connect_code', connectCode)
      .maybeSingle();
    const expiresAt = profile?.telegram_connect_expires_at ? new Date(profile.telegram_connect_expires_at) : null;
    if (error || !profile || !expiresAt || expiresAt < new Date()) {
      await sendTelegramMessage(chatId, 'That AtlasReach Telegram code is invalid or expired. Generate a new code from Creator Settings.');
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

    await sendTelegramMessage(chatId, 'Telegram notifications are connected for AtlasReach. You can manage notification types from Creator Settings.');
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

app.post('/admin/telegram-groups/status', async (req, res) => {
  try {
    const user = await authenticate(req);
    await assertAdmin(user.id);
    const chatIds = Array.isArray(req.body?.chat_ids)
      ? req.body.chat_ids.map(telegramTaskKey).filter(Boolean).slice(0, 20)
      : [];
    const configMap = await getTelegramGroupConfigMap(chatIds);
    return res.json({
      groups: chatIds.map((chatId) => {
        const config = configMap.get(chatId);
        return {
          chat_id: chatId,
          chat_type: config?.chat_type || null,
          title: config?.title || null,
          public_link: config?.public_link || null,
          bot_status: config?.bot_status || null,
          bot_permission_status: config?.bot_permission_status || 'unknown',
          last_error: config?.last_error || null,
          last_seen_at: config?.last_seen_at || null,
          updated_at: config?.updated_at || null
        };
      })
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'Telegram group status could not be loaded' });
  }
});

app.get('/admin/telegram-groups', async (req, res) => {
  try {
    const user = await authenticate(req);
    await assertAdmin(user.id);
    const { data, error } = await supabase
      .from('telegram_group_configs')
      .select('chat_id, brand_profile_id, chat_type, title, public_link, bot_status, bot_permission_status, last_error, last_seen_at, updated_at')
      .is('brand_profile_id', null)
      .order('updated_at', { ascending: false })
      .limit(20);
    if (error) throw Object.assign(new Error(error.message), { status: 500 });

    const groups = [];
    for (const row of data || []) {
      groups.push(await refreshTelegramGroupConfig(row));
    }
    return res.json({ groups, botUsername: env.TELEGRAM_BOT_USERNAME || null });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'Telegram groups could not be loaded' });
  }
});

app.post('/admin/telegram-groups/verify', async (req, res) => {
  try {
    const user = await authenticate(req);
    await assertAdmin(user.id);
    const groupLink = String(req.body?.group_link || '').trim();
    const group = await verifyAdminTelegramGroupSetup(groupLink);
    return res.json({
      group: {
        chat_id: group.chat_id,
        chat_type: group.chat_type,
        title: group.title,
        public_link: group.public_link,
        bot_status: group.bot_status,
        bot_permission_status: group.bot_permission_status,
        last_error: group.last_error,
        last_seen_at: group.last_seen_at,
        updated_at: group.updated_at
      },
      botUsername: env.TELEGRAM_BOT_USERNAME || null
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'Telegram group setup could not be verified' });
  }
});

app.get('/brand/telegram-group/:brandProfileId', async (req, res) => {
  try {
    const user = await authenticate(req);
    const brandProfileId = String(req.params.brandProfileId || '').trim();
    await assertBrandProfileOwner(brandProfileId, user.id);
    const { data, error } = await supabase
      .from('telegram_group_configs')
      .select('chat_id, brand_profile_id, chat_type, title, public_link, bot_status, bot_permission_status, last_error, last_seen_at, updated_at')
      .eq('brand_profile_id', brandProfileId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw Object.assign(new Error(error.message), { status: 500 });
    const group = data ? await refreshTelegramGroupConfig(data) : null;
    return res.json({ group: group || null, botUsername: env.TELEGRAM_BOT_USERNAME || null });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'Telegram group status could not be loaded' });
  }
});

app.post('/brand/telegram-group/verify', async (req, res) => {
  try {
    const user = await authenticate(req);
    const brandProfileId = String(req.body?.brand_profile_id || '').trim();
    const groupLink = String(req.body?.group_link || '').trim();
    await assertBrandProfileOwner(brandProfileId, user.id);
    const group = await verifyBrandTelegramGroupSetup(brandProfileId, groupLink);
    return res.json({
      group: {
        chat_id: group.chat_id,
        chat_type: group.chat_type,
        title: group.title,
        public_link: group.public_link,
        bot_status: group.bot_status,
        bot_permission_status: group.bot_permission_status,
        last_error: group.last_error,
        last_seen_at: group.last_seen_at,
        updated_at: group.updated_at
      },
      botUsername: env.TELEGRAM_BOT_USERNAME || null
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'Telegram group setup could not be verified' });
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

    const saveDraft = (payload) => draftCampaignId
      ? supabase
          .from('campaigns')
          .update(payload)
          .eq('id', draftCampaignId)
          .eq('owner_id', user.id)
          .eq('status', 'draft')
          .select('id, status')
          .single()
      : supabase
          .from('campaigns')
          .insert([payload])
          .select('id, status')
          .single();

    let { data, error } = await saveDraft(draftPayload);
    if (error && isMissingCampaignColumnError(error, 'additional_requirements')) {
      if (usesTelegramCampaignRequirements(draftPayload)) throw missingAdditionalRequirementsError();
      const fallbackDraftPayload = { ...draftPayload };
      delete fallbackDraftPayload.additional_requirements;
      ({ data, error } = await saveDraft(fallbackDraftPayload));
    }
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
    const metadata = JSON.parse(payload.language || '{}');
    const campaignAssetKey = randomBytes(12).toString('hex');
    payload.language = JSON.stringify(await uploadNftCampaignMetadataAssets(metadata, campaignAssetKey));

    const { data, error } = await supabase
      .from('campaigns')
      .insert([payload])
      .select()
      .single();
    if (error) throw Object.assign(new Error(error.message), { status: 500 });

    const campaign = withNftCampaignMetadata(data);
    const telegram = await notifyAdminNftCampaignLaunch(campaign).catch((error) => {
      console.warn(`Admin NFT campaign Telegram launch announcement failed for campaign ${data.id}:`, error.message || error);
      return { sent: 0, skipped: 0, failed: 1 };
    });
    console.log(`Admin NFT campaign Telegram launch announcement result for campaign ${data.id}:`, telegram);

    return res.status(201).json({
      campaign,
      telegram
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
      .select('id, title, goal, campaign_type, language, budget, status, start_date, end_date, created_at')
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
      .select('id, title, goal, campaign_type, language, budget, status, start_date, end_date, created_at')
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

    const result = await finalizeNftRaffleCampaign(campaignId, { source: 'manual' });
    return res.json({
      winners: result.winners,
      finalized_at: result.finalized_at,
      alreadyFinalized: result.alreadyFinalized,
      telegram: result.telegram,
      adminCsv: result.adminCsv,
      activityPoints: result.activityPoints,
      referrals: result.referrals
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
    const [statsMap, taskVerifications] = await Promise.all([
      getNftCampaignStatsMap([campaign.id]),
      getNftTaskVerificationMap(campaign.id, user.id)
    ]);

    return res.json({
      campaign: {
        ...withNftCampaignMetadata(campaign),
        stats: statsMap.get(campaign.id) || {
          joined_count: 0,
          approved_count: 0,
          rejected_count: 0
        }
      },
      participation: participation || null,
      verified_tasks: taskVerifications
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
    if (!['follow', 'retweet', 'comment', 'engagement', 'telegram'].includes(taskType) || !taskValue) {
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
    if ((taskType === 'retweet' || taskType === 'comment' || taskType === 'engagement' || taskType === 'telegram') && !isNftRaffleType(campaign.campaign_type)) {
      throw Object.assign(new Error('This task is only available for raffle campaigns'), { status: 400 });
    }

    const nftCampaign = withNftCampaignMetadata(campaign);
    const returnVerifiedTask = async (type, value, extra = {}) => {
      await recordNftTaskVerification(campaignId, user.id, type, value, extra);
      return res.json({ verified: true, type, value, ...extra });
    };

    if (taskType === 'telegram') {
      const chatId = telegramTaskKey(taskValue);
      const requiredTelegramTasks = normalizeTelegramTasks(nftCampaign.telegram_tasks);
      if (!requiredTelegramTasks.some((task) => task.chat_id === chatId)) {
        throw Object.assign(new Error('This Telegram group task is not part of the campaign'), { status: 400 });
      }
      if (!creator.telegram_chat_id) {
        throw Object.assign(new Error('Connect Telegram in Creator Settings before verifying this task'), { status: 403 });
      }
      const result = await verifyTelegramGroupMembership(chatId, creator.telegram_chat_id);
      if (!result.verified) {
        throw Object.assign(new Error('Join the required Telegram group, then verify again'), { status: 403 });
      }
      return returnVerifiedTask('telegram', chatId, { member_status: result.status });
    }

    const creatorHandle = cleanHandle(creator.x_handle);
    if (!creatorHandle) {
      throw Object.assign(new Error('Add your X handle to your creator profile before verifying tasks'), { status: 403 });
    }

    if (taskType === 'follow') {
      const targetAccount = cleanHandle(taskValue);
      const requiredFollowAccounts = Array.isArray(nftCampaign.follow_accounts)
        ? nftCampaign.follow_accounts.map((account) => cleanHandle(account)).filter(Boolean).slice(0, 3)
        : [];
      if (!requiredFollowAccounts.includes(targetAccount)) {
        throw Object.assign(new Error('This follow task is not part of the campaign'), { status: 400 });
      }
      if (env.NFT_X_TASK_VERIFICATION_BYPASS_ENABLED) {
        return returnVerifiedTask('follow', targetAccount, { bypassed: true });
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

      return returnVerifiedTask('follow', targetAccount);
    }

    if (taskType === 'comment') {
      const tweetLink = taskValue;
      const requiredCommentLinks = Array.isArray(nftCampaign.comment_links)
        ? nftCampaign.comment_links.map((link) => String(link || '').trim()).filter(Boolean).slice(0, 2)
        : [];
      if (!requiredCommentLinks.includes(tweetLink)) {
        throw Object.assign(new Error('This Like & Comment task is not part of the campaign'), { status: 400 });
      }
      if (env.NFT_X_TASK_VERIFICATION_BYPASS_ENABLED) {
        return returnVerifiedTask('comment', tweetLink, { bypassed: true });
      }

      const commented = await verifySorsaComment(tweetLink, creatorHandle);
      if (!commented) {
        throw Object.assign(new Error('Like and comment on this X post, then verify again'), { status: 403 });
      }

      return returnVerifiedTask('comment', tweetLink);
    }

    if (taskType === 'engagement') {
      const tweetLink = taskValue;
      const requiredEngagementLinks = Array.isArray(nftCampaign.engagement_links)
        ? nftCampaign.engagement_links.map((link) => String(link || '').trim()).filter(Boolean).slice(0, 2)
        : [];
      if (!requiredEngagementLinks.includes(tweetLink)) {
        throw Object.assign(new Error('This Like, Retweet & Comment task is not part of the campaign'), { status: 400 });
      }
      if (env.NFT_X_TASK_VERIFICATION_BYPASS_ENABLED) {
        return returnVerifiedTask('engagement', tweetLink, { bypassed: true });
      }

      const [retweeted, commented] = await Promise.all([
        verifySorsaRetweet(tweetLink, creatorHandle),
        verifySorsaComment(tweetLink, creatorHandle)
      ]);
      if (!retweeted || !commented) {
        throw Object.assign(new Error('Like, retweet, and comment on this X post, then verify again'), { status: 403 });
      }

      return returnVerifiedTask('engagement', tweetLink);
    }

    const tweetLink = taskValue;
    const requiredRetweetLinks = Array.isArray(nftCampaign.retweet_links)
      ? nftCampaign.retweet_links.map((link) => String(link || '').trim()).filter(Boolean).slice(0, 2)
      : [];
    if (!requiredRetweetLinks.includes(tweetLink)) {
      throw Object.assign(new Error('This Like & Retweet task is not part of the campaign'), { status: 400 });
    }
    if (env.NFT_X_TASK_VERIFICATION_BYPASS_ENABLED) {
      return returnVerifiedTask('retweet', tweetLink, { bypassed: true });
    }

    const retweeted = await verifySorsaRetweet(tweetLink, creatorHandle);
    if (!retweeted) {
      throw Object.assign(new Error('Like and retweet this X post, then verify again'), { status: 403 });
    }

    return returnVerifiedTask('retweet', tweetLink);
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
        .select('id, x_handle, sorsa_score, wallet_address, telegram_chat_id')
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
    if (isNftRaffleType(campaign.campaign_type) && !cleanHandle(creator.x_handle)) {
      throw Object.assign(new Error('Add your X handle to your creator profile before joining this NFT raffle'), { status: 403 });
    }

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

    const xTaskVerificationBypassed = env.NFT_X_TASK_VERIFICATION_BYPASS_ENABLED;
    const requiredFollowAccounts = Array.isArray(nftCampaign.follow_accounts)
      ? nftCampaign.follow_accounts.map((account) => cleanHandle(account)).filter(Boolean).slice(0, 3)
      : [];
    if (requiredFollowAccounts.length > 0) {
      const creatorHandle = cleanHandle(creator.x_handle);
      if (!creatorHandle) {
        throw Object.assign(new Error('Add your X handle to your creator profile before joining this campaign'), { status: 403 });
      }

      if (!xTaskVerificationBypassed) {
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
    }

    const requiredRetweetLinks = isNftRaffleType(campaign.campaign_type) && Array.isArray(nftCampaign.retweet_links)
      ? nftCampaign.retweet_links.map((link) => String(link || '').trim()).filter(Boolean).slice(0, 2)
      : [];
    if (requiredRetweetLinks.length > 0) {
      const creatorHandle = cleanHandle(creator.x_handle);
      if (!creatorHandle) {
        throw Object.assign(new Error('Add your X handle to your creator profile before joining this campaign'), { status: 403 });
      }

      if (!xTaskVerificationBypassed) {
        for (const tweetLink of requiredRetweetLinks) {
          const retweeted = await verifySorsaRetweet(tweetLink, creatorHandle);
          if (!retweeted) {
            throw Object.assign(new Error('Like and retweet all required X posts before joining this NFT campaign'), { status: 403 });
          }
        }
      }
    }

    const requiredCommentLinks = isNftRaffleType(campaign.campaign_type) && Array.isArray(nftCampaign.comment_links)
      ? nftCampaign.comment_links.map((link) => String(link || '').trim()).filter(Boolean).slice(0, 2)
      : [];
    if (requiredCommentLinks.length > 0) {
      const creatorHandle = cleanHandle(creator.x_handle);
      if (!creatorHandle) {
        throw Object.assign(new Error('Add your X handle to your creator profile before joining this campaign'), { status: 403 });
      }

      if (!xTaskVerificationBypassed) {
        for (const tweetLink of requiredCommentLinks) {
          const commented = await verifySorsaComment(tweetLink, creatorHandle);
          if (!commented) {
            throw Object.assign(new Error('Like and comment on all required X posts before joining this NFT campaign'), { status: 403 });
          }
        }
      }
    }

    const requiredEngagementLinks = isNftRaffleType(campaign.campaign_type) && Array.isArray(nftCampaign.engagement_links)
      ? nftCampaign.engagement_links.map((link) => String(link || '').trim()).filter(Boolean).slice(0, 2)
      : [];
    if (requiredEngagementLinks.length > 0) {
      const creatorHandle = cleanHandle(creator.x_handle);
      if (!creatorHandle) {
        throw Object.assign(new Error('Add your X handle to your creator profile before joining this campaign'), { status: 403 });
      }

      if (!xTaskVerificationBypassed) {
        for (const tweetLink of requiredEngagementLinks) {
          const [retweeted, commented] = await Promise.all([
            verifySorsaRetweet(tweetLink, creatorHandle),
            verifySorsaComment(tweetLink, creatorHandle)
          ]);
          if (!retweeted || !commented) {
            throw Object.assign(new Error('Like, retweet, and comment on all required X posts before joining this NFT campaign'), { status: 403 });
          }
        }
      }
    }

    const requiredTelegramTasks = isNftRaffleType(campaign.campaign_type)
      ? normalizeTelegramTasks(nftCampaign.telegram_tasks)
      : [];
    if (requiredTelegramTasks.length > 0) {
      if (!creator.telegram_chat_id) {
        throw Object.assign(new Error('Connect Telegram in Creator Settings before joining this NFT campaign'), { status: 403 });
      }
      for (const task of requiredTelegramTasks) {
        const result = await verifyTelegramGroupMembership(task.chat_id, creator.telegram_chat_id);
        if (!result.verified) {
          throw Object.assign(new Error(`Join ${task.title || 'the required Telegram group'} before joining this NFT campaign`), { status: 403 });
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

    const result = await syncCreatorProfileFromSorsa(profile, 'creator_sorsa_sync');
    if (!result.synced && result.reason === 'missing_x_handle') {
      throw Object.assign(new Error('Add your X handle before syncing Sorsa score'), { status: 400 });
    }

    const { data: updatedProfile, error: updatedError } = await supabase
      .from('creator_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (updatedError) throw Object.assign(new Error(updatedError.message), { status: 500 });

    return res.json({ profile: updatedProfile, sorsaSync: result });
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
        .select('id, title, status, min_sorsa_score, additional_requirements, escrow_campaign_id, escrow_contract_address, escrow_tx_hash, metadata_hash, brand_wallet')
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

    const requiredTelegramTasks = getCampaignTelegramTasks(campaign);
    if (requiredTelegramTasks.length > 0) {
      if (!creator.telegram_chat_id) {
        throw Object.assign(new Error('Connect Telegram in Creator Settings before joining this campaign'), { status: 403 });
      }
      for (const task of requiredTelegramTasks) {
        const result = await verifyTelegramGroupMembership(task.chat_id, creator.telegram_chat_id);
        if (!result.verified) {
          throw Object.assign(new Error(`Join ${task.title || 'the required Telegram group'} before joining this campaign`), { status: 403 });
        }
      }
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

    const saveCampaign = (payload) => launch.draftCampaignId
      ? supabase
          .from('campaigns')
          .update(payload)
          .eq('id', launch.draftCampaignId)
          .eq('owner_id', user.id)
          .eq('status', 'draft')
          .select()
          .single()
      : supabase
          .from('campaigns')
          .insert([payload])
          .select()
          .single();

    let { data: campaignRow, error: insertError } = await saveCampaign(insertPayload);
    if (insertError && isMissingCampaignColumnError(insertError, 'additional_requirements')) {
      if (usesTelegramCampaignRequirements(insertPayload)) throw missingAdditionalRequirementsError();
      const fallbackInsertPayload = { ...insertPayload };
      delete fallbackInsertPayload.additional_requirements;
      ({ data: campaignRow, error: insertError } = await saveCampaign(fallbackInsertPayload));
    }
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
          .single();
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
    let nftCompletionPoints = { awarded: false };
    let referral = { qualified: false };
    if (status === 'approved' && submission.creator_id) {
      activityPoints = await awardSubmissionActivityPoints(submission);
      const campaignType = String(submission.campaign?.campaign_type || '').toLowerCase();
      const categories = Array.isArray(submission.campaign?.categories) ? submission.campaign.categories : [];
      const metadata = parseCampaignMetadata(submission.campaign);
      const isNftContentCampaign =
        isNftContentType(campaignType) &&
        (metadata.nft || categories.some((category) => String(category).toLowerCase() === 'nft'));
      if (isNftContentCampaign) {
        nftCompletionPoints = await awardNftCampaignCompletionPoints(submission.creator_id, submission.campaign_id);
      }
      referral = await qualifyReferralForCreator(submission.creator_id);
    }

    let telegram = { sent: 0, skipped: 1 };
    if (await shouldNotifySubmissionDecision(submission, existingSubmission.status)) {
      telegram = await notifySubmissionDecision(submission);
    }

    return res.json({ submission, telegram, activityPoints, nftCompletionPoints, referral });
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
      `<b>Payment update</b>\n${escapeTelegramHtml(campaign.title || 'AtlasReach campaign')}${amountLine}\nOpen AtlasReach to review your wallet history.`
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
  scheduleNftCampaignEndNotifications();
});
