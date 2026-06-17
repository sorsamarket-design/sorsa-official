import {
  hexToSignature,
  isAddress,
  isAddressEqual,
  keccak256,
  parseUnits,
  stringify,
  toBytes,
  type Address,
  type Hex
} from 'viem';
import { campaignEscrowAbi, createCampaignTypes, erc20Abi } from './escrowAbi';

export interface EscrowLaunchAuthorization {
  campaignId: Hex;
  budget: string;
  startsAt: string;
  endsAt: string;
  metadataHash: Hex;
  nonce: string;
  deadline: string;
  signature: {
    v: number;
    r: Hex;
    s: Hex;
  };
}

export interface EscrowLaunchRequest {
  campaign: Record<string, unknown>;
  brandWallet: Address;
  draftCampaignId?: string | null;
  authorization: EscrowLaunchAuthorization;
}

export interface EscrowLaunchResult {
  campaignId: string;
  escrowCampaignId: Hex;
  escrowTxHash: Hex;
  escrowContractAddress: Address;
  metadataHash: Hex;
  releaseAt?: string;
  status: 'live';
}

const launchEndpoint = import.meta.env.VITE_ESCROW_LAUNCH_ENDPOINT;
const escrowAddress = import.meta.env.VITE_ESCROW_CONTRACT_ADDRESS as Address | undefined;
const usdcAddress = import.meta.env.VITE_USDC_ADDRESS as Address | undefined;
const configuredChainId = Number(import.meta.env.VITE_ESCROW_CHAIN_ID || '0');

export function getEscrowLaunchErrorMessage(error: unknown): string {
  let current: any = error;

  while (current) {
    const message = String(current.shortMessage || current.message || '').toLowerCase();
    if (
      current.code === 4001 ||
      current.name === 'UserRejectedRequestError' ||
      message.includes('user rejected') ||
      message.includes('user denied')
    ) {
      return 'Request rejected';
    }
    if (message.includes('transferfailed') || message.includes('0x90b8ec18')) {
      return 'Insufficient USDC balance';
    }
    current = current.cause;
  }

  return error instanceof Error
    ? error.message
    : 'Escrow confirmation failed. No campaign was created.';
}

function requireAddress(value: Address | undefined, label: string): Address {
  if (!value || !isAddress(value)) {
    throw new Error(`Missing or invalid ${label}.`);
  }
  return value;
}

function getLaunchReadyEndpoint() {
  if (!launchEndpoint) return null;
  return launchEndpoint.replace(/\/campaigns\/launch\/?$/, '/campaigns/launch/ready');
}

function getDraftEndpoint() {
  if (!launchEndpoint) return null;
  return launchEndpoint.replace(/\/campaigns\/launch\/?$/, '/campaigns/drafts');
}

export async function assertEscrowLaunchBackendReady() {
  const readyEndpoint = getLaunchReadyEndpoint();
  if (!readyEndpoint) {
    throw new Error('Missing VITE_ESCROW_LAUNCH_ENDPOINT.');
  }

  const response = await fetch(readyEndpoint, { method: 'GET' });
  let body: any = null;
  try {
    body = await response.json();
  } catch {
    // Leave body null for non-JSON backend errors.
  }

  if (!response.ok || body?.ready !== true) {
    throw new Error(body?.error || 'Escrow launch backend is not ready.');
  }
}

function parseDateOnly(value: string, label: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) throw new Error(`Choose a campaign ${label} date.`);
  return { year, month, day };
}

function dateWithClock(date: string, clock: Date) {
  const { year, month, day } = parseDateOnly(date, 'valid');
  return new Date(
    year,
    month - 1,
    day,
    clock.getHours(),
    clock.getMinutes(),
    clock.getSeconds(),
    0
  );
}

function dateToStartTimestamp(date: string, launchClock: Date): bigint {
  if (!date) throw new Error('Choose a campaign start date.');
  const selected = Math.floor(dateWithClock(date, launchClock).getTime() / 1000);
  const soon = Math.floor(Date.now() / 1000) + 300;
  return BigInt(Math.max(selected, soon));
}

function dateToEndTimestamp(date: string, startTimestamp: bigint): bigint {
  if (!date) throw new Error('Choose a campaign end date.');
  const startClock = new Date(Number(startTimestamp) * 1000);
  return BigInt(Math.floor(dateWithClock(date, startClock).getTime() / 1000));
}

function buildMetadataHash(campaign: Record<string, unknown>) {
  return keccak256(toBytes(stringify(campaign))) as Hex;
}

function buildCampaignId(campaign: Record<string, unknown>, brandWallet: Address, nonce: bigint) {
  const seed = stringify({
    brandWallet: brandWallet.toLowerCase(),
    brandProfileId: campaign.brand_profile_id,
    title: campaign.title,
    budget: campaign.budget,
    startDate: campaign.start_date,
    endDate: campaign.end_date,
    nonce: nonce.toString()
  });
  return keccak256(toBytes(seed)) as Hex;
}

