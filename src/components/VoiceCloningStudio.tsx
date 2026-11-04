import React, { useState } from 'react';
import { Upload, Mic, CheckCircle2, Sparkles, AlertCircle, FileAudio } from 'lucide-react';
import { createReplicatedVoice } from '../services/voiceCloneService';

interface VoiceCloningStudioProps {
  onSuccess: () => void;
}

export const VoiceCloningStudio: React.FC<VoiceCloningStudioProps> = ({ onSuccess }) => {
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [consentFile, setConsentFile] = useState<File | null>(null);
  const [isCloning, setIsCloning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const CONSENT_PHRASE = "I am the owner of this voice and I consent to Google using this voice to create a synthetic voice model.";

  const handleClone = async () => {
    if (!referenceFile || !consentFile) return;
    setIsCloning(true);
    setError(null);

    try {
      const refBase64 = await fileToBase64(referenceFile);
      const consentBase64 = await fileToBase64(consentFile);
      await createReplicatedVoice(refBase64, consentBase64, `Clone of ${referenceFile.name.split('.')[0]}`);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Cloning failed');
    } finally {
      setIsCloning(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
    });
  };

  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
      <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-violet-400" /> New Voice Clone
      </h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">1. Reference Audio (10-30s)</label>
          <input type="file" accept="audio/*" onChange={(e) => setReferenceFile(e.target.files?.[0] || null)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-sm text-slate-200" />
        </div>
        
        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
          <p className="text-xs text-slate-400 mb-2">2. Consent Audio: Recite this phrase exactly:</p>
          <p className="text-sm font-mono text-emerald-400 bg-slate-900 p-3 rounded-lg border border-emerald-900">"{CONSENT_PHRASE}"</p>
          <input type="file" accept="audio/*" onChange={(e) => setConsentFile(e.target.files?.[0] || null)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-sm text-slate-200 mt-3" />
        </div>
      </div>

      {error && <p className="text-rose-400 text-xs">{error}</p>}

      <button
        onClick={handleClone}
        disabled={isCloning || !referenceFile || !consentFile}
        className="w-full px-5 py-3 rounded-xl bg-violet-600 text-white font-medium text-sm hover:bg-violet-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
      >
        {isCloning ? <><Sparkles className="w-4 h-4 animate-spin" /> Cloning...</> : 'Create Replicated Voice'}
      </button>
    </div>
  );
};
