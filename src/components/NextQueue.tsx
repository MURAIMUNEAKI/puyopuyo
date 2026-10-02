import React from 'react';
import { PuyoColor } from '../types/puyo';
import { PuyoItem } from './PuyoItem';

interface NextQueueProps {
  pairs: [PuyoColor, PuyoColor][];
}

export const NextQueue: React.FC<NextQueueProps> = ({ pairs }) => {
  const next1 = pairs[0];
  const next2 = pairs[1];

  return (
    <div className="flex flex-col items-center gap-2">
      {/* NEXT 1 */}
      <div className="flex flex-col items-center bg-slate-900/90 border border-slate-800 rounded-lg p-2 shadow-inner">
        <span className="text-[10px] font-bold text-amber-400 mb-1 tracking-wider uppercase">
          NEXT
        </span>
        {next1 ? (
          <div className="flex flex-col gap-0.5 items-center">
            {/* Child puyo on top */}
            <PuyoItem color={next1[1]} size={28} />
            {/* Axis puyo on bottom */}
            <PuyoItem color={next1[0]} size={28} />
          </div>
        ) : (
          <div className="w-7 h-14 bg-slate-800/40 rounded" />
        )}
      </div>

      {/* NEXT 2 */}
      {next2 && (
        <div className="flex flex-col items-center bg-slate-900/60 border border-slate-800/80 rounded-lg p-1.5 opacity-80">
          <span className="text-[9px] font-semibold text-slate-400 mb-1 tracking-wider uppercase">
            NEXT 2
          </span>
          <div className="flex flex-col gap-0.5 items-center scale-90">
            <PuyoItem color={next2[1]} size={24} />
            <PuyoItem color={next2[0]} size={24} />
          </div>
        </div>
      )}
    </div>
  );
};
