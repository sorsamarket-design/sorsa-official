export function getInitialsAvatarUrl(name?: string | null) {
  const label = String(name || 'Creator').replace('@', '').trim() || 'Creator';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(label)}&background=00d4ff&color=000000&bold=true&size=256&format=png`;
}

export function normalizeAvatarUrl(url?: string | null) {
  const value = String(url || '').trim();
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) return null;
  return value
    .replace('_normal.', '_400x400.')
    .replace('_bigger.', '_400x400.')
    .replace('_mini.', '_400x400.');
}

export function resolveCreatorAvatarUrl(...candidates: Array<string | null | undefined>) {
  const avatar = candidates.map(normalizeAvatarUrl).find(Boolean);
  return avatar || null;
}
