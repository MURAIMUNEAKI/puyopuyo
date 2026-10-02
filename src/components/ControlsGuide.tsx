import React from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  RotateCcw,
  RotateCw,
} from 'lucide-react';

interface ControlsGuideProps {
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onSoftDrop: () => void;
  onHardDrop: () => void;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  disabled?: boolean;
}

export const ControlsGuide: React.FC<ControlsGuideProps> = ({
  onMoveLeft,
  onMoveRight,
  onSoftDrop,
  onHardDrop,
  onRotateLeft,
  onRotateRight,
  disabled = false,
}) => {
  return (
    <div className="w-full flex flex-col gap-3">
      {/* Mobile/Touch Virtual Gamepad */}
      <div className="lg:hidden w-full bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-lg select-none">
        <div className="flex items-center justify-between gap-4 max-w-sm mx-auto">
          {/* Directional Pad */}
          <div className="grid grid-cols-3 gap-1.5 w-36 h-36">
            <div />
            <button
              disabled={disabled}
              onPointerDown={(e) => {
                e.preventDefault();
                onHardDrop();
              }}
              className="bg-slate-800 active:bg-sky-600 active:scale-95 text-slate-200 rounded-lg flex items-center justify-center border border-slate-700 shadow-sm"
              title="クイック落下 (ハードドロップ)"
            >
              <ArrowUp className="w-6 h-6" />
            </button>
            <div />

            <button
              disabled={disabled}
              onPointerDown={(e) => {
                e.preventDefault();
                onMoveLeft();
              }}
              className="bg-slate-800 active:bg-sky-600 active:scale-95 text-slate-200 rounded-lg flex items-center justify-center border border-slate-700 shadow-sm"
              title="左へ移動"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="bg-slate-900/40 rounded-lg flex items-center justify-center text-[10px] text-slate-500 font-bold">
              十字
            </div>
            <button
              disabled={disabled}
              onPointerDown={(e) => {
                e.preventDefault();
                onMoveRight();
              }}
              className="bg-slate-800 active:bg-sky-600 active:scale-95 text-slate-200 rounded-lg flex items-center justify-center border border-slate-700 shadow-sm"
              title="右へ移動"
            >
              <ArrowRight className="w-6 h-6" />
            </button>

            <div />
            <button
              disabled={disabled}
              onPointerDown={(e) => {
                e.preventDefault();
                onSoftDrop();
              }}
              className="bg-slate-800 active:bg-sky-600 active:scale-95 text-slate-200 rounded-lg flex items-center justify-center border border-slate-700 shadow-sm"
              title="高速落下 (ソフトドロップ)"
            >
              <ArrowDown className="w-6 h-6" />
            </button>
            <div />
          </div>

          {/* Action / Rotate Buttons */}
          <div className="flex flex-col gap-2.5 items-center justify-center">
            <div className="flex gap-2">
              <button
                disabled={disabled}
                onPointerDown={(e) => {
                  e.preventDefault();
                  onRotateLeft();
                }}
                className="w-14 h-14 bg-indigo-900/80 active:bg-indigo-600 active:scale-95 text-indigo-100 rounded-full flex flex-col items-center justify-center border border-indigo-700/80 shadow-md"
                title="左回転 (反時計回り)"
              >
                <RotateCcw className="w-5 h-5 mb-0.5" />
                <span className="text-[9px] font-bold">左回転</span>
              </button>

              <button
                disabled={disabled}
                onPointerDown={(e) => {
                  e.preventDefault();
                  onRotateRight();
                }}
                className="w-14 h-14 bg-sky-900/80 active:bg-sky-600 active:scale-95 text-sky-100 rounded-full flex flex-col items-center justify-center border border-sky-700/80 shadow-md"
                title="右回転 (時計回り)"
              >
                <RotateCw className="w-5 h-5 mb-0.5" />
                <span className="text-[9px] font-bold">右回転</span>
              </button>
            </div>

            <button
              disabled={disabled}
              onPointerDown={(e) => {
                e.preventDefault();
                onHardDrop();
              }}
              className="w-full py-2 bg-amber-900/60 active:bg-amber-600 active:scale-95 text-amber-200 rounded-lg text-xs font-bold border border-amber-700/80"
            >
              一気に落下 (Space)
            </button>
          </div>
        </div>
      </div>

      {/* Keyboard Controls Desktop Reference */}
      <div className="hidden lg:grid grid-cols-2 gap-2 p-3 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-slate-300">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">移動:</span>
          <div className="flex gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded font-mono text-[10px]">
              ←
            </kbd>
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded font-mono text-[10px]">
              →
            </kbd>
            <span className="text-slate-500">/</span>
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded font-mono text-[10px]">
              A
            </kbd>
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded font-mono text-[10px]">
              D
            </kbd>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400">高速落下:</span>
          <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded font-mono text-[10px]">
            ↓ / S
          </kbd>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400">回転:</span>
          <div className="flex gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded font-mono text-[10px]" title="左回転">
              Z
            </kbd>
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded font-mono text-[10px]" title="右回転">
              X / ↑ / W
            </kbd>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400">一気に落下:</span>
          <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded font-mono text-[10px]">
            Space
          </kbd>
        </div>
      </div>
    </div>
  );
};
