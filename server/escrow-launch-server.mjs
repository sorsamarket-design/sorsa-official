import 'dotenv/config';
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import {
  createPublicClient,
  createWalletClient,
  formatUnits,
  getAddress,
  http,
  isAddress,
  keccak256,
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
  SORSA_WEEKLY_SYNC_ENABLED: process.env.SORSA_WEEKLY_SYNC_ENABLED !== 'false'
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

async function assertCampaignSchemaReady() {
  const { error } = await supabase
    .from('campaigns')
    .select('escrow_campaign_id, escrow_contract_address, escrow_tx_hash, metadata_hash, brand_wallet, escrowed_budget, release_at')
    .limit(0);
  if (error) {
    throw Object.assign(
      new Error(`Supabase campaigns table is missing escrow confirmation columns. Apply enforce_escrow_confirmed_campaigns.sql. ${error.message}`),
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

  return {
    ...draft,
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

app.get('/campaigns/launch/ready', async (_req, res) => {
  try {
    await assertCampaignSchemaReady();
    return res.json({ ready: true });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ ready: false, error: error.message || 'Escrow launch backend is not ready' });
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

    await assertBrandProfileOwner(draftPayload.brand_profile_id, user.id);
    await assertDraftCampaignOwner(draftCampaignId, user.id, draftPayload.brand_profile_id);

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

app.post('/campaigns/launch', async (req, res) => {
  try {
    const user = await authenticate(req);
    const launch = normalizeLaunchBody(req.body);
    await assertCampaignSchemaReady();
    await assertBrandProfileOwner(launch.campaign.brand_profile_id, user.id);
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

const port = Number(process.env.PORT || 8787);
app.listen(port, () => {
  console.log(`Escrow launch server listening on http://localhost:${port}`);
  scheduleWeeklySorsaProfileSync();
});
