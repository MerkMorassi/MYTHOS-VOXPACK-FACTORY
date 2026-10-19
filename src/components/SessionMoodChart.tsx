import React, { useMemo } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { 
  X, 
  Sparkles, 
  PieChart as ChartIcon, 
  TrendingUp, 
  Activity, 
  Layers, 
  Info 
} from 'lucide-react';
import { Message } from './ChatView';
import { findMoodByTag, extractContextualProsody, EXHAUSTIVE_MOODS } from '../services/moodStore';

interface SessionMoodChartProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  sessionTitle?: string;
}

const PALETTE = [
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#f43f5e', // Rose
  '#a855f7', // Purple
  '#14b8a6', // Teal
  '#eab308', // Yellow
  '#64748b', // Slate for others
];

export const SessionMoodChart: React.FC<SessionMoodChartProps> = ({
  isOpen,
  onClose,
  messages,
  sessionTitle = 'Current Conversation',
}) => {
  // Extract and calculate mood frequencies across the session's messages
  const stats = useMemo(() => {
    const moodCounts: Record<string, { count: number; tag: string; label: string; category: string; description: string }> = {};
    let totalTaggedTurns = 0;

    messages.forEach((msg) => {
      // Check stored moodTag first, otherwise parse from message content
      let tag = msg.moodTag;
      if (!tag) {
        const parsed = extractContextualProsody(msg.content);
        if (parsed.detectedTag) {
          tag = parsed.detectedTag;
        } else {
          // Check for any bracketed tag in content
          const match = msg.content.match(/\[([a-zA-Z\-_]+)\]/);
          if (match) {
            tag = `[${match[1].toLowerCase()}]`;
          }
        }
      }

      if (tag) {
        const clean = tag.replace(/[\[\]]/g, '').toLowerCase();
        const found = findMoodByTag(clean);
        const canonicalTag = found ? found.tag : `[${clean}]`;
        const label = found ? found.label : (clean.charAt(0).toUpperCase() + clean.slice(1));
        const category = found ? found.category : 'General';
        const description = found ? found.description : 'Conversational prosody inflection';

        if (!moodCounts[canonicalTag]) {
          moodCounts[canonicalTag] = {
            count: 0,
            tag: canonicalTag,
            label,
            category,
            description,
          };
        }

        moodCounts[canonicalTag].count += 1;
        totalTaggedTurns += 1;
      }
    });

    // Convert to sorted array
    const sortedList = Object.values(moodCounts).sort((a, b) => b.count - a.count);

    // If there are more than 6 distinct moods, group smaller ones into "Others" for the pie slice
    let chartData: Array<{ name: string; tag: string; value: number; percentage: number; color: string; label: string }> = [];

    if (sortedList.length <= 6) {
      chartData = sortedList.map((item, idx) => ({
        name: `${item.tag} ${item.label}`,
        tag: item.tag,
        label: item.label,
        value: item.count,
        percentage: totalTaggedTurns > 0 ? Math.round((item.count / totalTaggedTurns) * 100) : 0,
        color: PALETTE[idx % PALETTE.length],
      }));
    } else {
      const topFive = sortedList.slice(0, 5);
      const remaining = sortedList.slice(5);
      const remainingCount = remaining.reduce((acc, curr) => acc + curr.count, 0);

      chartData = topFive.map((item, idx) => ({
        name: `${item.tag} ${item.label}`,
        tag: item.tag,
        label: item.label,
        value: item.count,
        percentage: totalTaggedTurns > 0 ? Math.round((item.count / totalTaggedTurns) * 100) : 0,
        color: PALETTE[idx % PALETTE.length],
      }));

      if (remainingCount > 0) {
        chartData.push({
          name: `Other Moods (${remaining.length})`,
          tag: '[various]',
          label: `Other Moods (${remaining.length})`,
          value: remainingCount,
          percentage: totalTaggedTurns > 0 ? Math.round((remainingCount / totalTaggedTurns) * 100) : 0,
          color: '#64748b',
        });
      }
    }

    const dominantMood = sortedList[0] || null;
    const uniqueMoodCount = sortedList.length;

    return {
      chartData,
      allMoods: sortedList,
      totalTaggedTurns,
      dominantMood,
      uniqueMoodCount,
    };
  }, [messages]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-violet-500/40 rounded-2xl shadow-2xl p-6 sm:p-7 space-y-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/40 flex items-center justify-center">
              <ChartIcon className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Session Vocal Prosody Breakdown
              </h2>
              <p className="text-xs text-slate-400 truncate max-w-md">
                Performance tone analytics for "{sessionTitle}"
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

        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
              Dominant Vocal Tone
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-sm font-bold text-amber-300 font-mono">
                {stats.dominantMood ? stats.dominantMood.tag : 'None yet'}
              </span>
              {stats.dominantMood && (
                <span className="text-xs text-slate-400 truncate">
                  {stats.dominantMood.label}
                </span>
              )}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
              Prosody Variations
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-lg font-bold text-violet-300">
                {stats.uniqueMoodCount}
              </span>
              <span className="text-xs text-slate-400">
                distinct moods used
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
              Vocal Deliveries
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-lg font-bold text-emerald-400">
                {stats.totalTaggedTurns}
              </span>
              <span className="text-xs text-slate-400">
                tagged lines
              </span>
            </div>
          </div>
        </div>

        {/* Chart Section */}
        {stats.totalTaggedTurns === 0 ? (
          <div className="p-10 text-center rounded-2xl bg-slate-950/40 border border-slate-800 space-y-3">
            <Sparkles className="w-8 h-8 text-violet-400 mx-auto opacity-70" />
            <h3 className="text-sm font-bold text-slate-200">No Prosody Tags Recorded Yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              As you chat with Lila, the backend API automatically appends relevant mood tags from the 100-mood Voxpack library based on conversational context. Send a message to see the pie chart update!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="h-64 w-full bg-slate-950/50 border border-slate-800/70 rounded-2xl p-4 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {stats.chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl shadow-xl text-xs space-y-1">
                            <div className="font-bold text-slate-100 flex items-center gap-1.5">
                              <span 
                                className="w-2.5 h-2.5 rounded-full inline-block" 
                                style={{ backgroundColor: data.color }}
                              />
                              <span>{data.name}</span>
                            </div>
                            <div className="text-slate-400 font-mono">
                              {data.value} line{data.value === 1 ? '' : 's'} ({data.percentage}%)
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    formatter={(value) => <span className="text-xs text-slate-300 font-medium">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Detailed Mood Frequency List */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-violet-400" /> All Performance Moods in Session
              </h3>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {stats.allMoods.map((item, idx) => {
                  const percentage = stats.totalTaggedTurns > 0 
                    ? Math.round((item.count / stats.totalTaggedTurns) * 100) 
                    : 0;

                  return (
                    <div 
                      key={item.tag} 
                      className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 text-[11px] font-mono text-slate-500 font-bold">
                          #{idx + 1}
                        </span>
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-violet-950 text-violet-300 border border-violet-800/60">
                          {item.tag}
                        </span>
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-200 truncate block">
                            {item.label}
                          </span>
                          <span className="text-[10px] text-slate-500 truncate block">
                            {item.category}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-bold text-slate-100 font-mono">
                          {item.count}
                        </span>
                        <span className="text-[10px] text-slate-500 ml-1.5 font-mono">
                          ({percentage}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-violet-400" />
            Auto-selected via Contextual Dynamic Prosody engine
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
