import React, { useState, useEffect } from 'react';
import { 
  VolumeX, 
  AlertTriangle, 
  Key, 
  X, 
  Sparkles, 
  ChevronRight,
  ShieldAlert,
  Info
} from 'lucide-react';
import { 
  AudioAlert, 
  subscribeAudioAlerts, 
  clearAudioAlert 
} from '../services/voiceCloneService';

interface SystemAlertBannerProps {
  onOpenSettings?: () => void;
  className?: string;
}

export const SystemAlertBanner: React.FC<SystemAlertBannerProps> = ({
  onOpenSettings,
  className = '',
}) => {
  const [alert, setAlert] = useState<AudioAlert | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeAudioAlerts((newAlert) => {
      setAlert(newAlert);
      if (newAlert) {
        setIsDismissed(false);
      }
    });
    return unsubscribe;
  }, []);

  if (!alert || isDismissed) {
    return null;
  }

  const isQuota = alert.type === 'quota_exhausted' || (alert.reason && alert.reason.toLowerCase().includes('quota'));

  return (
    <div 
      role="alert"
      className={`mx-auto w-full max-w-4xl px-6 transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${className}`}
    >
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-r from-slate-900/95 via-amber-950/20 to-slate-900/95 p-4 shadow-xl shadow-amber-950/20 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="mt-0.5 w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
              <VolumeX className="w-4 h-4 text-amber-300" />
            </div>
            
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-amber-200 tracking-wide uppercase flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                  {alert.title || 'Using Browser Voice Fallback'}
                </span>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300">
                  {isQuota ? 'Free-Tier Rate Limit' : 'Voice Switched'}
                </span>
              </div>

              <p className="text-xs text-slate-200 leading-relaxed font-medium">
                "{alert.message}"
              </p>

              {alert.reason && (
                <p className="text-[11px] text-slate-400 leading-snug flex items-center gap-1">
                  <Info className="w-3 h-3 text-slate-500 shrink-0 inline" />
                  <span>{alert.reason}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-amber-200 hover:text-amber-100 text-xs font-semibold border border-amber-500/30 hover:border-amber-400/60 transition-all flex items-center gap-1.5 shadow-sm"
                title="Open Settings to verify or configure a personal Gemini API Key"
              >
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>API Settings</span>
                <ChevronRight className="w-3 h-3 text-amber-400" />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsDismissed(true);
                clearAudioAlert();
              }}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
              title="Dismiss notification"
              aria-label="Dismiss alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
