import React from 'react';
import { calculateGarbageIcons } from '../utils/puyoLogic';

interface NuisanceTrayProps {
  amount: number;
  label?: string;
}

export const NuisanceTray: React.FC<NuisanceTrayProps> = ({ amount, label = '予告おじゃま' }) => {
  const icons = calculateGarbageIcons(amount);
  const hasGarbage = amount > 0;

  return (
    <div className="w-full bg-slate-900/80 border border-slate-800 rounded-lg p-2 flex items-center justify-between min-h-[46px] shadow-inner">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-semibold text-slate-400">{label}</span>
        {hasGarbage && (
          <span className="text-xs font-mono font-bold text-rose-400 tabular-nums bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-900/40 animate-pulse">
            {amount}個
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 overflow-x-auto max-w-[200px] py-0.5">
        {!hasGarbage ? (
          <span className="text-xs text-slate-600 italic">なし</span>
        ) : (
          <>
            {/* Crown (144) */}
            {Array.from({ length: icons.crowns }).map((_, i) => (
              <span
                key={`crown-${i}`}
                title="王冠 (144個)"
                className="text-base select-none animate-bounce"
              >
                👑
              </span>
            ))}
            {/* Comet (72) */}
            {Array.from({ length: icons.comets }).map((_, i) => (
              <span
                key={`comet-${i}`}
                title="彗星 (72個)"
                className="text-base select-none"
              >
                ☄️
              </span>
            ))}
            {/* Red Rock (30) */}
            {Array.from({ length: icons.redRocks }).map((_, i) => (
              <span
                key={`redrock-${i}`}
                title="赤ぷよ岩 (30個)"
                className="w-4 h-4 rounded-full bg-rose-600 border border-rose-400 inline-block shadow-sm"
              />
            ))}
            {/* Big Rock (6) */}
            {Array.from({ length: icons.bigRocks }).map((_, i) => (
              <span
                key={`bigrock-${i}`}
                title="大岩 (6個)"
                className="w-3.5 h-3.5 rounded-full bg-slate-400 border border-slate-300 inline-block shadow-sm"
              />
            ))}
            {/* Small Rock (1) */}
            {Array.from({ length: icons.smallPebbles }).map((_, i) => (
              <span
                key={`small-${i}`}
                title="小ぷよ (1個)"
                className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block opacity-85"
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
};
