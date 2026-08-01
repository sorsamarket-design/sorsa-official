import 'dotenv/config';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucketName = process.env.NFT_CAMPAIGN_ASSET_BUCKET || 'nft-campaign-assets';
const maxAssetBytes = 2 * 1024 * 1024;
const apply = process.argv.includes('--apply');

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

function parseImageDataUrl(value) {
  if (typeof value !== 'string') return null;
  const match = value.match(/^data:(image\/(?:png|jpe?g|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!match) return null;
  const mimeType = match[1].toLowerCase().replace('image/jpg', 'image/jpeg');
  const buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
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

async function ensureBucket() {
  const { data, error } = await supabase.storage.getBucket(bucketName);
  if (error || !data) {
    if (!apply) {
      console.log(`[dry-run] would create public storage bucket ${bucketName}`);
      return;
    }
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: maxAssetBytes,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
    });
    if (createError) throw createError;
    console.log(`created public storage bucket ${bucketName}`);
    return;
  }

  if (!data.public) {
    if (!apply) {
      console.log(`[dry-run] would make storage bucket ${bucketName} public`);
      return;
    }
    const { error: updateError } = await supabase.storage.updateBucket(bucketName, {
      public: true,
      fileSizeLimit: maxAssetBytes,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
    });
    if (updateError) throw updateError;
    console.log(`updated storage bucket ${bucketName} to public`);
  }
}

async function uploadAsset(source, campaignId, slot) {
  const parsed = parseImageDataUrl(source);
  if (!parsed) return { changed: false, value: source, bytes: 0 };
  if (parsed.buffer.length > maxAssetBytes) {
    throw new Error(`${slot} image exceeds ${maxAssetBytes} bytes`);
  }
  const hash = createHash('sha256').update(parsed.buffer).digest('hex').slice(0, 16);
  const path = `nft-campaigns/${campaignId}/${slot}-${hash}.${parsed.extension}`;
  if (apply) {
    const { error } = await supabase.storage
      .from(bucketName)
      .upload(path, parsed.buffer, {
        contentType: parsed.mimeType,
        cacheControl: '31536000',
        upsert: true
      });
    if (error) throw error;
  }
  const { data } = supabase.storage.from(bucketName).getPublicUrl(path);
  return { changed: true, value: data.publicUrl, bytes: parsed.buffer.length };
}

async function fetchCampaignsWithInlineImages() {
  const campaigns = [];
  let from = 0;
  const pageSize = 100;

  while (true) {
    const { data, error } = await supabase
      .from('campaigns')
      .select('id, title, campaign_type, language')
      .ilike('language', '%data:image%')
      .range(from, from + pageSize - 1);
    if (error) throw error;
    campaigns.push(...(data || []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  return campaigns;
}

async function main() {
  console.log(`${apply ? 'applying' : 'dry-run'} NFT campaign image migration using bucket ${bucketName}`);
  await ensureBucket();

  const campaigns = await fetchCampaignsWithInlineImages();
  let changedCampaigns = 0;
  let changedImages = 0;
  let uploadedBytes = 0;

  for (const campaign of campaigns) {
    let metadata;
    try {
      metadata = campaign.language ? JSON.parse(campaign.language) : {};
    } catch (error) {
      console.warn(`skipping ${campaign.id}: invalid language JSON`);
      continue;
    }

    const shouldInspect = metadata?.nft === true || metadata?.image_url || metadata?.background_image_url;
    if (!shouldInspect) continue;

    const image = await uploadAsset(metadata.image_url, campaign.id, 'image');
    const background = await uploadAsset(metadata.background_image_url, campaign.id, 'background');
    if (!image.changed && !background.changed) continue;

    const nextMetadata = {
      ...metadata,
      image_url: image.value || null,
      background_image_url: background.value || null
    };

    if (apply) {
      const { error } = await supabase
        .from('campaigns')
        .update({ language: JSON.stringify(nextMetadata) })
        .eq('id', campaign.id);
      if (error) throw error;
    }

    changedCampaigns += 1;
    changedImages += Number(image.changed) + Number(background.changed);
    uploadedBytes += image.bytes + background.bytes;
    console.log(`${apply ? 'updated' : '[dry-run] would update'} ${campaign.id} ${campaign.title || ''}`.trim());
  }

  console.log(JSON.stringify({
    mode: apply ? 'apply' : 'dry-run',
    scannedCampaigns: campaigns.length,
    changedCampaigns,
    changedImages,
    uploadedBytes
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
