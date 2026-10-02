import {
  BOARD_COLS,
  BOARD_ROWS,
  Board,
  Cell,
  DEFEAT_COL,
  DEFEAT_ROW,
  PuyoColor,
  RotationState,
} from '../types/puyo';

export const PLAYABLE_COLORS: PuyoColor[] = ['red', 'green', 'blue', 'yellow'];

let idCounter = 1;
export function createCell(color: PuyoColor): Cell {
  return {
    id: `puyo-${idCounter++}-${Math.random().toString(36).substring(2, 7)}`,
    color,
  };
}

export function createEmptyBoard(): Board {
  const board: Board = [];
  for (let c = 0; c < BOARD_COLS; c++) {
    const col: (Cell | null)[] = [];
    for (let r = 0; r < BOARD_ROWS; r++) {
      col.push(null);
    }
    board.push(col);
  }
  return board;
}

export function cloneBoard(board: Board): Board {
  return board.map((col) =>
    col.map((cell) => (cell ? { ...cell } : null))
  );
}

/**
 * Fair random pair generator
 */
export function generateRandomPair(): [PuyoColor, PuyoColor] {
  const c1 = PLAYABLE_COLORS[Math.floor(Math.random() * PLAYABLE_COLORS.length)];
  const c2 = PLAYABLE_COLORS[Math.floor(Math.random() * PLAYABLE_COLORS.length)];
  return [c1, c2];
}

/**
 * Returns the relative offset [dx, dy] of the child puyo for a given rotation
 * 0: Up (0, -1)
 * 1: Right (1, 0)
 * 2: Down (0, 1)
 * 3: Left (-1, 0)
 */
export function getChildOffset(rot: RotationState): [number, number] {
  switch (rot) {
    case 0:
      return [0, -1];
    case 1:
      return [1, 0];
    case 2:
      return [0, 1];
    case 3:
      return [-1, 0];
  }
}

/**
 * Checks if a specific position is within board bounds and unoccupied
 */
export function isValidPos(board: Board, col: number, row: number): boolean {
  if (col < 0 || col >= BOARD_COLS) return false;
  if (row < 0 || row >= BOARD_ROWS) return false;
  return board[col][row] === null;
}

/**
 * Checks if a pair can exist at (col, row) with rotation rot
 */
export function canPlacePair(
  board: Board,
  col: number,
  row: number,
  rot: RotationState
): boolean {
  if (!isValidPos(board, col, row)) return false;
  const [dx, dy] = getChildOffset(rot);
  const childCol = col + dx;
  const childRow = row + dy;
  return isValidPos(board, childCol, childRow);
}

/**
 * Calculate lowest row where a puyo can fall in a column
 */
export function getLowestAvailableRow(board: Board, col: number): number {
  for (let r = BOARD_ROWS - 1; r >= 0; r--) {
    if (board[col][r] === null) {
      return r;
    }
  }
  return -1;
}

/**
 * Apply gravity: all floating puyos drop down to the bottom
 * Returns whether any puyo moved
 */
export function applyGravity(board: Board): boolean {
  let moved = false;
  for (let c = 0; c < BOARD_COLS; c++) {
    let writeRow = BOARD_ROWS - 1;
    for (let r = BOARD_ROWS - 1; r >= 0; r--) {
      if (board[c][r] !== null) {
        if (writeRow !== r) {
          board[c][writeRow] = board[c][r];
          board[c][r] = null;
          moved = true;
        }
        writeRow--;
      }
    }
  }
  return moved;
}

/**
 * Standard Puyo Tsu Chain Power Table
 */
const CHAIN_POWER_TABLE = [
  0, 8, 16, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 480, 512,
];

const COLOR_BONUS_TABLE = [0, 0, 3, 6, 12, 24]; // 1 color: 0, 2 colors: 3, 3: 6, 4: 12, 5: 24

function getGroupBonus(count: number): number {
  if (count <= 4) return 0;
  if (count === 5) return 2;
  if (count === 6) return 3;
  if (count === 7) return 4;
  if (count === 8) return 5;
  if (count === 9) return 6;
  if (count === 10) return 7;
  return 10;
}

export interface PopResult {
  hasPopped: boolean;
  poppedCount: number;
  clearedPuyos: { col: number; row: number }[];
  garbageGenerated: number;
  scoreEarned: number;
  isAllClear: boolean;
}

/**
 * Finds all 4+ connected groups of matching color (ignoring garbage)
 * and marks adjacent garbage for elimination
 */
