import React from 'react';
import { CPUDifficulty } from '../types/puyo';
import { DIFFICULTY_CONFIGS } from '../utils/difficulty';

interface DifficultySelectorProps {
  currentDifficulty: CPUDifficulty;
  onSelect: (diff: CPUDifficulty) => void;
  disabled?: boolean;
}

export const DifficultySelector: React.FC<DifficultySelectorProps> = ({
  currentDifficulty,
  onSelect,
  disabled = false,
}) => {
  const difficulties: CPUDifficulty[] = ['easy', 'normal', 'hard', 'expert'];
  const activeConfig = DIFFICULTY_CONFIGS[currentDifficulty];

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          CPU 難易度設定
        </span>
        <span className="text-xs text-amber-400 font-medium">
          目安: {activeConfig.chainTarget}
        </span>
      </div>

      {/* Segmented button control */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950/90 rounded-lg border border-slate-800/80">
        {difficulties.map((diff) => {
          const cfg = DIFFICULTY_CONFIGS[diff];
          const isSelected = currentDifficulty === diff;

          let activeClass = 'bg-sky-600 text-white shadow-sm';
          if (diff === 'easy') activeClass = 'bg-emerald-600 text-white shadow-sm';
          if (diff === 'normal') activeClass = 'bg-sky-600 text-white shadow-sm';
          if (diff === 'hard') activeClass = 'bg-purple-600 text-white shadow-sm';
          if (diff === 'expert') activeClass = 'bg-rose-600 text-white shadow-sm';

          return (
            <button
              key={diff}
              disabled={disabled}
              onClick={() => onSelect(diff)}
              className={`py-2 px-2 rounded-md text-xs font-bold transition-all text-center truncate ${
                isSelected
                  ? activeClass
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {cfg.name}
            </button>
          );
        })}
      </div>

      {/* Selected difficulty brief character card */}
      <div className="mt-2.5 flex items-center gap-2.5 pt-2 border-t border-slate-800/60 text-xs text-slate-400">
        <img
          src={activeConfig.avatar}
          alt={activeConfig.characterName}
          className="w-8 h-8 rounded-lg object-cover border border-slate-700 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-200 truncate">
              {activeConfig.characterName}
            </span>
            <span className="text-[10px] text-slate-500">
              ({activeConfig.title})
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-tight truncate">
            {activeConfig.description}
          </p>
        </div>
      </div>
    </div>
  );
};
