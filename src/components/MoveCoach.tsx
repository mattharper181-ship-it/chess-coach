import type { CoachTip, CoachCategory } from '../lib/move-coach';

const CATEGORY_STYLES: Record<CoachCategory, { border: string; badge: string; badgeText: string; icon: string }> = {
  mistake: { border: 'border-red-700/60',   badge: 'bg-red-900/60 text-red-300',     badgeText: 'Mistake',  icon: '⚠' },
  good:    { border: 'border-green-700/60', badge: 'bg-green-900/60 text-green-300',  badgeText: 'Nice!',    icon: '✓' },
  opening: { border: 'border-blue-700/60',  badge: 'bg-blue-900/60 text-blue-300',   badgeText: 'Opening',  icon: '♟' },
  tactic:  { border: 'border-purple-700/60',badge: 'bg-purple-900/60 text-purple-300',badgeText: 'Tactics',  icon: '⚡' },
  strategy:{ border: 'border-amber-700/60', badge: 'bg-amber-900/60 text-amber-300', badgeText: 'Strategy', icon: '♛' },
  endgame: { border: 'border-teal-700/60',  badge: 'bg-teal-900/60 text-teal-300',   badgeText: 'Endgame',  icon: '♔' },
  info:    { border: 'border-gray-700/60',  badge: 'bg-gray-800 text-gray-400',      badgeText: 'Coach',    icon: '🎓' },
};

interface Props {
  tip: CoachTip;
}

export function MoveCoach({ tip }: Props) {
  const style = CATEGORY_STYLES[tip.category];

  return (
    <div className={`rounded-xl border ${style.border} bg-gray-800/40 p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.badge}`}>
          {style.icon} {style.badgeText}
        </span>
        <span className="text-sm font-semibold text-white">{tip.headline}</span>
      </div>
      <p className="text-xs text-gray-300 leading-relaxed">{tip.body}</p>
    </div>
  );
}
