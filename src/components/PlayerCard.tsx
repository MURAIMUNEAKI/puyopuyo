import React, { useState } from 'react';
import { CPUDifficulty } from '../types/puyo';
import { DIFFICULTY_CONFIGS } from '../utils/difficulty';

interface PlayerCardProps {
  id: 'player' | 'cpu';
  name: string;
  avatarUrl: string;
  score: number;
  wins: number;
  maxChain: number;
  difficulty?: CPUDifficulty;
  isResolving?: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  id,
  name,
  avatarUrl,
  score,
  wins,
  maxChain,
  difficulty,
  isResolving = false,
}) => {
  const [imgError, setImgError] = useState(false);
  const isCpu = id === 'cpu';
  const diffConfig = difficulty ? DIFFICULTY_CONFIGS[difficulty] : null;

  return (
    <div
      className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors ${
        isCpu
          ? 'bg-slate-900/80 border-slate-800'
          : 'bg-slate-900/80 border-slate-800'
      }`}
    >
      {/* Avatar Image with fallback */}
      <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-slate-700/80 bg-slate-800 shadow-md">
        {!imgError ? (
          <img
            src={avatarUrl}
            alt={name}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-700 to-slate-800 text-white font-bold text-lg">
            {name.charAt(0)}
          </div>
        )}

        {/* Status ring when chaining */}
        {isResolving && (
          <span className="absolute inset-0 rounded-xl ring-2 ring-amber-400 ring-offset-1 ring-offset-slate-900 animate-pulse pointer-events-none" />
        )}
      </div>

      {/* Info column */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-slate-100 truncate">{name}</span>
          {isCpu && diffConfig && (
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                difficulty === 'easy'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                  : difficulty === 'normal'
                  ? 'bg-sky-950 text-sky-300 border border-sky-800/60'
                  : difficulty === 'hard'
                  ? 'bg-purple-950 text-purple-300 border border-purple-800/60'
                  : 'bg-rose-950 text-rose-300 border border-rose-800/60'
              }`}
            >
              {diffConfig.name}
            </span>
          )}
        </div>

        {/* Score & wins */}
        <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
          <span className="tabular-nums font-medium text-slate-300">
            スコア: <strong className="text-amber-400 font-bold">{score.toLocaleString()}</strong>
          </span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="tabular-nums text-slate-400">
            勝利: <strong className="text-emerald-400 font-bold">{wins}</strong>勝
          </span>
        </div>
      </div>

      {/* Max chain indicator */}
      {maxChain > 0 && (
        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase font-semibold text-slate-500">MAX</div>
          <div className="text-xs font-bold text-amber-300 tabular-nums">{maxChain} 連鎖</div>
        </div>
      )}
    </div>
  );
};
