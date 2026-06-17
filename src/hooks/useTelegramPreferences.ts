import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import telegramNotifications, { type TelegramPreferences, type TelegramStatus } from '../lib/telegramNotifications';
import { useAuth } from '../context/AuthContext';

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type TelegramPreferencesContextValue = {
  status: TelegramStatus | null;
  loading: boolean;
  saving: boolean;
  loaded: boolean;
  error: string | null;
  loadPreferences: (options?: { force?: boolean }) => Promise<TelegramStatus | null>;
  createConnectLink: () => Promise<any>;
  disconnectTelegram: () => Promise<void>;
  updatePreferences: (preferences: TelegramPreferences) => Promise<void>;
};

const TelegramPreferencesContext = createContext<TelegramPreferencesContextValue | null>(null);

export function TelegramPreferencesProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cachedUserId = useRef<string | null>(null);
  const statusStreamRef = useRef<EventSource | null>(null);
  const streamLoadedRef = useRef(false);

  const resetCache = useCallback(() => {
    setStatus(null);
    setLastFetchedAt(0);
    setLoading(false);
    setSaving(false);
    setLoaded(false);
    setError(null);
    streamLoadedRef.current = false;
  }, []);

  useEffect(() => {
    if (authLoading) return;

    const nextUserId = user?.id || null;
    if (cachedUserId.current !== nextUserId) {
      cachedUserId.current = nextUserId;
      resetCache();
    }
  }, [authLoading, resetCache, user?.id]);

  useEffect(() => {
    if (authLoading || !user) return;

    let cancelled = false;
    let source: EventSource | null = null;

    telegramNotifications.createStatusEventSource()
      .then((eventSource) => {
        if (cancelled) {
          eventSource.close();
          return;
        }

        source = eventSource;
        statusStreamRef.current = eventSource;
        eventSource.onopen = () => {
          if (streamLoadedRef.current) {
            setError(null);
          }
        };
        eventSource.onmessage = (event) => {
          try {
            const nextStatus = JSON.parse(event.data) as TelegramStatus;
            streamLoadedRef.current = true;
            setStatus(nextStatus);
            setLoaded(true);
            setLastFetchedAt(Date.now());
            setError(null);
          } catch (err) {
            console.warn('Could not parse Telegram status stream event:', err);
          }
        };
        eventSource.onerror = () => {
          if (streamLoadedRef.current) {
            return;
          }

          telegramNotifications.getPreferences()
            .then((nextStatus) => {
              streamLoadedRef.current = true;
              setStatus(nextStatus);
              setLoaded(true);
              setLastFetchedAt(Date.now());
              setError(null);
            })
            .catch(() => {
              setError('Telegram connection status could not be loaded.');
            });
        };
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Telegram connection status stream could not be opened.');
        }
      });

    return () => {
      cancelled = true;
      if (source) source.close();
      if (statusStreamRef.current === source) {
        statusStreamRef.current = null;
      }
    };
  }, [authLoading, user?.id]);

  const loadPreferences = useCallback(async (options: { force?: boolean } = {}) => {
    if (authLoading) return null;

    if (!user) {
      resetCache();
      return null;
    }

    const isFresh = loaded && Date.now() - lastFetchedAt < CACHE_TTL_MS;
    if (!options.force && isFresh) return status;

    try {
      setLoading(true);
      setError(null);
      const nextStatus = await telegramNotifications.getPreferences();
      setStatus(nextStatus);
      setLoaded(true);
      setLastFetchedAt(Date.now());
      return nextStatus;
    } catch (err: any) {
      setError(err.message || 'Telegram settings could not be loaded.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [authLoading, lastFetchedAt, loaded, resetCache, status, user]);

  const createConnectLink = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);
      return await telegramNotifications.createConnectLink();
    } catch (err: any) {
      setError(err.message || 'Telegram link could not be created.');
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  const disconnectTelegram = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);
      await telegramNotifications.disconnect();
      setStatus((current) => ({ ...current, connected: false, telegramUsername: null, connectedAt: null }));
      setLoaded(true);
      setLastFetchedAt(Date.now());
    } catch (err: any) {
      setError(err.message || 'Telegram could not be disconnected.');
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  const updatePreferences = useCallback(async (preferences: TelegramPreferences) => {
    const previousStatus = status;
    setStatus((current) => ({ ...current, preferences }));

    try {
      setSaving(true);
      setError(null);
      const result = await telegramNotifications.updatePreferences(preferences);
      setStatus((current) => ({ ...current, preferences: result.preferences }));
      setLoaded(true);
      setLastFetchedAt(Date.now());
    } catch (err: any) {
      setStatus(previousStatus);
      setError(err.message || 'Telegram preferences could not be updated.');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [status]);

  const value = useMemo(() => ({
    status,
    loading,
    saving,
    loaded,
    error,
    loadPreferences,
    createConnectLink,
    disconnectTelegram,
    updatePreferences
  }), [createConnectLink, disconnectTelegram, error, loadPreferences, loaded, loading, saving, status, updatePreferences]);

  return React.createElement(TelegramPreferencesContext.Provider, { value }, children);
}

export function useTelegramPreferences() {
  const context = useContext(TelegramPreferencesContext);
  if (!context) {
    throw new Error('useTelegramPreferences must be used within TelegramPreferencesProvider');
  }
  return context;
}
