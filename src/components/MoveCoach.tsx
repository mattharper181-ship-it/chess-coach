import { useState } from 'react';
import type { CoachTip, CoachCategory } from '../lib/move-coach';

const CATEGORY_STYLES: Record<CoachCategory, { border: string; badge: string; icon: string; label: string }> = {
  mistake:  { border: 'border-red-700/60',    badge: 'bg-red-900/60 text-red-300',      icon: '⚠', label: 'Mistake'  },
  good:     { border: 'border-green-700/60',  badge: 'bg-green-900/60 text-green-300',  icon: '✓', label: 'Nice!'    },
  opening:  { border: 'border-blue-700/60',   badge: 'bg-blue-900/60 text-blue-300',    icon: '♟', label: 'Opening'  },
  tactic:   { border: 'border-purple-700/60', badge: 'bg-purple-900/60 text-purple-300',icon: '⚡', label: 'Tactics'  },
  strategy: { border: 'border-amber-700/60',  badge: 'bg-amber-900/60 text-amber-300',  icon: '♛', label: 'Strategy' },
  endgame:  { border: 'border-teal-700/60',   badge: 'bg-teal-900/60 text-teal-300',    icon: '♔', label: 'Endgame'  },
  info:     { border: 'border-gray-700/40',   badge: 'bg-gray-800 text-gray-400',       icon: '🎓', label: 'Coach'   },
};

interface Props {
  tip: CoachTip;
  engineNote?: string;
  suggestedMove?: string;
  compact?: boolean;        // hide body (controlled by filter)
}

export function MoveCoach({ tip, engineNote, suggestedMove, compact = false }: Props) {
  const [expanded, setExpanded] = useState(true);
  const s = CATEGORY_STYLES[tip.category];
  const bodyVisible = !compact && expanded;

  return (
    <div className={`rounded-xl border ${s.border} bg-gray-800/40 overflow-hidden transition-all`}>
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${s.badge}`}>
          {s.icon} {s.label}
        </span>
        <span className="text-sm font-semibold text-white flex-1 min-w-0">{tip.headline}</span>
        {!compact && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex-shrink-0 text-gray-600 hover:text-gray-400 text-xs px-1"
            title={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? '▲' : '▼'}
          </button>
        )}
      </div>

      {/* Body */}
      {bodyVisible && (
        <div className="px-3 pb-3 space-y-2">
          <p className="text-xs text-gray-300 leading-relaxed">{tip.body}</p>

          {/* "What should I have played" — engine suggestion for previous position */}
          {suggestedMove && (
            <div className="flex items-start gap-2 bg-blue-950/50 border border-blue-800/40 rounded-lg px-2 py-1.5">
              <span className="text-blue-400 text-xs flex-shrink-0 mt-0.5">Instead:</span>
              <span className="text-xs text-blue-200 font-mono">{suggestedMove}</span>
            </div>
          )}

          {/* Engine note — best move in current position */}
          {engineNote && (
            <div className="flex items-start gap-2 bg-green-950/50 border border-green-800/40 rounded-lg px-2 py-1.5">
              <span className="text-green-400 text-xs flex-shrink-0 mt-0.5">⚙</span>
              <span className="text-xs text-green-200">{engineNote}</span>
            </div>
          )}
        </div>
      )}

      {/* Compact: just show engine note inline if present */}
      {compact && engineNote && (
        <div className="px-3 pb-2">
          <span className="text-xs text-green-400">⚙ {engineNote}</span>
        </div>
      )}
    </div>
  );
}
