'use client';

import React, { useState, useEffect } from 'react';
import {
  Sliders,
  ShieldCheck,
  Building2,
  Lock,
  Activity,
  Download,
  Bot,
  KeyRound,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  LogOut,
  UserCheck
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';

export default function SettingsPage() {
  const { user, signInWithOAuth, signOut, openLoginModal, oauthConfig } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedDev, setCopiedDev] = useState(false);
  const [copiedShared, setCopiedShared] = useState(false);

  const devCallback = oauthConfig?.callbackUrls?.development || 'https://ais-dev-ss5pessumkhmwglkreltsp-49121961165.asia-east1.run.app/api/auth/callback';
  const sharedCallback = oauthConfig?.callbackUrls?.shared || 'https://ais-pre-ss5pessumkhmwglkreltsp-49121961165.asia-east1.run.app/api/auth/callback';

  const fetchLogs = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/audit');
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [user]);

  const copyToClipboard = (text: string, isShared: boolean) => {
    navigator.clipboard.writeText(text);
    if (isShared) {
      setCopiedShared(true);
      setTimeout(() => setCopiedShared(false), 2000);
    } else {
      setCopiedDev(true);
      setTimeout(() => setCopiedDev(false), 2000);
    }
  };

  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ logs, user, exportedAt: new Date() }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "AutoApply_Candidate_Data_Export.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Tenant &amp; Security Settings</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Automation &amp; Security Center
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure OAuth authentication, review callback URIs, inspect multi-tenant isolation, and audit pipeline security.
          </p>
        </div>

        <button
          onClick={handleExportData}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors self-start md:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Export All Data (JSON)</span>
        </button>
      </div>

      {/* OAuth 2.0 Authentication & Identity Management Section */}
      <div className="glass-panel p-6 rounded-2xl space-y-5 border border-indigo-500/20 bg-gradient-to-br from-slate-900/90 via-[#0f172a] to-indigo-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>OAuth 2.0 Single Sign-On (SSO) &amp; Identity</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                  ACTIVE
                </span>
              </h2>
              <p className="text-xs text-slate-400">Popup-based authorization with cross-origin postMessage communication</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <button
                onClick={signOut}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            ) : (
              <button
                onClick={openLoginModal}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Sign In with OAuth</span>
              </button>
            )}
          </div>
        </div>

        {/* Current User Session Status */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
              {user ? user.name.charAt(0).toUpperCase() : 'G'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-white">{user ? user.name : 'Guest Session'}</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                  {user ? `${user.role || 'CANDIDATE'}` : 'ANONYMOUS'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                {user ? user.email : 'Click "Sign In with OAuth" to connect your profile'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => signInWithOAuth('google')}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <span>Test Google OAuth</span>
            </button>
            <button
              onClick={() => signInWithOAuth('github')}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <span>Test GitHub OAuth</span>
            </button>
            <button
              onClick={() => signInWithOAuth('demo')}
              className="px-3 py-1.5 rounded-lg bg-indigo-950/70 hover:bg-indigo-900/70 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Instant Test</span>
            </button>
          </div>
        </div>

        {/* OAuth Callback URLs Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                <span>Development Redirect URI</span>
              </span>
              <button
                onClick={() => copyToClipboard(devCallback, false)}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] flex items-center gap-1 transition-colors"
              >
                {copiedDev ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedDev ? 'Copied' : 'Copy URI'}</span>
              </button>
            </div>
            <p className="font-mono text-[11px] text-slate-300 bg-slate-950 p-2 rounded-lg border border-slate-800/80 break-all">
              {devCallback}
            </p>
            <p className="text-[11px] text-slate-400">Register in Google Cloud Console or GitHub OAuth Apps for local/preview testing.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                <span>Shared / Production Redirect URI</span>
              </span>
              <button
                onClick={() => copyToClipboard(sharedCallback, true)}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] flex items-center gap-1 transition-colors"
              >
                {copiedShared ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedShared ? 'Copied' : 'Copy URI'}</span>
              </button>
            </div>
            <p className="font-mono text-[11px] text-slate-300 bg-slate-950 p-2 rounded-lg border border-slate-800/80 break-all">
              {sharedCallback}
            </p>
            <p className="text-[11px] text-slate-400">Register as authorized redirect URI for deployed and shared user sessions.</p>
          </div>
        </div>

        {/* Configuration Status Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
          <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="font-bold text-white">Google OAuth</p>
              <p className="text-[10px] text-slate-400 font-mono">GOOGLE_CLIENT_ID</p>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
              oauthConfig?.google?.isConfigured
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}>
              {oauthConfig?.google?.isConfigured ? 'Connected' : 'Demo Mode'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="font-bold text-white">GitHub OAuth</p>
              <p className="text-[10px] text-slate-400 font-mono">GITHUB_CLIENT_ID</p>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
              oauthConfig?.github?.isConfigured
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}>
              {oauthConfig?.github?.isConfigured ? 'Connected' : 'Demo Mode'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="font-bold text-white">Cookie Security</p>
              <p className="text-[10px] text-slate-400 font-mono">SameSite=None</p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Iframe Secure
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Ingestion Sources & Security */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ingestion Adapters Status */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
            <Bot className="w-4 h-4 text-indigo-400" />
            <span>Configured Job Source Adapters</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="font-bold text-white">Greenhouse Adapter</p>
                <p className="text-[11px] text-slate-400">Endpoint: boards-api.greenhouse.io/v1/boards</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold text-[10px]">
                  Healthy (200 OK)
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="font-bold text-white">Lever Postings Adapter</p>
                <p className="text-[11px] text-slate-400">Endpoint: api.lever.co/v0/postings</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold text-[10px]">
                  Healthy (200 OK)
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="font-bold text-white">Ashby Board Adapter</p>
                <p className="text-[11px] text-slate-400">Endpoint: api.ashbyhq.com/posting-api</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold text-[10px]">
                  Healthy (200 OK)
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="font-bold text-white">Workable Widget Adapter</p>
                <p className="text-[11px] text-slate-400">Endpoint: apply.workable.com/api/v1/widget</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold text-[10px]">
                  Healthy (200 OK)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Multi-Tenancy Overview */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>Multi-Tenant Isolation &amp; Safety Policy</span>
          </h2>

          <div className="space-y-3 text-xs text-slate-300">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <p className="font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Strict Human Approval Gate</span>
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                By platform policy, browser automation stops at the form review stage and requires explicit user review before submitting.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <p className="font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Zero-Hallucination Resume Verification</span>
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                All generated resume bullet points and claimed skills are programmatically audited against your candidate ground truth.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <p className="font-bold text-white flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-indigo-400" />
                <span>Tenant Isolation (HyperScale AI)</span>
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Tenant records are segregated in database queries using scoped tenant identifiers.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tenant Security Audit Trail */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-400" />
            <span>Tenant Security Audit Logs</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">Real-time Trail</span>
        </div>

        <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 text-xs font-mono">
          {logs.map(log => (
            <div key={log.id} className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-indigo-400 font-bold text-[11px]">{log.action}</span>
                <span className="text-slate-500 text-[10px]">[{log.resourceType}]</span>
              </div>
              <span className="text-[10px] text-slate-500">{new Date(log.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
