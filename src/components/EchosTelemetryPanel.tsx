import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  ChevronDown, 
  ChevronUp, 
  Download, 
  Trash2, 
  Play, 
  Radio, 
  Zap, 
  Sliders, 
  CheckCircle2, 
  X,
  Maximize2,
  Minimize2,
  Volume2
} from 'lucide-react';
import { echos, EchosEvent, EchosTag, ECHOS_VOICE_TAGS, ECHOS_EARCONS } from '../services/echos';

export const EchosTelemetryPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [events, setEvents] = useState<EchosEvent[]>([]);
  const [ttsPower, setTtsPower] = useState<number>(0);
  const [breathStatus, setBreathStatus] = useState<{ active: boolean; remainingMs: number }>({ active: false, remainingMs: 0 });
  const [echosState, setEchosState] = useState(echos.state);
  const [filterTag, setFilterTag] = useState<string>('all');

  const logEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Populate initial log history
    setEvents(echos.getLog());

    // Subscribe to live ECHOS events
    const unsubscribeEvents = echos.onEvent((ev) => {
      setEvents(prev => [...prev.slice(-300), ev]);
    });

    // Subscribe to live ECHOS state updates
    const unsubscribeState = echos.onState((st) => {
      setEchosState({ ...st });
    });

    // Polling interval for live WebAudio channel power & breath buffer status
    const interval = setInterval(() => {
      try {
        setTtsPower(echos.getTTSPower());
        setBreathStatus(echos.getBreathBufferStatus());
      } catch (_) {}
    }, 100);

    return () => {
      unsubscribeEvents();
      unsubscribeState();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (isOpen && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [events, isOpen]);

  const handleExportJsonl = () => {
    const jsonlData = echos.exportJsonl();
    const blob = new Blob([jsonlData], { type: 'application/x-jsonlines' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `echos_telemetry_${Date.now()}.jsonl`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearLog = () => {
    setEvents([]);
  };

  const handleTestTrigger = (tag: EchosTag) => {
    echos.play(tag, 2, { mode: 'gap' });
  };

  const filteredEvents = events.filter(ev => {
    if (filterTag === 'all') return true;
    if (filterTag === 'voice') return ECHOS_VOICE_TAGS.includes(ev.tag as any);
    if (filterTag === 'earcons') return ECHOS_EARCONS.includes(ev.tag as any);
    return ev.tag === filterTag;
  });

  return (
    <div className={`fixed bottom-4 right-4 z-50 transition-all duration-300 font-sans ${
      isOpen ? 'w-full max-w-xl' : 'w-auto'
    }`}>
      {/* Closed State Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-violet-500/50 text-slate-200 text-xs font-semibold flex items-center gap-2.5 shadow-2xl shadow-violet-950/50 backdrop-blur-md transition-all hover:scale-105"
        >
          <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>ECHOS Telemetry Stream</span>
          <span className="px-2 py-0.5 rounded-full bg-violet-950 border border-violet-800 text-[10px] font-mono text-violet-300">
            {events.length} ev
          </span>
          {breathStatus.active && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" title="Breath buffer active" />
          )}
        </button>
      )}

      {/* Expanded Telemetry Drawer */}
      {isOpen && (
        <div className={`rounded-2xl bg-slate-950/95 border border-violet-500/60 shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden transition-all duration-300 ${
          isExpanded ? 'h-[600px]' : 'h-[380px]'
        }`}>
          {/* Drawer Header */}
          <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                ECHOS Telemetry & Event Stream
                <span className="px-2 py-0.5 rounded-full bg-violet-950 border border-violet-800 text-[10px] font-mono text-violet-300">
                  {events.length} Events
                </span>
              </h3>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleExportJsonl}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1 transition-colors"
                title="Export JSONL telemetry log"
              >
                <Download className="w-3 h-3 text-slate-400" /> Export JSONL
              </button>

              <button
                onClick={handleClearLog}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors"
                title="Clear log"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                title={isExpanded ? 'Collapse view' : 'Expand view'}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                title="Close panel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Live Metrics & Channel Gauges Bar */}
          <div className="px-4 py-2.5 bg-slate-900/50 border-b border-slate-800 grid grid-cols-3 gap-3 text-xs shrink-0 font-mono">
            {/* TTS Channel Power */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>TTS RMS Power:</span>
                <span className={ttsPower > 0.01 ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                  {(ttsPower * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                <div 
                  className="h-full bg-emerald-400 transition-all duration-75 rounded-full"
                  style={{ width: `${Math.min(100, ttsPower * 400)}%` }}
                />
              </div>
            </div>

            {/* Breath Buffer Status */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Breath Buffer:</span>
                <span className={breathStatus.active ? 'text-amber-400 font-bold' : 'text-slate-500'}>
                  {breathStatus.active ? `${breathStatus.remainingMs}ms` : 'Idle'}
                </span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                <div 
                  className={`h-full transition-all duration-100 rounded-full ${breathStatus.active ? 'bg-amber-400 animate-pulse' : 'bg-slate-800'}`}
                  style={{ width: breathStatus.active ? '100%' : '0%' }}
                />
              </div>
            </div>

            {/* Mood & Hue */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Mood / Hue:</span>
                <span className="text-violet-300 font-bold capitalize">
                  {echosState.mood} ({echosState.hue}°)
                </span>
              </div>
              <div 
                className="w-full h-1.5 rounded-full transition-all"
                style={{ backgroundColor: `hsl(${echosState.hue}, 70%, 55%)` }}
              />
            </div>
          </div>

          {/* Quick SFX Test Fire Toolbar */}
          <div className="px-4 py-2 bg-slate-900/30 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px] shrink-0 scrollbar-none">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider shrink-0 mr-1">Test Fire:</span>
            {['sigh', 'breath', 'hum', 'gasp', 'laugh', 'floor_want', 'floor_yield'].map((tag) => (
              <button
                key={tag}
                onClick={() => handleTestTrigger(tag as EchosTag)}
                className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-violet-950 border border-slate-800 hover:border-violet-700 text-slate-300 hover:text-violet-200 font-mono text-[10px] shrink-0 transition-colors"
              >
                [{tag}]
              </button>
            ))}
          </div>

          {/* Live Log Stream Table */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 font-mono text-[11px] scrollbar-thin">
            {filteredEvents.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs font-sans">
                No telemetry events logged yet. Speak to Lila or test-fire a nonverbal sound above.
              </div>
            ) : (
              filteredEvents.map((ev, idx) => {
                const timeStr = new Date(ev.t).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
                const isEarcon = ECHOS_EARCONS.includes(ev.tag as any);

                return (
                  <div 
                    key={`${ev.t}_${idx}`}
                    className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 hover:border-violet-500/40 flex items-center justify-between gap-2 text-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-slate-500 text-[10px] shrink-0">{timeStr}</span>

                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase shrink-0 ${
                        isEarcon ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-violet-950 text-violet-300 border border-violet-800'
                      }`}>
                        [{ev.tag}:{ev.lvl}]
                      </span>

                      <span className="text-slate-400 shrink-0">T{ev.take}</span>

                      <span className="text-slate-500 text-[10px] truncate">
                        {ev.src === 'sample' ? 'Sample WAV' : 'Synth Oscillator'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] shrink-0 text-slate-400">
                      <span className="text-violet-300">{ev.cents >= 0 ? `+${ev.cents}` : ev.cents}c</span>
                      <span>{ev.db >= 0 ? `+${ev.db}` : ev.db}dB</span>
                      <span className="text-slate-300 font-bold">{ev.ms}ms</span>
                      <span className="px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 text-[9px] uppercase">
                        {ev.out}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={logEndRef} />
          </div>
        </div>
      )}
    </div>
  );
};
