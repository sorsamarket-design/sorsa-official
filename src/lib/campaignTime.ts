const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function getCampaignEndTime(endDate?: string | null) {
  if (!endDate) return null;

  if (DATE_ONLY_PATTERN.test(endDate)) {
    return new Date(`${endDate}T23:59:59`).getTime();
  }

  const time = new Date(endDate).getTime();
  return Number.isNaN(time) ? null : time;
}

export function formatCampaignTimeLeft(endDate?: string | null) {
  const end = getCampaignEndTime(endDate);
  if (!end) return 'No end date';

  const diff = end - Date.now();
  if (diff <= 0) return 'Ended';

  const totalMinutes = Math.ceil(diff / (1000 * 60));
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h left` : `${days}d left`;
  }

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m left` : `${hours}h left`;
  }

  return `${minutes}m left`;
}

export function formatCampaignTimeline(endDate?: string | null, releaseAt?: string | null) {
  const end = getCampaignEndTime(endDate);
  if (!end) {
    return { label: 'No end date', phase: 'missing' as const };
  }

  if (Date.now() < end) {
    return {
      label: formatCampaignTimeLeft(endDate),
      phase: 'campaign' as const
    };
  }

  const release = releaseAt ? new Date(releaseAt).getTime() : end + 24 * 60 * 60 * 1000;
  if (Number.isNaN(release)) {
    return { label: 'Payment pending', phase: 'payment' as const };
  }

  const diff = release - Date.now();
  if (diff <= 0) {
    return { label: 'Payment ready', phase: 'ready' as const };
  }

  return {
    label: `Payment in ${formatDuration(diff)}`,
    phase: 'payment' as const
  };
}

export function isCampaignEndingSoon(endDate?: string | null) {
  const end = getCampaignEndTime(endDate);
  if (!end) return false;

  const diff = end - Date.now();
  return diff > 0 && diff <= 3 * 24 * 60 * 60 * 1000;
}

function formatDuration(milliseconds: number) {
  const totalMinutes = Math.ceil(milliseconds / (1000 * 60));
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  return `${minutes}m`;
}
