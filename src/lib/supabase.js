import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

function createSupabaseClient(storageKey) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storageKey
    }
  });
}

/** @type {import('@supabase/supabase-js').SupabaseClient} */
export const supabase = hasSupabaseConfig
  ? createSupabaseClient('atlasreach.supabase.auth')
  : /** @type {any} */ (null);

/** @type {import('@supabase/supabase-js').SupabaseClient} */
export const adminSupabase = hasSupabaseConfig
  ? createSupabaseClient('atlasreach.supabase.admin.auth')
  : /** @type {any} */ (null);

export function getAuthScopeForPath(pathname = typeof window !== 'undefined' ? window.location.pathname : '/') {
  const normalized = String(pathname || '/');
  return normalized.startsWith('/admin/') || normalized === '/auth/admin' ? 'admin' : 'default';
}

export function getSupabaseForScope(scope = 'default') {
  return scope === 'admin' ? adminSupabase : supabase;
}

export function requireSupabase(scope = getAuthScopeForPath()) {
  const client = getSupabaseForScope(scope);
  if (!client) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before using authenticated features.');
  }
  return client;
}
