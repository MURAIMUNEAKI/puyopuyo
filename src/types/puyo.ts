export type PuyoColor = 'red' | 'green' | 'blue' | 'yellow' | 'purple' | 'garbage';

export interface Cell {
  id: string;
  color: PuyoColor;
  popping?: boolean;
  bouncing?: boolean;
  chainIndex?: number;
}

export type Board = (Cell | null)[][]; // 6 columns x 13 rows (0 is ghost row, 1-12 are visible)

export const BOARD_COLS = 6;
export const BOARD_ROWS = 13; // row 0 is hidden/ghost, row 1-12 are visible
export const DEFEAT_COL = 2; // 0-indexed column 2 (3rd column)
export const DEFEAT_ROW = 1; // 1st visible row

export type RotationState = 0 | 1 | 2 | 3; // 0: up, 1: right, 2: down, 3: left

export interface ActivePair {
  col: number;      // Axis column (0-5)
  row: number;      // Axis row (can be float during fall, rounded during lock)
  rot: RotationState;
  colors: [PuyoColor, PuyoColor]; // [axisColor, childColor]
}

export type CPUDifficulty = 'easy' | 'normal' | 'hard' | 'expert';

export interface DifficultyConfig {
  id: CPUDifficulty;
  name: string;
  label: string;
  avatar: string;
  characterName: string;
  title: string;
  description: string;
  thinkSpeedMs: number;
  dropSpeedMs: number;
  chainTarget: string;
  aggressiveness: number;
}

export type GameMode = 'vs_cpu' | 'solo';
export type MatchStatus = 'idle' | 'countdown' | 'playing' | 'paused' | 'gameover';

export interface PlayerState {
  id: 'player' | 'cpu';
  name: string;
  isCpu: boolean;
  difficulty?: CPUDifficulty;
  board: Board;
  currentPair: ActivePair | null;
  nextPairs: [PuyoColor, PuyoColor][];
  pendingGarbage: number; // Queued nuisance waiting to drop
  targetGarbage: number;  // Nuisance attacking opponent right now
  score: number;
  chainCount: number;
  maxChain: number;
  isResolving: boolean; // board is currently chaining/dropping
  shake: boolean;
  lost: boolean;
  won: boolean;
  allClear: boolean;
  lastChainVoice?: string;
  dropCounter: number;
}