export function checkAndPopPuyos(board: Board, chainIndex: number): PopResult {
  const visited: boolean[][] = Array.from({ length: BOARD_COLS }, () =>
    Array(BOARD_ROWS).fill(false)
  );
  const groupsToPop: { col: number; row: number; color: PuyoColor }[][] = [];
  const garbageToClear = new Set<string>();

  for (let c = 0; c < BOARD_COLS; c++) {
    for (let r = 0; r < BOARD_ROWS; r++) {
      const cell = board[c][r];
      if (!cell || cell.color === 'garbage' || visited[c][r]) continue;

      // Flood fill for connected same-colored puyos
      const group: { col: number; row: number; color: PuyoColor }[] = [];
      const queue: [number, number][] = [[c, r]];
      visited[c][r] = true;
      const targetColor = cell.color;

      while (queue.length > 0) {
        const [currC, currR] = queue.shift()!;
        group.push({ col: currC, row: currR, color: targetColor });

        const neighbors = [
          [currC + 1, currR],
          [currC - 1, currR],
          [currC, currR + 1],
          [currC, currR - 1],
        ];

        for (const [nc, nr] of neighbors) {
          if (
            nc >= 0 &&
            nc < BOARD_COLS &&
            nr >= 0 &&
            nr < BOARD_ROWS &&
            !visited[nc][nr]
          ) {
            const nCell = board[nc][nr];
            if (nCell && nCell.color === targetColor) {
              visited[nc][nr] = true;
              queue.push([nc, nr]);
            }
          }
        }
      }

      if (group.length >= 4) {
        groupsToPop.push(group);
      }
    }
  }

  if (groupsToPop.length === 0) {
    return {
      hasPopped: false,
      poppedCount: 0,
      clearedPuyos: [],
      garbageGenerated: 0,
      scoreEarned: 0,
      isAllClear: false,
    };
  }

  // Find adjacent garbage puyos to clear
  const allClearedCoords: { col: number; row: number }[] = [];
  const uniqueColors = new Set<PuyoColor>();
  let totalPopped = 0;
  let totalGroupBonus = 0;

  for (const group of groupsToPop) {
    totalPopped += group.length;
    uniqueColors.add(group[0].color);
    totalGroupBonus += getGroupBonus(group.length);

    for (const cellPos of group) {
      allClearedCoords.push({ col: cellPos.col, row: cellPos.row });

      // Check 4 adjacent directions for nuisance/garbage puyos
      const adjacent = [
        [cellPos.col + 1, cellPos.row],
        [cellPos.col - 1, cellPos.row],
        [cellPos.col, cellPos.row + 1],
        [cellPos.col, cellPos.row - 1],
      ];

      for (const [ac, ar] of adjacent) {
        if (ac >= 0 && ac < BOARD_COLS && ar >= 0 && ar < BOARD_ROWS) {
          const adjCell = board[ac][ar];
          if (adjCell && adjCell.color === 'garbage') {
            const key = `${ac},${ar}`;
            if (!garbageToClear.has(key)) {
              garbageToClear.add(key);
              allClearedCoords.push({ col: ac, row: ar });
            }
          }
        }
      }
    }
  }

  // Calculate Tsu score formula:
  // Base = 10 * totalPopped
  // Multiplier = ChainPower + ColorBonus + GroupBonus
  const chainPower =
    CHAIN_POWER_TABLE[Math.min(chainIndex, CHAIN_POWER_TABLE.length - 1)];
  const colorBonus = COLOR_BONUS_TABLE[Math.min(uniqueColors.size, 5)];
  let multiplier = chainPower + colorBonus + totalGroupBonus;
  if (multiplier < 1) multiplier = 1;
  if (multiplier > 999) multiplier = 999;

  const scoreEarned = totalPopped * 10 * multiplier;
  const garbageGenerated = Math.floor(scoreEarned / 70);

  // Remove popped cells from the board
  for (const coord of allClearedCoords) {
    board[coord.col][coord.row] = null;
  }

  // Check if board is completely cleared (Zenkeshi)
  let isAllClear = true;
  for (let c = 0; c < BOARD_COLS; c++) {
    for (let r = 0; r < BOARD_ROWS; r++) {
      if (board[c][r] !== null) {
        isAllClear = false;
        break;
      }
    }
    if (!isAllClear) break;
  }

  return {
    hasPopped: true,
    poppedCount: totalPopped,
    clearedPuyos: allClearedCoords,
    garbageGenerated,
    scoreEarned,
    isAllClear,
  };
}

/**
 * Drop queued nuisance puyos onto the board.
 * Up to 30 nuisance puyos (5 rows) can drop in one turn.
 * Drops evenly column by column.
 */
export function dropGarbage(
  board: Board,
  countToDrop: number
): { droppedCount: number; remainingCount: number } {
  const actualDrop = Math.min(countToDrop, 30);
  const remaining = countToDrop - actualDrop;

  let leftToPlace = actualDrop;
  // Fill rows from bottom available row
  // In Tsu, garbage drops evenly row by row across columns (random column order per row)
  while (leftToPlace > 0) {
    const cols = [0, 1, 2, 3, 4, 5].sort(() => Math.random() - 0.5);
    let placedInRow = 0;

    for (const c of cols) {
      if (leftToPlace <= 0) break;
      const r = getLowestAvailableRow(board, c);
      if (r >= 0) {
        board[c][r] = createCell('garbage');
        leftToPlace--;
        placedInRow++;
      }
    }

    if (placedInRow === 0) {
      // Board is completely full
      break;
    }
  }

  applyGravity(board);
  return { droppedCount: actualDrop - leftToPlace, remainingCount: remaining + leftToPlace };
}

/**
 * Defeat check: Check if defeat square (col 2, row 1) is occupied
 */
export function isDefeated(board: Board): boolean {
  return board[DEFEAT_COL][DEFEAT_ROW] !== null;
}

/**
 * Converts nuisance puyo number to tray icon counts
 * 144: Crown (王冠)
 * 72: Comet (彗星 / 月)
 * 30: Red Rock (赤ぷよ岩)
 * 6: Big Rock (大岩)
 * 1: Small Pebble (小ぷよ)
 */
export interface GarbageIcons {
  crowns: number;
  comets: number;
  redRocks: number;
  bigRocks: number;
  smallPebbles: number;
}

export function calculateGarbageIcons(amount: number): GarbageIcons {
  let count = amount;
  const crowns = Math.floor(count / 144);
  count %= 144;
  const comets = Math.floor(count / 72);
  count %= 72;
  const redRocks = Math.floor(count / 30);
  count %= 30;
  const bigRocks = Math.floor(count / 6);
  count %= 6;
  const smallPebbles = count;

  return { crowns, comets, redRocks, bigRocks, smallPebbles };
}
