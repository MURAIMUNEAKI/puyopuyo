import {
  BOARD_COLS,
  BOARD_ROWS,
  Board,
  CPUDifficulty,
  DEFEAT_COL,
  DEFEAT_ROW,
  PuyoColor,
  RotationState,
} from '../types/puyo';
import {
  applyGravity,
  canPlacePair,
  checkAndPopPuyos,
  cloneBoard,
  createCell,
  getChildOffset,
  getLowestAvailableRow,
} from './puyoLogic';

export interface AIMove {
  targetCol: number;
  targetRot: RotationState;
}

/**
 * Simulates placing a pair onto a copy of the board
 * and runs gravity. Returns the resulting board and whether it survived.
 */
function simulateDrop(
  board: Board,
  col: number,
  rot: RotationState,
  colors: [PuyoColor, PuyoColor]
): { testBoard: Board; survived: boolean; totalChains: number; totalGarbage: number } | null {
  const testBoard = cloneBoard(board);
  const [dx, dy] = getChildOffset(rot);
  const childCol = col + dx;

  if (childCol < 0 || childCol >= BOARD_COLS) return null;

  // Find where axis lands and where child lands
  // If vertical (rot = 0: child above, rot = 2: child below)
  if (rot === 0) {
    // Axis below, child above
    const axisRow = getLowestAvailableRow(testBoard, col);
    if (axisRow < 1) return null; // blocked
    const childRow = axisRow - 1;
    if (childRow < 0) return null;
    testBoard[col][axisRow] = createCell(colors[0]);
    testBoard[col][childRow] = createCell(colors[1]);
  } else if (rot === 2) {
    // Child below, axis above
    const childRow = getLowestAvailableRow(testBoard, col);
    if (childRow < 1) return null;
    const axisRow = childRow - 1;
    if (axisRow < 0) return null;
    testBoard[col][childRow] = createCell(colors[1]);
    testBoard[col][axisRow] = createCell(colors[0]);
  } else {
    // Horizontal (rot = 1 or 3)
    const axisRow = getLowestAvailableRow(testBoard, col);
    const childRow = getLowestAvailableRow(testBoard, childCol);
    if (axisRow < 0 || childRow < 0) return null;
    testBoard[col][axisRow] = createCell(colors[0]);
    testBoard[childCol][childRow] = createCell(colors[1]);
  }

  applyGravity(testBoard);

  // Check if defeat point is blocked immediately
  if (testBoard[DEFEAT_COL][DEFEAT_ROW] !== null) {
    return { testBoard, survived: false, totalChains: 0, totalGarbage: 0 };
  }

  // Simulate chain reaction
  let chainIndex = 0;
  let totalGarbage = 0;
  while (true) {
    const popRes = checkAndPopPuyos(testBoard, chainIndex);
    if (!popRes.hasPopped) break;
    chainIndex++;
    totalGarbage += popRes.garbageGenerated;
    applyGravity(testBoard);
  }

  const survived = testBoard[DEFEAT_COL][DEFEAT_ROW] === null;
  return { testBoard, survived, totalChains: chainIndex, totalGarbage };
}

/**
 * Evaluates board connection potential (pairs, triplets of same color)
 */
