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
  RefreshCw,
  Wind,
  Volume2,
  Radio,
  Layers,
  Sparkles,
  Database,
  Zap,
  HardDrive
} from 'lucide-react';
import { 
  getStoredApiKey, 
  saveStoredApiKey, 
  clearStoredApiKey 
} from '../services/apiKeyStore';
import { echos, EchosRespiratoryConfig } from '../services/echos';
import { 
  spatialAcoustic, 
  AcousticSpace, 
  ACOUSTIC_SPACES, 
  AcousticConfig,
  SidechainStatus 
} from '../services/spatialAcousticEngine';
import { audioCacheStore, CacheStats } from '../services/audioCacheStore';

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
  const [respiratoryConfig, setRespiratoryConfig] = useState<EchosRespiratoryConfig>(() => echos.getRespiratoryConfig());
  const [isPlayingPreview, setIsPlayingPreview] = useState<'onset' | 'exhale' | null>(null);
  const [acousticConfig, setAcousticConfig] = useState<AcousticConfig>(() => spatialAcoustic.getConfig());
  const [isPreviewingSpace, setIsPreviewingSpace] = useState(false);
  const [isTestingSidechain, setIsTestingSidechain] = useState(false);
  const [sidechainStatus, setSidechainStatus] = useState<SidechainStatus>({
    isDuckingActive: false,
    currentReductionDb: 0,
    voicePower: 0,
    f2Frequency: 2000,
    f3Frequency: 3400,
  });
  const [cacheStats, setCacheStats] = useState<CacheStats>({ sampleCount: 0, pcmCount: 0, totalBytes: 0 });
  const [isPrewarming, setIsPrewarming] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [cacheActionResult, setCacheActionResult] = useState<string | null>(null);

  const loadCacheStats = async () => {
    try {
      const stats = await audioCacheStore.getCacheStats();
      setCacheStats(stats);
    } catch (e) {
      console.warn('Failed to get cache stats:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setApiKey(getStoredApiKey());
      setRespiratoryConfig(echos.getRespiratoryConfig());
      setAcousticConfig(spatialAcoustic.getConfig());
      setStatusMessage(null);
      checkServerStatus();
      loadCacheStats();

      const unsubSidechain = spatialAcoustic.onSidechainActivity((status) => {
        setSidechainStatus(status);
      });
      return () => {
        unsubSidechain();
      };
    }
  }, [isOpen]);

  const handlePrewarmCache = async () => {
    if (isPrewarming) return;
    setIsPrewarming(true);
    setCacheActionResult(null);
    try {
      const ctx = echos.getContext();
      if (!ctx) throw new Error('WebAudio context unavailable');
      const res = await audioCacheStore.prewarmAll(ctx);
      await loadCacheStats();
      setCacheActionResult(`Pre-warmed ${res.prewarmedCount} buffer(s) in ${res.durationMs}ms`);
    } catch (err: any) {
      setCacheActionResult(`Pre-warm failed: ${err?.message || 'Error'}`);
    } finally {
      setIsPrewarming(false);
      setTimeout(() => setCacheActionResult(null), 4000);
    }
  };

  const handleClearCache = async () => {
    if (isClearingCache) return;
    setIsClearingCache(true);
    try {
      await audioCacheStore.clearAllCache();
      await loadCacheStats();
      setCacheActionResult('Persistent cache cleared successfully');
    } catch (err: any) {
      setCacheActionResult(`Clear failed: ${err?.message || 'Error'}`);
    } finally {
      setIsClearingCache(false);
      setTimeout(() => setCacheActionResult(null), 3500);
    }
  };

  const handleTestSidechainDucking = async () => {
    if (isTestingSidechain) return;
    setIsTestingSidechain(true);
    try {
      await spatialAcoustic.testSidechainDucking();
    } catch (err) {
      console.warn('Failed to test sidechain ducking:', err);
    } finally {
      setTimeout(() => setIsTestingSidechain(false), 2400);
    }
  };

  const handleAcousticChange = (patch: Partial<AcousticConfig>) => {
    const next = { ...acousticConfig, ...patch };
    setAcousticConfig(next);
    spatialAcoustic.setConfig(next);
  };

  const handlePreviewSpace = async () => {
    if (isPreviewingSpace) return;
    setIsPreviewingSpace(true);
    try {
      await spatialAcoustic.previewAcousticSpace();
    } catch (err) {
      console.warn('Failed to preview acoustic space:', err);
    } finally {
      setTimeout(() => setIsPreviewingSpace(false), 700);
    }
  };

  const handleRespiratoryChange = (patch: Partial<EchosRespiratoryConfig>) => {
    const next = { ...respiratoryConfig, ...patch };
    setRespiratoryConfig(next);
    echos.setRespiratoryConfig(next);
  };

  const handlePreviewBreath = async (type: 'onset' | 'exhale') => {
    if (isPlayingPreview) return;
    setIsPlayingPreview(type);
    try {
      const tag = type === 'onset' ? 'breath' : 'exhale';
      const intensityDbBoost = (respiratoryConfig.intensity - 75) * 0.28;
      const db = Math.max(-45, Math.min(-10, (type === 'onset' ? -19 : -21) + intensityDbBoost));
      await echos.play(tag, 1, { db });
    } catch (err) {
      console.warn('Failed to play breath preview:', err);
    } finally {
      setIsPlayingPreview(null);
    }
  };

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

      if (!res.ok) {
        const text = await res.text();
        let errorMsg = `Server returned ${res.status}: ${res.statusText}`;
        try {
          const json = JSON.parse(text);
          errorMsg = json.error || errorMsg;
        } catch {
          // If not JSON, use the status text or a snippet of the body
          if (text.includes('<html') || text.includes('<!DOCTYPE')) {
            errorMsg = `Endpoint '/api/verify-api-key' returned HTML instead of JSON. This usually indicates a 404 or server error.`;
          }
        }
        throw new Error(errorMsg);
      }

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
      console.error('API Verification error:', err);
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

        {/* ECHOS Respiratory Cycle Configuration */}
        <div className="pt-4 border-t border-slate-800 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                <Wind className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-200">
                  ECHOS Respiratory Cycles
                </h3>
                <p className="text-[11px] text-slate-400">
                  Subtle intake breaths and completion exhales to humanize speech delivery
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={respiratoryConfig.enabled}
                onChange={(e) => handleRespiratoryChange({ enabled: e.target.checked })}
                className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span className={`text-[11px] font-semibold ${respiratoryConfig.enabled ? 'text-cyan-400' : 'text-slate-500'}`}>
                {respiratoryConfig.enabled ? 'Active' : 'Muted'}
              </span>
            </label>
          </div>

          <div className={`p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-4 transition-opacity ${respiratoryConfig.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            {/* Intensity Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-medium text-slate-300 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> Breath Intensity (Volume)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">
                    {respiratoryConfig.intensity === 0 
                      ? 'Silent' 
                      : respiratoryConfig.intensity < 40 
                      ? 'Soft & Whispered' 
                      : respiratoryConfig.intensity < 80 
                      ? 'Natural (-20dB)' 
                      : 'Audible / Clear'}
                  </span>
                  <span className="font-mono text-cyan-300 font-semibold text-xs">
                    {respiratoryConfig.intensity}%
                  </span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={respiratoryConfig.intensity}
                onChange={(e) => handleRespiratoryChange({ intensity: parseInt(e.target.value, 10) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300 transition-all"
              />
            </div>

            {/* Frequency Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-medium text-slate-300 flex items-center gap-1.5">
                  <Wind className="w-3.5 h-3.5 text-cyan-400" /> Breath Frequency (Cadence)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">
                    {respiratoryConfig.frequency === 0 
                      ? 'Never' 
                      : respiratoryConfig.frequency < 40 
                      ? 'Rare (Long Monologues)' 
                      : respiratoryConfig.frequency < 80 
                      ? 'Standard Rhythm' 
                      : 'Every Response'}
                  </span>
                  <span className="font-mono text-cyan-300 font-semibold text-xs">
                    {respiratoryConfig.frequency}%
                  </span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={respiratoryConfig.frequency}
                onChange={(e) => handleRespiratoryChange({ frequency: parseInt(e.target.value, 10) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300 transition-all"
              />
            </div>

            {/* Quick Audition Buttons */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-medium">Acoustic Audition:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isPlayingPreview !== null || !respiratoryConfig.enabled || respiratoryConfig.intensity === 0}
                  onClick={() => handlePreviewBreath('onset')}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 text-[11px] font-medium border border-slate-700/60 flex items-center gap-1 transition-colors"
                >
                  <Volume2 className="w-3 h-3 text-cyan-400" />
                  {isPlayingPreview === 'onset' ? 'Playing...' : 'Test Inhale'}
                </button>
                <button
                  type="button"
                  disabled={isPlayingPreview !== null || !respiratoryConfig.enabled || respiratoryConfig.intensity === 0}
                  onClick={() => handlePreviewBreath('exhale')}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 text-[11px] font-medium border border-slate-700/60 flex items-center gap-1 transition-colors"
                >
                  <Wind className="w-3 h-3 text-cyan-400" />
                  {isPlayingPreview === 'exhale' ? 'Playing...' : 'Test Exhale'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Acoustic Spatialization & Convolver Engine */}
        <div className="pt-4 border-t border-slate-800 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <Radio className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-200">
                  Acoustic Spatialization & Convolver
                </h3>
                <p className="text-[11px] text-slate-400">
                  Procedural impulse responses for environmental acoustics and speech clarity
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={acousticConfig.active}
                onChange={(e) => handleAcousticChange({ active: e.target.checked })}
                className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span className={`text-[11px] font-semibold ${acousticConfig.active ? 'text-emerald-400' : 'text-slate-500'}`}>
                {acousticConfig.active ? 'Active' : 'Bypassed'}
              </span>
            </label>
          </div>

          <div className={`p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-4 transition-opacity ${acousticConfig.active ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            {/* Space Preset Selection Grid */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" /> Acoustic Environment Space
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(ACOUSTIC_SPACES) as AcousticSpace[]).map((spaceKey) => {
                  const sp = ACOUSTIC_SPACES[spaceKey];
                  const isSelected = acousticConfig.space === spaceKey;
                  return (
                    <button
                      key={spaceKey}
                      type="button"
                      onClick={() => handleAcousticChange({ space: spaceKey })}
                      className={`p-2 rounded-xl text-left border transition-all ${
                        isSelected
                          ? 'bg-emerald-950/50 border-emerald-500/70 text-emerald-200 shadow-sm shadow-emerald-900/30 ring-1 ring-emerald-500/30'
                          : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs leading-tight block">
                          {sp.name.split(' ')[0]}
                        </span>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
                      </div>
                      <span className="text-[10px] opacity-75 line-clamp-1 mt-0.5 block">
                        {sp.name.split(' ').slice(1).join(' ') || 'Acoustic'}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400 italic mt-1">
                {ACOUSTIC_SPACES[acousticConfig.space]?.description}
              </p>
            </div>

            {/* Reverb Wet Mix Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-medium text-slate-300 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> Spatial Wet Mix (Reverb Level)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">
                    {acousticConfig.reverbWet === 0
                      ? 'Dry Bypass'
                      : acousticConfig.reverbWet < 20
                      ? 'Subtle Air'
                      : acousticConfig.reverbWet < 40
                      ? 'Natural Room'
                      : acousticConfig.reverbWet < 65
                      ? 'Lush Tail'
                      : 'Ethereal Space'}
                  </span>
                  <span className="font-mono text-emerald-300 font-semibold text-xs">
                    {acousticConfig.reverbWet}%
                  </span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={acousticConfig.reverbWet}
                onChange={(e) => handleAcousticChange({ reverbWet: parseInt(e.target.value, 10) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400 hover:accent-emerald-300 transition-all"
              />
            </div>

            {/* Sub-Band Frequency Sidechain Ducking Section */}
            <div className="pt-3 border-t border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-200 font-semibold">
                    <input
                      type="checkbox"
                      checked={acousticConfig.formantDucking}
                      onChange={(e) => handleAcousticChange({ formantDucking: e.target.checked })}
                      className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-0 cursor-pointer"
                    />
                    <span>Sub-Band Frequency Sidechain Ducking</span>
                  </label>
                </div>

                <div className="flex items-center gap-1.5">
                  {sidechainStatus.isDuckingActive ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      Ducking: {sidechainStatus.currentReductionDb}dB
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                      Detector Standby
                    </span>
                  )}
                </div>
              </div>

              {acousticConfig.formantDucking && (
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3">
                  {/* Dual Notch Filter Band Indicators */}
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Band 1 (F2 Formant):</span>
                      <span className="font-mono text-emerald-400 font-semibold">2,000 Hz (Q=1.8)</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Band 2 (F3 Sibilance):</span>
                      <span className="font-mono text-emerald-400 font-semibold">3,400 Hz (Q=2.2)</span>
                    </div>
                  </div>

                  {/* Ducking Depth Slider */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-medium text-slate-300">
                        Formant Carve Depth:
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">
                          {acousticConfig.duckingDepthDb > -10
                            ? 'Gentle (-8dB)'
                            : acousticConfig.duckingDepthDb > -18
                            ? 'Broadcast Standard (-14dB)'
                            : 'Deep Isolation (-20dB+)'}
                        </span>
                        <span className="font-mono text-emerald-300 font-semibold text-xs">
                          {acousticConfig.duckingDepthDb} dB
                        </span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="-24"
                      max="-6"
                      step="1"
                      value={acousticConfig.duckingDepthDb}
                      onChange={(e) => handleAcousticChange({ duckingDepthDb: parseInt(e.target.value, 10) })}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400 hover:accent-emerald-300 transition-all"
                    />
                  </div>

                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Carves spectral pockets in background takes, earcons, and reverbs specifically when speech is detected. Background audio retains natural low-end body without masking speech intelligibility.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                <button
                  type="button"
                  disabled={isTestingSidechain || !acousticConfig.active || !acousticConfig.formantDucking}
                  onClick={handleTestSidechainDucking}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-emerald-300 text-[11px] font-semibold border border-emerald-800/50 flex items-center gap-1.5 transition-colors"
                  title="Play background bed and trigger a simulated voice burst to hear formant carving in real-time"
                >
                  <Activity className={`w-3.5 h-3.5 ${isTestingSidechain ? 'animate-spin text-amber-400' : 'text-emerald-400'}`} />
                  {isTestingSidechain ? 'Testing Sidechain Ducking...' : 'Test Sidechain Ducking'}
                </button>

                <button
                  type="button"
                  disabled={isPreviewingSpace || !acousticConfig.active}
                  onClick={handlePreviewSpace}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 text-[11px] font-medium border border-slate-700/60 flex items-center gap-1.5 transition-colors"
                  title="Audition harmonic chime through active spatial impulse response"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  {isPreviewingSpace ? 'Simulating...' : 'Audition Space'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* IndexedDB AudioBuffer Pre-Warming & Persistent Take Cache */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              IndexedDB AudioBuffer Pre-Warming Cache
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 flex items-center gap-1">
              <Zap className="w-2.5 h-2.5 text-cyan-300" /> &lt;1ms Hot Latency
            </span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Eliminates audio onset latency and decode delay during persona switching by pre-warming multi-take paralinguistic audio and storing pre-decoded Float32 PCM buffers in IndexedDB across browser sessions.
          </p>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block font-semibold">Decoded PCM Buffers:</span>
              <span className="font-mono text-cyan-300 font-bold text-sm mt-0.5 block">
                {cacheStats.pcmCount} <span className="text-[10px] text-slate-500 font-normal">takes</span>
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block font-semibold">Raw Sample Binaries:</span>
              <span className="font-mono text-emerald-300 font-bold text-sm mt-0.5 block">
                {cacheStats.sampleCount} <span className="text-[10px] text-slate-500 font-normal">files</span>
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block font-semibold">Persistent Storage:</span>
              <span className="font-mono text-purple-300 font-bold text-sm mt-0.5 block">
                {(cacheStats.totalBytes / 1024).toFixed(1)} <span className="text-[10px] text-slate-500 font-normal">KB</span>
              </span>
            </div>
          </div>

          {cacheActionResult && (
            <div className="p-2 rounded-lg bg-cyan-950/50 border border-cyan-800/50 text-cyan-300 text-xs font-mono flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <span>{cacheActionResult}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
            <button
              type="button"
              disabled={isPrewarming}
              onClick={handlePrewarmCache}
              className="px-3 py-1.5 rounded-lg bg-cyan-950/70 hover:bg-cyan-900/60 disabled:opacity-40 text-cyan-300 text-[11px] font-semibold border border-cyan-800/70 flex items-center gap-1.5 transition-colors"
              title="Pre-warm all stored audio buffers into active memory AudioBuffers"
            >
              <Zap className={`w-3.5 h-3.5 ${isPrewarming ? 'animate-spin text-amber-400' : 'text-cyan-400'}`} />
              {isPrewarming ? 'Pre-Warming...' : 'Pre-Warm All Buffers'}
            </button>

            <button
              type="button"
              disabled={isClearingCache || (cacheStats.sampleCount === 0 && cacheStats.pcmCount === 0)}
              onClick={handleClearCache}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-red-950/40 disabled:opacity-30 text-slate-400 hover:text-red-300 text-[11px] font-medium border border-slate-800 hover:border-red-800/50 flex items-center gap-1.5 transition-colors"
              title="Clear all IndexedDB audio cache records and hot memory buffers"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isClearingCache ? 'Clearing...' : 'Purge Cache'}
            </button>
          </div>
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
                gemini-3.8-flash-tts (Neural TTS)
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block font-semibold">Chat Inference:</span>
              <span className="font-mono text-slate-200 mt-0.5 block truncate">
                gemini-3.8-flash (Latest Flash)
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
