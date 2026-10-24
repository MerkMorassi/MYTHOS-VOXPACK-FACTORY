import React, { useState, useEffect, useRef } from 'react';
import { Camera, CameraOff, Eye, EyeOff, RefreshCw, Sparkles, Scan, Zap, ShieldCheck } from 'lucide-react';

interface VisionHUDProps {
  isActive: boolean;
  onToggleActive: (active: boolean) => void;
  onAnalyzeScene: (imageDataUrl: string) => void;
  autoAttach: boolean;
  onToggleAutoAttach: (auto: boolean) => void;
  onFrameCaptured?: (dataUrl: string) => void;
  className?: string;
}

export const VisionHUD: React.FC<VisionHUDProps> = ({
  isActive,
  onToggleActive,
  onAnalyzeScene,
  autoAttach,
  onToggleAutoAttach,
  onFrameCaptured,
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [lastAnalysisTime, setLastAnalysisTime] = useState<number | null>(null);
  const [lastFramePreview, setLastFramePreview] = useState<string | null>(null);

  // Initialize camera stream
  useEffect(() => {
    let mediaStream: MediaStream | null = null;

    if (isActive) {
      navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
      })
      .then((s) => {
        mediaStream = s;
        setStream(s);
        setError(null);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      })
      .catch((err) => {
        console.error('Vision camera stream error:', err);
        setError('Camera permission denied or camera device unavailable.');
        onToggleActive(false);
      });
    } else {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
    }

    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isActive]);

  // Sync video source when stream changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const captureFrameData = (): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.videoWidth === 0 || video.videoHeight === 0) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setLastFramePreview(dataUrl);
    if (onFrameCaptured) {
      onFrameCaptured(dataUrl);
    }
    return dataUrl;
  };

  const handleManualAnalyze = () => {
    setIsCapturing(true);
    const frame = captureFrameData();
    if (frame) {
      setLastAnalysisTime(Date.now());
      onAnalyzeScene(frame);
    }
    setTimeout(() => setIsCapturing(false), 600);
  };

  return (
    <div className={`bg-slate-950/90 border border-violet-900/60 rounded-2xl p-4 shadow-2xl backdrop-blur-md text-slate-100 ${className}`}>
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header Bar */}
      <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg ${isActive ? 'bg-violet-600/30 text-violet-400 ring-1 ring-violet-500/50' : 'bg-slate-900 text-slate-500'}`}>
            <Eye className={`w-4 h-4 ${isActive ? 'animate-pulse text-violet-300' : ''}`} />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              VISION CO-PRESENCE
              {isActive && (
                <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-700/50 px-1.5 py-0.5 rounded-full font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  GEMINI 3.8 FLASH
                </span>
              )}
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">
              {isActive ? 'Real-time multi-modal visual alignment' : 'Camera stream inactive'}
            </p>
          </div>
        </div>

        {/* Master Vision Toggle */}
        <button
          type="button"
          onClick={() => onToggleActive(!isActive)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            isActive
              ? 'bg-rose-950/80 hover:bg-rose-900/80 text-rose-200 border border-rose-800/60'
              : 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/20'
          }`}
        >
          {isActive ? (
            <>
              <CameraOff className="w-3.5 h-3.5" />
              <span>Disable Vision</span>
            </>
          ) : (
            <>
              <Camera className="w-3.5 h-3.5" />
              <span>Enable Vision</span>
            </>
          )}
        </button>
      </div>

      {/* Camera View / Preview HUD */}
      {isActive ? (
        <div className="relative rounded-xl overflow-hidden bg-black aspect-video border border-violet-800/50 group shadow-inner">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform -scale-x-100"
          />

          {/* Futuristic HUD Overlay */}
          <div className="absolute inset-0 pointer-events-none border border-violet-500/20 rounded-xl flex flex-col justify-between p-3">
            {/* Top HUD metrics */}
            <div className="flex justify-between items-start text-[10px] font-mono text-violet-300/80 bg-slate-950/60 backdrop-blur-sm p-1.5 rounded-lg border border-violet-900/40">
              <span className="flex items-center gap-1">
                <Scan className="w-3 h-3 text-violet-400 animate-spin" />
                OPTICAL_MATRIX_ACTIVE
              </span>
              <span>RES: 1280x720</span>
              <span className="text-emerald-400">FPS: 30</span>
            </div>

            {/* Reticle / Focal alignment bounds */}
            <div className="self-center my-auto relative w-32 h-32 border border-violet-400/30 rounded-lg flex items-center justify-center">
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-violet-400" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-violet-400" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-violet-400" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-violet-400" />
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400/80 animate-ping" />
            </div>

            {/* Bottom HUD bar */}
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-300 bg-slate-950/70 backdrop-blur-sm p-1.5 rounded-lg border border-violet-900/40">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Lila Co-Presence Active
              </span>
              {lastAnalysisTime && (
                <span className="text-violet-300">
                  Last Analyzed: {Math.round((Date.now() - lastAnalysisTime) / 1000)}s ago
                </span>
              )}
            </div>
          </div>

          {/* Capture Pulse Animation */}
          {isCapturing && (
            <div className="absolute inset-0 bg-violet-500/30 animate-pulse pointer-events-none flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-white animate-spin" />
            </div>
          )}
        </div>
      ) : (
        <div className="aspect-video bg-slate-900/80 rounded-xl border border-dashed border-slate-800 flex flex-col items-center justify-center p-6 text-center">
          <EyeOff className="w-8 h-8 text-slate-600 mb-2" />
          <p className="text-xs text-slate-400 font-medium">Vision Stream Disabled</p>
          <p className="text-[11px] text-slate-500 max-w-xs mt-1">
            Enable camera co-presence to allow Lila to visually observe your surroundings, expressions, and shared physical space.
          </p>
        </div>
      )}

      {/* Controls & Options Footer */}
      {isActive && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-2.5">
          {/* Auto-Attach Toggle */}
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={autoAttach}
              onChange={(e) => onToggleAutoAttach(e.target.checked)}
              className="rounded border-slate-700 text-violet-600 focus:ring-violet-500/50 bg-slate-900"
            />
            <span className="font-mono text-[11px]">Auto-Attach Visual Frame to Chat</span>
          </label>

          {/* Action Trigger */}
          <button
            type="button"
            onClick={handleManualAnalyze}
            disabled={isCapturing}
            className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-violet-600/20"
          >
            <Zap className="w-3.5 h-3.5 text-violet-200" />
            <span>Analyze Scene Now</span>
          </button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="mt-2 text-xs text-rose-400 bg-rose-950/60 border border-rose-800/60 rounded-xl p-2 font-mono">
          {error}
        </div>
      )}
    </div>
  );
};
