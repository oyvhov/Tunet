import { useState, useEffect } from 'react';
import { createConnection, createLongLivedTokenAuth, getAuth } from 'home-assistant-js-websocket';
import { validateUrl } from '../config/onboarding';
import {
  saveTokens,
  loadTokens,
  hasOAuthTokens,
  isOAuthRejected,
  logoutOAuthEverywhere,
} from '../services/oauthStorage';
import type {
  ConnectionTestResult,
  UseConnectionSetupDeps,
  UseConnectionSetupResult,
} from '../types/dashboard';

/**
 * Centralises connection-testing, OAuth login/logout and onboarding-step state.
 */
export function useConnectionSetup({
  config,
  setConfig,
  connected,
  showOnboarding,
  setShowOnboarding,
  showConfigModal,
  setShowConfigModal,
  t,
}: UseConnectionSetupDeps): UseConnectionSetupResult {
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [onboardingUrlError, setOnboardingUrlError] = useState('');
  const [onboardingTokenError, setOnboardingTokenError] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<ConnectionTestResult | null>(
    null
  );
  const [configTab, setConfigTab] = useState('connection');

  // ── Auto-close onboarding when OAuth connects ──────────────────────────
  useEffect(() => {
    if (connected && config.authMethod === 'oauth' && showOnboarding) {
      setShowOnboarding(false);
      setShowConfigModal(false);
    }
  }, [connected, config.authMethod, showOnboarding, setShowOnboarding, setShowConfigModal]);

  // ── Re-open onboarding when auth is lost ───────────────────────────────
  useEffect(() => {
    // Don't re-open during an active OAuth callback — tokens haven't been
    // saved yet so hasOAuthTokens() is false, but the exchange is in flight.
    const isOAuthCallback =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('auth_callback');
    if (isOAuthCallback) return;
    // A rejected OAuth session is handled by the expired-login banner.
    if (config.authMethod === 'oauth' && isOAuthRejected()) return;

    const hasAuth =
      config.token || config.haSession || (config.authMethod === 'oauth' && hasOAuthTokens());
    if (!hasAuth && !showOnboarding && !showConfigModal) {
      setShowOnboarding(true);
      setOnboardingStep(0);
      setConfigTab('connection');
    }
  }, [
    config.token,
    config.haSession,
    config.authMethod,
    showOnboarding,
    showConfigModal,
    setShowOnboarding,
  ]);

  // ── Connection test (long-lived token) ─────────────────────────────────
  const testConnection = async () => {
    if (!validateUrl(config.url)) return;
    if (config.authMethod !== 'oauth' && !config.token) return;
    setTestingConnection(true);
    setConnectionTestResult(null);
    try {
      const auth = createLongLivedTokenAuth(config.url, config.token);
      const testConn = await createConnection({ auth });
      testConn.close();
      setConnectionTestResult({ success: true, message: t('onboarding.testSuccess') });
    } catch {
      setConnectionTestResult({ success: false, message: t('onboarding.testFailed') });
    } finally {
      setTestingConnection(false);
    }
  };

  // ── OAuth login redirect ───────────────────────────────────────────────
  const startOAuthLogin = (url = config.url) => {
    const cleanUrl = String(url || '')
      .trim()
      .replace(/\/$/, '');
    if (!validateUrl(cleanUrl)) return;
    try {
      localStorage.setItem('ha_url', cleanUrl);
      localStorage.setItem('ha_auth_method', 'oauth');
    } catch {}
    getAuth({
      hassUrl: cleanUrl,
      saveTokens,
      loadTokens: () => Promise.resolve(loadTokens()),
    }).catch((err) => {
      console.error('OAuth login redirect failed:', err);
      // Ensure we clear any leftover auth_callback from URL so subsequent clicks actually attempt a redirect
      if (typeof window !== 'undefined' && window.location.search.includes('auth_callback')) {
        window.history.replaceState(null, '', window.location.pathname);
      }

      if (err === 5) {
        // 5 = ERR_INVALID_HTTPS_TO_HTTP in HAWS
        setConnectionTestResult({
          success: false,
          message:
            'Cannot use an HTTP Home Assistant URL when accessing the dashboard via HTTPS. Please use an HTTPS URL for Home Assistant (e.g. Nabu Casa / DuckDNS), or use a Long-Lived Access Token.',
        });
      } else {
        setConnectionTestResult({
          success: false,
          message: t('system.oauth.redirectFailed') + (err ? ` (${err.message || err})` : ''),
        });
      }
    });
  };

  // ── OAuth logout ───────────────────────────────────────────────────────
  const handleOAuthLogout = () => {
    logoutOAuthEverywhere();
    setConfig({ ...config, authMethod: 'oauth', token: '' });
    try {
      localStorage.removeItem('ha_oauth_tokens');
      window.sessionStorage.removeItem('ha_oauth_tokens');
      window.sessionStorage.removeItem('ha_token');
      localStorage.removeItem('ha_token');
      localStorage.setItem('ha_auth_method', 'oauth');
    } catch {}
    // The live HA connection keeps its auth in memory and would save refreshed
    // tokens again, so start over from a clean page.
    globalThis.location?.reload();
  };

  // ── Derived: can the user advance past onboarding step 0? ──────────────
  const canAdvanceOnboarding =
    onboardingStep === 0
      ? config.authMethod === 'oauth'
        ? Boolean(config.url && validateUrl(config.url) && hasOAuthTokens())
        : Boolean(
            config.url && config.token && validateUrl(config.url) && connectionTestResult?.success
          )
      : true;

  const isOnboardingActive = showOnboarding;

  return {
    onboardingStep,
    setOnboardingStep,
    onboardingUrlError,
    setOnboardingUrlError,
    onboardingTokenError,
    setOnboardingTokenError,
    testingConnection,
    testConnection,
    connectionTestResult,
    setConnectionTestResult,
    configTab,
    setConfigTab,
    startOAuthLogin,
    handleOAuthLogout,
    canAdvanceOnboarding,
    isOnboardingActive,
  };
}