export async function authorizeEscrowLaunch({
  campaign,
  brandWallet,
  walletClient,
  publicClient
}: {
  campaign: Record<string, unknown>;
  brandWallet: Address;
  walletClient: any;
  publicClient: any;
}): Promise<EscrowLaunchAuthorization> {
  const escrow = requireAddress(escrowAddress, 'VITE_ESCROW_CONTRACT_ADDRESS');
  const usdc = requireAddress(usdcAddress, 'VITE_USDC_ADDRESS');
  if (!launchEndpoint) {
    throw new Error('Missing VITE_ESCROW_LAUNCH_ENDPOINT.');
  }
  if (!isAddress(brandWallet)) {
    throw new Error('Connected wallet is not a valid address.');
  }
  const walletClientAddress = walletClient?.account?.address;
  if (!walletClientAddress || !isAddressEqual(walletClientAddress, brandWallet)) {
    throw new Error('Connected wallet changed. Reconnect the wallet you want to fund this campaign with, then try again.');
  }

  const chainId = await publicClient.getChainId();
  if (configuredChainId && chainId !== configuredChainId) {
    throw new Error(`Wrong network. Switch to chain ${configuredChainId}.`);
  }

  const budget = parseUnits(String(campaign.budget), 6);
  if (budget <= 0n) throw new Error('Campaign budget must be greater than zero.');
  const usdcBalance = await publicClient.readContract({
    address: usdc,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [brandWallet]
  });
  if (usdcBalance < budget) {
    throw new Error('Insufficient USDC balance');
  }

  const launchClock = new Date();
  const startsAt = dateToStartTimestamp(String(campaign.start_date || ''), launchClock);
  const endsAt = dateToEndTimestamp(String(campaign.end_date || ''), startsAt);
  if (startsAt >= endsAt) {
    throw new Error('Campaign end date must be after the start date.');
  }

  const nonce = await publicClient.readContract({
    address: escrow,
    abi: campaignEscrowAbi,
    functionName: 'nonces',
    args: [brandWallet]
  });
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 30 * 60);
  const metadataHash = buildMetadataHash(campaign);
  const campaignId = buildCampaignId(campaign, brandWallet, nonce);

  const approvalHash = await walletClient.writeContract({
    account: brandWallet,
    address: usdc,
    abi: erc20Abi,
    functionName: 'approve',
    args: [escrow, budget]
  });
  await publicClient.waitForTransactionReceipt({ hash: approvalHash });

  const signatureHex = await walletClient.signTypedData({
    account: brandWallet,
    domain: {
      name: 'CampaignEscrow',
      version: '1',
      chainId,
      verifyingContract: escrow
    },
    types: createCampaignTypes,
    primaryType: 'CreateCampaign',
    message: {
      campaignId,
      brand: brandWallet,
      budget,
      startsAt,
      endsAt,
      metadataHash,
      nonce,
      deadline
    }
  });
  const { v, r, s } = hexToSignature(signatureHex);

  return {
    campaignId,
    budget: budget.toString(),
    startsAt: startsAt.toString(),
    endsAt: endsAt.toString(),
    metadataHash,
    nonce: nonce.toString(),
    deadline: deadline.toString(),
    signature: { v: Number(v), r, s }
  };
}

export async function launchCampaignThroughEscrow(
  request: EscrowLaunchRequest,
  _accessToken?: string
): Promise<EscrowLaunchResult> {
  if (!launchEndpoint) {
    throw new Error('Missing VITE_ESCROW_LAUNCH_ENDPOINT. Configure the trusted backend endpoint that locks escrow before inserting campaigns.');
  }

  const response = await fetch(launchEndpoint, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  });

  let body: any = null;
  try {
    body = await response.json();
  } catch {
    // Leave body null for non-JSON backend errors.
  }

  if (!response.ok) {
    throw new Error(body?.message || body?.error || 'Escrow launch failed before campaign confirmation.');
  }

  if (
    body?.status !== 'live' ||
    !body?.campaignId ||
    !body?.escrowCampaignId ||
    !body?.escrowTxHash ||
    !body?.escrowContractAddress ||
    !body?.metadataHash
  ) {
    throw new Error('Escrow launch response is missing confirmed on-chain campaign proof.');
  }

  return body as EscrowLaunchResult;
}

export async function saveCampaignDraftThroughBackend(
  campaign: Record<string, unknown>,
  _accessToken?: string,
  draftCampaignId?: string | null
): Promise<{ campaignId: string; status: 'draft' }> {
  const draftEndpoint = getDraftEndpoint();
  if (!draftEndpoint) {
    throw new Error('Missing VITE_ESCROW_LAUNCH_ENDPOINT. Configure the trusted backend endpoint for campaign drafts.');
  }

  const response = await fetch(draftEndpoint, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ campaign, draftCampaignId })
  });

  let body: any = null;
  try {
    body = await response.json();
  } catch {
    // Leave body null for non-JSON backend errors.
  }

  if (!response.ok) {
    throw new Error(body?.message || body?.error || 'Campaign draft could not be saved.');
  }

  if (body?.status !== 'draft' || !body?.campaignId) {
    throw new Error('Campaign draft response is missing the draft id.');
  }

  return body;
}
