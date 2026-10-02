import React, { useMemo } from 'react';
import {
  ActivePair,
  BOARD_COLS,
  BOARD_ROWS,
  Board,
  DEFEAT_COL,
  DEFEAT_ROW,
  PuyoColor,
} from '../types/puyo';
import { getChildOffset, getLowestAvailableRow } from '../utils/puyoLogic';
import { PuyoItem } from './PuyoItem';

interface GameBoardProps {
  board: Board;
  currentPair: ActivePair | null;
  shake?: boolean;
  chainCount?: number;
  chainVoice?: string;
  isPlayer?: boolean;
  isAllClear?: boolean;
  cellSize?: number;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  board,
  currentPair,
  shake = false,
  chainCount = 0,
  chainVoice = '',
  isPlayer = true,
  isAllClear = false,
  cellSize = 38,
}) => {
  // Pre-calculate connection map for each cell on the board
  // Same color puyos connect smoothly
  const connectionsMap = useMemo(() => {
    const map: Record<string, { top: boolean; right: boolean; bottom: boolean; left: boolean }> = {};

    for (let c = 0; c < BOARD_COLS; c++) {
      for (let r = 1; r < BOARD_ROWS; r++) {
        const cell = board[c][r];
        if (!cell || cell.color === 'garbage') continue;

        const color = cell.color;
        const top = r > 1 && board[c][r - 1]?.color === color;
        const bottom = r < BOARD_ROWS - 1 && board[c][r + 1]?.color === color;
        const left = c > 0 && board[c - 1][r]?.color === color;
        const right = c < BOARD_COLS - 1 && board[c + 1][r]?.color === color;

        map[`${c},${r}`] = { top, right, bottom, left };
      }
    }

    return map;
  }, [board]);

  // Compute ghost piece position (where active pair lands if dropped right now)
  const ghostPair = useMemo(() => {
    if (!currentPair) return null;
    const { col, rot } = currentPair;
    const [dx, dy] = getChildOffset(rot);
    const childCol = col + dx;

    if (childCol < 0 || childCol >= BOARD_COLS) return null;

    if (rot === 0) {
      // Child above axis
      const axisLowest = getLowestAvailableRow(board, col);
      if (axisLowest < 0) return null;
      return {
        axisCol: col,
        axisRow: axisLowest,
        childCol: col,
        childRow: axisLowest - 1,
      };
    } else if (rot === 2) {
      // Child below axis
      const childLowest = getLowestAvailableRow(board, col);
      if (childLowest < 0) return null;
      return {
        axisCol: col,
        axisRow: childLowest - 1,
        childCol: col,
        childRow: childLowest,
      };
    } else {
      // Horizontal
      const axisLowest = getLowestAvailableRow(board, col);
      const childLowest = getLowestAvailableRow(board, childCol);
      if (axisLowest < 0 || childLowest < 0) return null;
      return {
        axisCol: col,
        axisRow: axisLowest,
        childCol: childCol,
        childRow: childLowest,
      };
    }
  }, [board, currentPair]);

  // Total visible rows: 13 rows (row 0 is entrance, rows 1 to 12 are playing field)
  const visibleRows = Array.from({ length: 13 }, (_, i) => i);

  return (
    <div
      className={`relative rounded-xl border-2 transition-transform duration-100 p-1.5 select-none ${
        shake ? 'animate-shake' : ''
      } ${
        isPlayer
          ? 'bg-slate-900/90 border-sky-600/50 shadow-lg shadow-sky-950/40'
          : 'bg-slate-900/90 border-rose-600/40 shadow-lg shadow-rose-950/40'
      }`}
    >
      {/* Grid container */}
      <div
        className="grid grid-cols-6 gap-[2px] bg-slate-950/80 rounded-lg p-1 relative overflow-hidden"
        style={{
          width: `${BOARD_COLS * (cellSize + 2) + 8}px`,
          height: `${13 * (cellSize + 2) + 8}px`,
        }}
      >
        {/* Subtle grid background checker */}
        <div className="absolute inset-0 grid grid-cols-6 grid-rows-13 pointer-events-none opacity-20">
          {Array.from({ length: 78 }).map((_, i) => (
            <div
              key={`bg-${i}`}
              className={`border-[0.5px] border-slate-700 ${
                i % 2 === 0 ? 'bg-slate-800/10' : 'bg-transparent'
              }`}
            />
          ))}
        </div>

        {/* Entrance Row Separator (Dashed line below row 0) */}
        <div
          className="absolute left-1 right-1 border-b border-dashed border-slate-700/60 pointer-events-none z-10"
          style={{ top: `${1 * (cellSize + 2) + 4}px` }}
        />

        {/* Defeat marker (X) at Column 2, Row 1 */}
        <div
          className="absolute z-20 pointer-events-none flex items-center justify-center font-bold text-rose-500 opacity-70"
          style={{
            left: `${DEFEAT_COL * (cellSize + 2) + 5}px`,
            top: `${1 * (cellSize + 2) + 5}px`,
            width: `${cellSize}px`,
            height: `${cellSize}px`,
          }}
        >
          <span className="text-xl leading-none">✕</span>
        </div>

        {/* Board Cells (Rendered column by column, visible rows 1..12) */}
        {Array.from({ length: BOARD_COLS }).map((_, c) => (
          <div key={`col-${c}`} className="flex flex-col gap-[2px] relative">
            {visibleRows.map((r) => {
              const cell = board[c][r];
              const conn = connectionsMap[`${c},${r}`];

              // Check if ghost piece occupies this position
              const isGhostAxis =
                isPlayer &&
                ghostPair &&
                ghostPair.axisCol === c &&
                ghostPair.axisRow === r &&
                !cell;
              const isGhostChild =
                isPlayer &&
                ghostPair &&
                ghostPair.childCol === c &&
                ghostPair.childRow === r &&
                !cell;

              // Check if active falling pair occupies this position
              const isPairAxis =
                currentPair &&
                currentPair.col === c &&
                Math.round(currentPair.row) === r;

              let isPairChild = false;
              if (currentPair) {
                const [dx, dy] = getChildOffset(currentPair.rot);
                if (
                  currentPair.col + dx === c &&
                  Math.round(currentPair.row + dy) === r
                ) {
                  isPairChild = true;
                }
              }

              return (
                <div
                  key={`cell-${c}-${r}`}
                  className="relative flex items-center justify-center rounded"
                  style={{ width: `${cellSize}px`, height: `${cellSize}px` }}
                >
                  {/* Placed cell */}
                  {cell && (
                    <PuyoItem
                      color={cell.color}
                      size={cellSize}
                      connecting={conn}
                      isPopping={cell.popping}
                    />
                  )}

                  {/* Active falling pair piece */}
                  {!cell && isPairAxis && currentPair && (
                    <PuyoItem
                      color={currentPair.colors[0]}
                      size={cellSize}
                    />
                  )}
                  {!cell && isPairChild && currentPair && (
                    <PuyoItem
                      color={currentPair.colors[1]}
                      size={cellSize}
                    />
                  )}

                  {/* Ghost piece projection (Player only) */}
                  {!cell &&
                    !isPairAxis &&
                    !isPairChild &&
                    isGhostAxis &&
                    currentPair && (
                      <PuyoItem
                        color={currentPair.colors[0]}
                        size={cellSize}
                        isGhost={true}
                      />
                    )}
                  {!cell &&
                    !isPairAxis &&
                    !isPairChild &&
                    isGhostChild &&
                    currentPair && (
                      <PuyoItem
                        color={currentPair.colors[1]}
                        size={cellSize}
                        isGhost={true}
                      />
                    )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Chain pop overlay announcement */}
        {chainCount > 0 && (
          <div className="absolute inset-0 z-30 pointer-events-none flex flex-col items-center justify-center bg-black/25 backdrop-blur-[1px] animate-fade-in">
            <div className="transform -rotate-6 bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white font-extrabold px-4 py-1.5 rounded-xl shadow-2xl border-2 border-yellow-200 text-center animate-bounce">
              <div className="text-2xl tracking-wider drop-shadow-md">
                {chainCount} 連鎖！
              </div>
              {chainVoice && (
                <div className="text-xs font-bold text-yellow-100 tracking-wide mt-0.5">
                  {chainVoice}
                </div>
              )}
            </div>
          </div>
        )}

        {/* All Clear Announcement (Zenkeshi) */}
        {isAllClear && (
          <div className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center bg-amber-950/40 backdrop-blur-xs">
            <div className="bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl border-4 border-white shadow-2xl text-xl tracking-widest animate-pulse">
              ✨ 全消し (ALL CLEAR) ✨
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
