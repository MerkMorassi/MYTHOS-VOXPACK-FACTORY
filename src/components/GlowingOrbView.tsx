import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Send, Volume2, Sparkles, Play, Square, RefreshCw, User, Bot } from 'lucide-react';
import { Message, VoiceProfile } from '../types';

interface GlowingOrbViewProps {
  messages: Message[];
  onSendMessage: (text: string) => Promise<void>;
  isThinking: boolean;
  mode: 'off-stage' | 'on-stage';
  onToggleMode: () => void;
  selectedVoice: VoiceProfile;
}

export const GlowingOrbView: React.FC<GlowingOrbViewProps> = ({
  messages,
  onSendMessage,
  isThinking,
  mode,
  onToggleMode,
  selectedVoice,
}) => {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Speech Recognition setup
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setInput(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in your browser. Please type your message.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setInput('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isThinking) return;
    const text = input;
    setInput('');
    await onSendMessage(text);
  };

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Play TTS audio using server TTS proxy or Web Speech API synthesis
  const speakText = async (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = selectedVoice.pitch;
      utterance.rate = selectedVoice.rate;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    }
  };

  // Automatically speak latest assistant response if on-stage or off-stage
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'assistant') {
      speakText(lastMsg.content);
    }
  }, [messages]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-7rem)] max-w-7xl mx-auto px-4 py-6">
      {/* Left Column: Glowing Orb Stage */}
      <div className="lg:col-span-5 flex flex-col items-center justify-center bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 relative overflow-hidden backdrop-blur-md">
        {/* Ambient backdrop glow */}
        <div className={`absolute w-72 h-72 rounded-full blur-3xl opacity-20 transition-all duration-1000 ${
          isThinking ? 'bg-amber-500 scale-125' : isSpeaking ? 'bg-emerald-500 scale-110' : mode === 'on-stage' ? 'bg-violet-600' : 'bg-cyan-500'
        }`} />

        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${
            mode === 'on-stage' ? 'bg-violet-950/60 border-violet-700/60 text-violet-300' : 'bg-cyan-950/60 border-cyan-700/60 text-cyan-300'
          }`}>
            {mode === 'on-stage' ? 'On-Stage (Rehearsed Actor)' : 'Off-Stage (Independent Base Self)'}
          </span>
          <button
            onClick={onToggleMode}
            className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full transition-colors flex items-center gap-1.5"
            title="Toggle interaction mode"
          >
            <RefreshCw className="w-3 h-3" />
            Switch Mode
          </button>
        </div>

        <div className="absolute top-4 right-4 text-xs font-mono text-slate-400">
          Voice: <span className="text-slate-200">{selectedVoice.name}</span>
        </div>

        {/* Central Minimalist Glowing Orb */}
        <div className="relative my-auto flex items-center justify-center">
          <motion.div
            animate={{
              scale: isThinking ? [1, 1.12, 1] : isSpeaking ? [1, 1.08, 0.96, 1] : [1, 1.03, 1],
              opacity: isThinking ? [0.8, 1, 0.8] : 0.9,
            }}
            transition={{
              repeat: Infinity,
              duration: isThinking ? 1.2 : isSpeaking ? 0.6 : 3,
              ease: "easeInOut"
            }}
            className={`w-48 h-48 rounded-full shadow-2xl flex items-center justify-center relative cursor-pointer transition-all duration-500 ${
              mode === 'on-stage'
                ? 'bg-gradient-to-tr from-violet-600 via-fuchsia-500 to-indigo-400 shadow-violet-500/30'
                : 'bg-gradient-to-tr from-cyan-600 via-teal-500 to-blue-500 shadow-cyan-500/30'
            }`}
            onClick={toggleListening}
          >
            {/* Inner core pulse */}
            <div className="w-36 h-36 rounded-full bg-slate-950/40 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <Sparkles className={`w-8 h-8 text-white/80 transition-transform ${isThinking ? 'animate-spin' : ''}`} />
            </div>
          </motion.div>
        </div>

        {/* Audio Status & Mic Trigger */}
        <div className="mt-6 flex flex-col items-center gap-3 w-full">
          <div className="text-xs font-mono text-slate-400 text-center">
            {isThinking ? 'Lila is thinking & formulating independent perspective...' : isSpeaking ? 'Lila is speaking...' : isListening ? 'Listening to your voice...' : 'Tap orb or mic to speak'}
          </div>

          <button
            onClick={toggleListening}
            className={`px-5 py-3 rounded-xl font-medium text-sm flex items-center gap-2 transition-all shadow-lg ${
              isListening
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {isListening ? 'Stop Listening' : 'Voice Input'}
          </button>
        </div>
      </div>

      {/* Right Column: Chat Transcript & Input */}
      <div className="lg:col-span-7 flex flex-col bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">Conversation Transcript</h2>
          <span className="text-xs font-mono text-slate-400">{messages.length} messages</span>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
              <Bot className="w-10 h-10 text-slate-600" />
              <p className="text-sm font-medium">No conversation yet.</p>
              <p className="text-xs text-slate-500 max-w-xs">Speak into the mic or type below to converse with Lila in her off-stage base state or on-stage roleplay.</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-300 shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-slate-800 text-slate-100 border border-slate-700/60'
                      : 'bg-violet-950/30 text-violet-100 border border-violet-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-1">
                    <span className="text-[10px] font-mono text-slate-400">
                      {msg.role === 'user' ? 'You' : 'Lila'} {msg.mode === 'on-stage' ? '[On-Stage]' : '[Off-Stage]'}
                    </span>
                    {msg.role === 'assistant' && (
                      <button
                        onClick={() => speakText(msg.content)}
                        className="text-slate-400 hover:text-slate-200 transition-colors"
                        title="Play audio"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))
          )}
          {isThinking && (
            <div className="flex gap-3 items-center text-slate-400 text-xs font-mono">
              <div className="w-8 h-8 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-300 animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <span>Lila is thinking...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} className="p-4 border-t border-slate-800 flex items-center gap-3 bg-slate-900/60">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message to Lila..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
          />
          <button
            type="submit"
            disabled={isThinking || !input.trim()}
            className="px-5 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium text-sm rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-violet-600/20"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </form>
      </div>
    </div>
  );
};
