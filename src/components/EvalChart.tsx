import { useMemo } from 'react';
import type { MoveAnnotation } from '../lib/game-analyzer';

interface Props {
  moves: MoveAnnotation[];
  currentPly: number;
  onSeek: (ply: number) => void;
}

const W = 800;
const H = 80;
const MID = H / 2;
const MAX_CP = 10; // clamp at ±10 pawns

function clamp(v: number) {
  return Math.max(-MAX_CP, Math.min(MAX_CP, v));
}

export function EvalChart({ moves, currentPly, onSeek }: Props) {
  const hasData = moves.some(m => m.eval != null);

  const pts = useMemo(() => {
    if (!hasData) return [];
    return moves.map((m, i) => {
      const ev = clamp(m.eval ?? 0);
      const x = moves.length < 2 ? 0 : (i / (moves.length - 1)) * W;
      const y = MID - (ev / MAX_CP) * MID;
      return { x, y, nag: m.nag };
    });
  }, [moves, hasData]);

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-16 bg-gray-800/20 rounded-lg border border-gray-800/50">
        <p className="text-xs text-gray-600">No eval data in PGN — turn on Engine for live analysis</p>
      </div>
    );
  }

  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${line} L${W},${MID} L0,${MID} Z`;

  // Current position X — ply 0 means start (before any move), else maps to moves[ply-1]
  const curX = currentPly <= 0 ? -1
    : ((Math.min(currentPly - 1, moves.length - 1)) / Math.max(1, moves.length - 1)) * W;

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const moveIdx = Math.round(ratio * (moves.length - 1));
    onSeek(moveIdx + 1);
  };

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="w-full rounded-lg cursor-pointer select-none"
      style={{ height: 80, display: 'block' }}
      onClick={handleClick}
    >
      <defs>
        <clipPath id="ec-top">
          <rect x={0} y={0} width={W} height={MID} />
        </clipPath>
        <clipPath id="ec-bot">
          <rect x={0} y={MID} width={W} height={MID} />
        </clipPath>
      </defs>

      {/* Background */}
      <rect width={W} height={H} fill="#0f172a" />

      {/* White advantage fill — area clipped to upper half */}
      <path d={area} fill="rgba(225,215,185,0.88)" clipPath="url(#ec-top)" />

      {/* Black advantage fill — area clipped to lower half */}
      <path d={area} fill="rgba(18,18,28,0.96)" clipPath="url(#ec-bot)" />

      {/* Zero (equal) line */}
      <line x1={0} y1={MID} x2={W} y2={MID} stroke="#334155" strokeWidth={0.8} />

      {/* Eval line */}
      <path d={line} fill="none" stroke="rgba(100,116,139,0.9)" strokeWidth={1.5} />

      {/* NAG markers */}
      {pts.map((p, i) => {
        if (p.nag === 2) return <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="#ef4444" />;
        if (p.nag === 4) return <circle key={i} cx={p.x} cy={p.y} r={3} fill="#f97316" />;
        if (p.nag === 6) return <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="#eab308" />;
        return null;
      })}

      {/* Current ply indicator */}
      {curX >= 0 && (
        <line
          x1={curX} y1={0} x2={curX} y2={H}
          stroke="#f59e0b" strokeWidth={1.5} strokeOpacity={0.85}
        />
      )}
    </svg>
  );
}
