import React, { useState, useEffect } from 'react';
import { 
  X, 
  Key, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Shield, 
  Activity, 
  Cpu, 
  Save, 
  RefreshCw 
} from 'lucide-react';
import { 
  getStoredApiKey, 
  saveStoredApiKey, 
  clearStoredApiKey 
} from '../services/apiKeyStore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApiKeySaved?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onApiKeySaved
}) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [serverStatus, setServerStatus] = useState<{ hasServerEnvKey: boolean; status: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setApiKey(getStoredApiKey());
      setStatusMessage(null);
      checkServerStatus();
    }
  }, [isOpen]);

  const checkServerStatus = async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        setServerStatus(data);
      }
    } catch {
      // Ignored if status endpoint is quiet
    }
  };

  const handleSave = () => {
    const trimmed = apiKey.trim();
    saveStoredApiKey(trimmed);
    if (trimmed) {
      setStatusMessage({
        type: 'success',
        text: 'Gemini API Key saved to localStorage. It will be passed in the x-gemini-api-key header for all chat, TTS, and cloning requests.'
      });
    } else {
      setStatusMessage({
        type: 'info',
        text: 'Custom API Key cleared. System will use backend environment credentials.'
      });
    }
    if (onApiKeySaved) onApiKeySaved();
  };

  const handleClear = () => {
    clearStoredApiKey();
    setApiKey('');
    setStatusMessage({
      type: 'info',
      text: 'API Key removed from localStorage. Default server credentials will be utilized.'
    });
    if (onApiKeySaved) onApiKeySaved();
  };

  const handleTestKey = async () => {
    const keyToTest = apiKey.trim();
    if (!keyToTest && !serverStatus?.hasServerEnvKey) {
      setStatusMessage({
        type: 'error',
        text: 'Please enter a Gemini API Key to test.'
      });
      return;
    }

    setIsVerifying(true);
    setStatusMessage({
      type: 'info',
      text: 'Testing authentication with Google Gemini API...'
    });

    try {
      const res = await fetch('/api/verify-api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(keyToTest ? { 'x-gemini-api-key': keyToTest } : {})
        },
        body: JSON.stringify({ apiKey: keyToTest })
      });

      const data = await res.json();
      if (data.valid) {
        setStatusMessage({
          type: 'success',
          text: 'Authentication successful! Your Gemini API Key is valid and active.'
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: data.error || 'API Key verification failed. Please check the key.'
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to reach API verification endpoint.'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  const hasKeyConfigured = !!apiKey.trim() || !!serverStatus?.hasServerEnvKey;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/40 flex items-center justify-center">
              <Key className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Settings & API Key
              </h2>
              <p className="text-xs text-slate-400">
                Authenticate Gemini AI Chat, Neural TTS, and Voice Cloning
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* API Key Input Section */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-violet-400" /> Gemini API Key
              </label>
              {apiKey.trim() && (
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Stored in localStorage
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono outline-none pr-10 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition-colors"
                title={showKey ? 'Hide API Key' : 'Reveal API Key'}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
              Persisted in your browser's <code className="text-violet-300 font-mono">localStorage</code>. Automatically sent via <code className="text-violet-300 font-mono">x-gemini-api-key</code> headers for all chat completions, voice synthesis, and acoustic analysis.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-violet-600/20"
            >
              <Save className="w-3.5 h-3.5" /> Save Key
            </button>

            <button
              type="button"
              disabled={isVerifying}
              onClick={handleTestKey}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin text-violet-400' : ''}`} />
              {isVerifying ? 'Verifying...' : 'Test Connection'}
            </button>

            {apiKey.trim() && (
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-800 hover:border-rose-800/50 ml-auto"
                title="Remove API Key from localStorage"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            )}
          </div>

          {/* Status Message Display */}
          {statusMessage && (
            <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in ${
              statusMessage.type === 'success' 
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' 
                : statusMessage.type === 'error'
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                : 'bg-slate-950 border-slate-800 text-slate-300'
            }`}>
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : statusMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <Activity className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{statusMessage.text}</span>
            </div>
          )}
        </div>

        {/* System & Runtime Diagnostics */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-violet-400" /> Runtime Environment
          </h3>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block font-semibold">Server Fallback Key:</span>
              <span className="font-mono text-slate-200 mt-0.5 block">
                {serverStatus?.hasServerEnvKey ? (
                  <span className="text-emerald-400 font-semibold">Active in process.env</span>
                ) : (
                  <span className="text-amber-400 font-semibold">Not configured</span>
                )}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block font-semibold">Neural TTS Model:</span>
              <span className="font-mono text-slate-200 mt-0.5 block truncate">
                gemini-3.8-flash-tts
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block font-semibold">Chat Inference:</span>
              <span className="font-mono text-slate-200 mt-0.5 block truncate">
                gemini-3.8-flash
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block font-semibold">Prosody Library:</span>
              <span className="font-mono text-violet-300 mt-0.5 block">
                100 Baseline Moods
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