function evaluateBoardHarmony(board: Board): number {
  let harmony = 0;
  const visited: boolean[][] = Array.from({ length: BOARD_COLS }, () =>
    Array(BOARD_ROWS).fill(false)
  );

  for (let c = 0; c < BOARD_COLS; c++) {
    for (let r = 1; r < BOARD_ROWS; r++) {
      const cell = board[c][r];
      if (!cell || cell.color === 'garbage' || visited[c][r]) continue;

      let groupSize = 0;
      const targetColor = cell.color;
      const queue: [number, number][] = [[c, r]];
      visited[c][r] = true;

      while (queue.length > 0) {
        const [currC, currR] = queue.shift()!;
        groupSize++;

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
            nr >= 1 &&
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

      // Bonus for 2 or 3 same color connected (building towards 4)
      if (groupSize === 2) harmony += 25;
      if (groupSize === 3) harmony += 60;
    }
  }

  return harmony;
}

/**
 * Calculates height penalty, keeping col 2 low and board relatively even
 */
function evaluateBoardShape(board: Board): number {
  let score = 0;
  const heights: number[] = [];

  for (let c = 0; c < BOARD_COLS; c++) {
    let height = 0;
    for (let r = 1; r < BOARD_ROWS; r++) {
      if (board[c][r] !== null) {
        height = BOARD_ROWS - r;
        break;
      }
    }
    heights.push(height);
  }

  // Heavy penalty if column 2 is too tall (near the X mark at row 1, which is height 12)
  const dangerColHeight = heights[DEFEAT_COL];
  if (dangerColHeight >= 10) score -= 500;
  else if (dangerColHeight >= 8) score -= 200;
  else score += (10 - dangerColHeight) * 10;

  // Valley/cliff penalty
  for (let c = 0; c < BOARD_COLS - 1; c++) {
    const diff = Math.abs(heights[c] - heights[c + 1]);
    if (diff > 3) score -= diff * 15;
  }

  return score;
}

/**
 * Main AI move decider
 */
export function calculateBestMove(
  board: Board,
  colors: [PuyoColor, PuyoColor],
  difficulty: CPUDifficulty,
  incomingGarbage: number
): AIMove {
  // Candidate placements: (col 0-5, rot 0-3)
  const candidates: { col: number; rot: RotationState; score: number }[] = [];

  const rotations: RotationState[] = [0, 1, 2, 3];

  for (let col = 0; col < BOARD_COLS; col++) {
    for (const rot of rotations) {
      // Check basic boundary
      const [dx] = getChildOffset(rot);
      const childCol = col + dx;
      if (childCol < 0 || childCol >= BOARD_COLS) continue;

      const sim = simulateDrop(board, col, rot, colors);
      if (!sim || !sim.survived) continue;

      let score = 0;

      if (difficulty === 'easy') {
        // Easy: Add random noise, mild preference for lower heights
        score = Math.random() * 80;
        // Occasionally pops immediately (50% chance if 1 chain is available)
        if (sim.totalChains >= 1) {
          score += Math.random() > 0.4 ? 40 : -20;
        }
        // Small penalty if death col is very high
        const lowestRow = getLowestAvailableRow(sim.testBoard, DEFEAT_COL);
        if (lowestRow <= 3) score -= 100;
      } else if (difficulty === 'normal') {
        // Normal: Evaluates color grouping and avoids death point
        const harmony = evaluateBoardHarmony(sim.testBoard);
        const shape = evaluateBoardShape(sim.testBoard);
        score = harmony + shape;

        // Moderate preference for 2-3 chains
        if (sim.totalChains >= 2) {
          score += sim.totalChains * 80;
        } else if (sim.totalChains === 1 && incomingGarbage < 4) {
          // Discourage premature 1-chain unless necessary
          score -= 30;
        }

        if (incomingGarbage >= 6 && sim.totalChains >= 1) {
          // Counter incoming nuisance
          score += 150;
        }

        // Slight randomness to feel human
        score += (Math.random() - 0.5) * 20;
      } else if (difficulty === 'hard') {
        // Hard: Sophisticated chain builder
        const harmony = evaluateBoardHarmony(sim.testBoard);
        const shape = evaluateBoardShape(sim.testBoard);
        score = harmony * 1.5 + shape;

        // Big reward for high chains (3-5 chains)
        if (sim.totalChains >= 3) {
          score += sim.totalChains * 250;
        } else if (sim.totalChains === 2 && incomingGarbage >= 6) {
          score += 200; // Counter attack!
        } else if (sim.totalChains === 1) {
          // Strongly discourage popping 1 chain if safe
          if (incomingGarbage > 4) {
            score += 100; // Emergency offset
          } else {
            score -= 120; // Save the puyos for bigger chains!
          }
        }

        // Favor building in columns 0, 1, 4, 5 (sides) before center
        if (col === 0 || col === 5) score += 20;
        if (col === DEFEAT_COL) score -= 30;

        // Subtle variance
        score += (Math.random() - 0.5) * 8;
      } else {
        // Expert (げきむず): Ruthless chain optimization
        const harmony = evaluateBoardHarmony(sim.testBoard);
        const shape = evaluateBoardShape(sim.testBoard);
        score = harmony * 2.2 + shape * 1.2;

        if (sim.totalChains >= 4) {
          score += sim.totalChains * 400;
        } else if (sim.totalChains >= 2 && incomingGarbage >= 8) {
          score += 350; // Counter attack
        } else if (sim.totalChains === 1) {
          if (incomingGarbage >= 5) {
            score += 80;
          } else {
            score -= 250; // Never pop 1 chain when building high combos
          }
        }

        if (col === DEFEAT_COL) score -= 60;
      }

      candidates.push({ col, rot, score });
    }
  }

  if (candidates.length === 0) {
    // Fallback: Drop straight into col 0
    return { targetCol: 0, targetRot: 0 };
  }

  // Sort descending by score
  candidates.sort((a, b) => b.score - a.score);
  return { targetCol: candidates[0].col, targetRot: candidates[0].rot };
}
