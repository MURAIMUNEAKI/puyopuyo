import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  HelpCircle,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ControlsGuide } from './components/ControlsGuide';
import { DifficultySelector } from './components/DifficultySelector';
import { GameBoard } from './components/GameBoard';
import { NextQueue } from './components/NextQueue';
import { NuisanceTray } from './components/NuisanceTray';
import { PlayerCard } from './components/PlayerCard';
import {
  ActivePair,
  BOARD_COLS,
  BOARD_ROWS,
  Board,
  CPUDifficulty,
  DEFEAT_COL,
  DEFEAT_ROW,
  MatchStatus,
  PuyoColor,
  RotationState,
} from './types/puyo';
import { DIFFICULTY_CONFIGS } from './utils/difficulty';
import { AIMove, calculateBestMove } from './utils/puyoAI';
import {
  applyGravity,
  canPlacePair,
  checkAndPopPuyos,
  cloneBoard,
  createCell,
  createEmptyBoard,
  dropGarbage,
  generateRandomPair,
  getChildOffset,
  getLowestAvailableRow,
  isDefeated,
} from './utils/puyoLogic';
import { SoundManager, soundManager } from './utils/sound';

export default function App() {
  // Game lifecycle
  const [matchStatus, setMatchStatus] = useState<MatchStatus>('idle');
  const [countdown, setCountdown] = useState<number>(3);
  const [difficulty, setDifficulty] = useState<CPUDifficulty>('normal');
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showChainsModal, setShowChainsModal] = useState<boolean>(false);

  // Audio toggles
  const [sfxMuted, setSfxMuted] = useState<boolean>(false);
  const [bgmMuted, setBgmMuted] = useState<boolean>(false);

  // Player 1 (Human)
  const [p1Board, setP1Board] = useState<Board>(createEmptyBoard);
  const [p1Pair, setP1Pair] = useState<ActivePair | null>(null);
  const [p1Queue, setP1Queue] = useState<[PuyoColor, PuyoColor][]>([]);
  const [p1PendingGarbage, setP1PendingGarbage] = useState<number>(0);
  const [p1Score, setP1Score] = useState<number>(0);
  const [p1Wins, setP1Wins] = useState<number>(0);
  const [p1MaxChain, setP1MaxChain] = useState<number>(0);
  const [p1CurrentChain, setP1CurrentChain] = useState<number>(0);
  const [p1ChainVoice, setP1ChainVoice] = useState<string>('');
  const [p1Resolving, setP1Resolving] = useState<boolean>(false);
  const [p1Shake, setP1Shake] = useState<boolean>(false);
  const [p1AllClear, setP1AllClear] = useState<boolean>(false);

  // Player 2 (CPU)
  const [cpuBoard, setCpuBoard] = useState<Board>(createEmptyBoard);
  const [cpuPair, setCpuPair] = useState<ActivePair | null>(null);
  const [cpuQueue, setCpuQueue] = useState<[PuyoColor, PuyoColor][]>([]);
  const [cpuPendingGarbage, setCpuPendingGarbage] = useState<number>(0);
  const [cpuScore, setCpuScore] = useState<number>(0);
  const [cpuWins, setCpuWins] = useState<number>(0);
  const [cpuMaxChain, setCpuMaxChain] = useState<number>(0);
  const [cpuCurrentChain, setCpuCurrentChain] = useState<number>(0);
  const [cpuChainVoice, setCpuChainVoice] = useState<string>('');
  const [cpuResolving, setCpuResolving] = useState<boolean>(false);
  const [cpuShake, setCpuShake] = useState<boolean>(false);
  const [cpuAllClear, setCpuAllClear] = useState<boolean>(false);

  // Winner announcement
  const [winner, setWinner] = useState<'player' | 'cpu' | null>(null);

  // Refs for tracking mutable game state inside loop ticks
  const p1BoardRef = useRef<Board>(p1Board);
  p1BoardRef.current = p1Board;
  const p1PairRef = useRef<ActivePair | null>(p1Pair);
  p1PairRef.current = p1Pair;
  const p1ResolvingRef = useRef<boolean>(p1Resolving);
  p1ResolvingRef.current = p1Resolving;

  const cpuBoardRef = useRef<Board>(cpuBoard);
  cpuBoardRef.current = cpuBoard;
  const cpuPairRef = useRef<ActivePair | null>(cpuPair);
  cpuPairRef.current = cpuPair;
  const cpuResolvingRef = useRef<boolean>(cpuResolving);
  cpuResolvingRef.current = cpuResolving;

  const matchStatusRef = useRef<MatchStatus>(matchStatus);
  matchStatusRef.current = matchStatus;
  const difficultyRef = useRef<CPUDifficulty>(difficulty);
  difficultyRef.current = difficulty;

  // CPU current planned movement target
  const cpuTargetMoveRef = useRef<AIMove | null>(null);

  // Ref to avoid circular dependency between lock and resolveChains
  const resolveChainsRef = useRef<
    (
      currentBoard: Board,
      targetId: 'player' | 'cpu',
      chainIndex: number,
      totalGarbageGen: number
    ) => void
  >(() => {});

  /**
   * Reset and start a fresh battle
   */
  const startMatch = useCallback(() => {
    soundManager.startBGM();
    setMatchStatus('countdown');
    setCountdown(3);
    setWinner(null);

    // Initial boards & queues
    const initialP1Board = createEmptyBoard();
    const initialCpuBoard = createEmptyBoard();

    const q1: [PuyoColor, PuyoColor][] = [
      generateRandomPair(),
      generateRandomPair(),
      generateRandomPair(),
    ];
    const q2: [PuyoColor, PuyoColor][] = [
      generateRandomPair(),
      generateRandomPair(),
      generateRandomPair(),
    ];

    setP1Board(initialP1Board);
    setCpuBoard(initialCpuBoard);
    setP1Queue(q1);
    setCpuQueue(q2);
    setP1Pair(null);
    setCpuPair(null);
    setP1PendingGarbage(0);
    setCpuPendingGarbage(0);
    setP1CurrentChain(0);
    setCpuCurrentChain(0);
    setP1ChainVoice('');
    setCpuChainVoice('');
    setP1Resolving(false);
    setCpuResolving(false);
    setP1AllClear(false);
    setCpuAllClear(false);
  }, []);

  /**
   * Countdown timer (3 -> 2 -> 1 -> GO)
   */
  useEffect(() => {
    if (matchStatus !== 'countdown') return;

    if (countdown > 0) {
      soundManager.playRotate();
      const timer = setTimeout(() => {
        setCountdown((c) => c - 1);
      }, 700);
      return () => clearTimeout(timer);
    } else {
      // Countdown finished -> Start playing!
      soundManager.playPop(1);
      matchStatusRef.current = 'playing';
      setMatchStatus('playing');
    }
  }, [matchStatus, countdown]);

  /**
   * Handle match end
   */
  const handleGameOver = useCallback((victor: 'player' | 'cpu') => {
    setMatchStatus('gameover');
    matchStatusRef.current = 'gameover';
    setWinner(victor);
    setP1Pair(null);
    setCpuPair(null);

    if (victor === 'player') {
      soundManager.playWin();
      setP1Wins((w) => w + 1);
    } else {
      soundManager.playLose();
      setCpuWins((w) => w + 1);
    }
  }, []);

  /**
   * Spawn next pair for Player 1
   */
  const spawnNextP1Pair = useCallback(() => {
    if (matchStatusRef.current === 'gameover' || matchStatusRef.current === 'idle') return;

    setP1Queue((prev) => {
      const nextPairColors = prev[0] || generateRandomPair();
      const newQueue = [...prev.slice(1), generateRandomPair()];

      const newPair: ActivePair = {
        col: 2, // Standard spawn column 2
        row: 1, // Visible row 1 (child is at row 0)
        rot: 0, // Child above
        colors: nextPairColors,
      };

      // Check if spawn position is blocked
      if (!canPlacePair(p1BoardRef.current, newPair.col, newPair.row, newPair.rot)) {
        handleGameOver('cpu');
        return prev;
      }

      setP1Pair(newPair);
      return newQueue;
    });
  }, [handleGameOver]);

  /**
   * Spawn next pair for CPU
   */
  const spawnNextCpuPair = useCallback(() => {
    if (matchStatusRef.current === 'gameover' || matchStatusRef.current === 'idle') return;

    setCpuQueue((prev) => {
      const nextPairColors = prev[0] || generateRandomPair();
      const newQueue = [...prev.slice(1), generateRandomPair()];

      const newPair: ActivePair = {
        col: 2,
        row: 1,
        rot: 0,
        colors: nextPairColors,
      };

      if (!canPlacePair(cpuBoardRef.current, newPair.col, newPair.row, newPair.rot)) {
        handleGameOver('player');
        return prev;
      }

      setCpuPair(newPair);

      // Pre-calculate CPU destination using AI solver
      const bestMove = calculateBestMove(
        cpuBoardRef.current,
        newPair.colors,
        difficultyRef.current,
        0
      );
      cpuTargetMoveRef.current = bestMove;

      return newQueue;
    });
  }, [handleGameOver]);

  /**
   * Handle game start spawning effect
   */
  useEffect(() => {
    if (matchStatus === 'playing') {
      matchStatusRef.current = 'playing';
      if (!p1PairRef.current && !p1ResolvingRef.current) {
        spawnNextP1Pair();
      }
      if (!cpuPairRef.current && !cpuResolvingRef.current) {
        spawnNextCpuPair();
      }
    }
  }, [matchStatus, spawnNextCpuPair, spawnNextP1Pair]);

  /**
   * Lock pair and run chain resolution for Player 1
   */
  const lockP1Pair = useCallback(
    (pairToLock: ActivePair) => {
      if (p1ResolvingRef.current || matchStatusRef.current !== 'playing') return;

      soundManager.playDrop();
      setP1Resolving(true);
      p1ResolvingRef.current = true;
      setP1Pair(null);
      p1PairRef.current = null;

      const board = cloneBoard(p1BoardRef.current);
      const { col, rot, colors } = pairToLock;
      const [dx] = getChildOffset(rot);
      const childCol = col + dx;

      // Place axis and child
      if (rot === 0) {
        // Axis below, child above
        const axisRow = getLowestAvailableRow(board, col);
        if (axisRow >= 0) board[col][axisRow] = createCell(colors[0]);
        if (axisRow - 1 >= 0) board[col][axisRow - 1] = createCell(colors[1]);
      } else if (rot === 2) {
        // Child below, axis above
        const childRow = getLowestAvailableRow(board, col);
        if (childRow >= 0) board[col][childRow] = createCell(colors[1]);
        if (childRow - 1 >= 0) board[col][childRow - 1] = createCell(colors[0]);
      } else {
        // Horizontal: each puyo falls to its lowest row independently (split drop)
        const axisRow = getLowestAvailableRow(board, col);
        const childRow = getLowestAvailableRow(board, childCol);
        if (axisRow >= 0) board[col][axisRow] = createCell(colors[0]);
        if (childRow >= 0 && childCol >= 0 && childCol < BOARD_COLS) {
          board[childCol][childRow] = createCell(colors[1]);
        }
      }

      applyGravity(board);
      setP1Board(board);
      p1BoardRef.current = board;

      // Start sequential chain resolution
      resolveChainsRef.current(board, 'player', 0, 0);
    },
    []
  );

  /**
   * Lock pair and run chain resolution for CPU
   */
  const lockCpuPair = useCallback(
    (pairToLock: ActivePair) => {
      if (cpuResolvingRef.current || matchStatusRef.current !== 'playing') return;

      setCpuResolving(true);
      cpuResolvingRef.current = true;
      setCpuPair(null);
      cpuPairRef.current = null;

      const board = cloneBoard(cpuBoardRef.current);
      const { col, rot, colors } = pairToLock;
      const [dx] = getChildOffset(rot);
      const childCol = col + dx;

      if (rot === 0) {
        const axisRow = getLowestAvailableRow(board, col);
        if (axisRow >= 0) board[col][axisRow] = createCell(colors[0]);
        if (axisRow - 1 >= 0) board[col][axisRow - 1] = createCell(colors[1]);
      } else if (rot === 2) {
        const childRow = getLowestAvailableRow(board, col);
        if (childRow >= 0) board[col][childRow] = createCell(colors[1]);
        if (childRow - 1 >= 0) board[col][childRow - 1] = createCell(colors[0]);
      } else {
        const axisRow = getLowestAvailableRow(board, col);
        const childRow = getLowestAvailableRow(board, childCol);
        if (axisRow >= 0) board[col][axisRow] = createCell(colors[0]);
        if (childRow >= 0 && childCol >= 0 && childCol < BOARD_COLS) {
          board[childCol][childRow] = createCell(colors[1]);
        }
      }

      applyGravity(board);
      setCpuBoard(board);
      cpuBoardRef.current = board;

      resolveChainsRef.current(board, 'cpu', 0, 0);
    },
    []
  );

  /**
   * Recursive chain resolution step with delay for animations & sound
   */
  const resolveChains = useCallback(
    (
      currentBoard: Board,
      targetId: 'player' | 'cpu',
      chainIndex: number,
      totalGarbageGen: number
    ) => {
      if (matchStatusRef.current !== 'playing') return;

      const workingBoard = cloneBoard(currentBoard);
      const popRes = checkAndPopPuyos(workingBoard, chainIndex);

      if (popRes.hasPopped) {
        // Puyos matched!
        const nextChain = chainIndex + 1;
        const voiceText =
          SoundManager.CHAIN_VOICES[
            Math.min(nextChain - 1, SoundManager.CHAIN_VOICES.length - 1)
          ];

        soundManager.playPop(nextChain);

        if (targetId === 'player') {
          setP1Score((s) => s + popRes.scoreEarned);
          setP1CurrentChain(nextChain);
          setP1ChainVoice(voiceText);
          setP1MaxChain((m) => Math.max(m, nextChain));
          if (nextChain >= 3) {
            setP1Shake(true);
            setTimeout(() => setP1Shake(false), 350);
          }
        } else {
          setCpuScore((s) => s + popRes.scoreEarned);
          setCpuCurrentChain(nextChain);
          setCpuChainVoice(voiceText);
          setCpuMaxChain((m) => Math.max(m, nextChain));
          if (nextChain >= 3) {
            setCpuShake(true);
            setTimeout(() => setCpuShake(false), 350);
          }
        }

        // Apply gravity to workingBoard
        applyGravity(workingBoard);

        // Update board state
        if (targetId === 'player') {
          setP1Board(workingBoard);
          p1BoardRef.current = workingBoard;
        } else {
          setCpuBoard(workingBoard);
          cpuBoardRef.current = workingBoard;
        }

        // Wait for pop animation then continue next chain step
        setTimeout(() => {
          resolveChains(
            workingBoard,
            targetId,
            nextChain,
            totalGarbageGen + popRes.garbageGenerated
          );
        }, 360);
      } else {
        // Chain completed!
        // Reset chain overlays
        if (targetId === 'player') {
          setTimeout(() => {
            setP1CurrentChain(0);
            setP1ChainVoice('');
          }, 600);
        } else {
          setTimeout(() => {
            setCpuCurrentChain(0);
            setCpuChainVoice('');
          }, 600);
        }

        // 1. Check Zenkeshi (All Clear)
        let isAllClear = true;
        for (let c = 0; c < BOARD_COLS; c++) {
          for (let r = 1; r < BOARD_ROWS; r++) {
            if (workingBoard[c][r] !== null) {
              isAllClear = false;
              break;
            }
          }
          if (!isAllClear) break;
        }

        let bonusGarbage = 0;
        if (isAllClear) {
          soundManager.playAllClear();
          bonusGarbage = 30; // 30 nuisance bonus
          if (targetId === 'player') {
            setP1AllClear(true);
            setP1Score((s) => s + 2100);
            setTimeout(() => setP1AllClear(false), 1400);
          } else {
            setCpuAllClear(true);
            setCpuScore((s) => s + 2100);
            setTimeout(() => setCpuAllClear(false), 1400);
          }
        }

        const totalAttack = totalGarbageGen + bonusGarbage;

        // 2. Garbage offset and distribution
        if (targetId === 'player') {
          if (totalAttack > 0) {
            // Player produced attack -> Offset pending garbage first (相殺)
            setP1PendingGarbage((pending) => {
              if (totalAttack >= pending) {
                const leftover = totalAttack - pending;
                // Surplus attack sent to CPU
                if (leftover > 0) {
                  setCpuPendingGarbage((cpuG) => {
                    soundManager.playNuisanceAlert();
                    return cpuG + leftover;
                  });
                }
                return 0;
              } else {
                return pending - totalAttack;
              }
            });
          } else {
            // Player did NOT produce attack this turn -> Drop pending nuisance puyos!
            setP1PendingGarbage((pending) => {
              if (pending > 0) {
                soundManager.playNuisanceDrop();
                setP1Shake(true);
                setTimeout(() => setP1Shake(false), 350);

                const { remainingCount } = dropGarbage(
                  workingBoard,
                  pending
                );
                const nextB = cloneBoard(workingBoard);
                setP1Board(nextB);
                p1BoardRef.current = nextB;
                return remainingCount;
              }
              return 0;
            });
          }
        } else {
          // CPU chain end
          if (totalAttack > 0) {
            setCpuPendingGarbage((pending) => {
              if (totalAttack >= pending) {
                const leftover = totalAttack - pending;
                if (leftover > 0) {
                  setP1PendingGarbage((p1G) => {
                    soundManager.playNuisanceAlert();
                    return p1G + leftover;
                  });
                }
                return 0;
              } else {
                return pending - totalAttack;
              }
            });
          } else {
            // CPU did not attack -> drop pending nuisance
            setCpuPendingGarbage((pending) => {
              if (pending > 0) {
                const { remainingCount } = dropGarbage(workingBoard, pending);
                setCpuShake(true);
                setTimeout(() => setCpuShake(false), 350);
                const nextB = cloneBoard(workingBoard);
                setCpuBoard(nextB);
                cpuBoardRef.current = nextB;
                return remainingCount;
              }
              return 0;
            });
          }
        }

        // 3. Check defeat trigger
        if (isDefeated(workingBoard)) {
          handleGameOver(targetId === 'player' ? 'cpu' : 'player');
          return;
        }

        // 4. Release resolution lock & spawn next pair
        if (targetId === 'player') {
          setP1Resolving(false);
          p1ResolvingRef.current = false;
          spawnNextP1Pair();
        } else {
          setCpuResolving(false);
          cpuResolvingRef.current = false;
          spawnNextCpuPair();
        }
      }
    },
    [handleGameOver, spawnNextCpuPair, spawnNextP1Pair]
  );

  // Keep resolveChainsRef updated
  useEffect(() => {
    resolveChainsRef.current = resolveChains;
  }, [resolveChains]);

  /**
   * Player 1 Movement Actions
   */
  const moveP1Left = useCallback(() => {
    if (p1ResolvingRef.current || !p1PairRef.current || matchStatusRef.current !== 'playing') return;
    const current = p1PairRef.current;
    const nextCol = current.col - 1;
    if (canPlacePair(p1BoardRef.current, nextCol, current.row, current.rot)) {
      soundManager.playMove();
      const updated = { ...current, col: nextCol };
      setP1Pair(updated);
      p1PairRef.current = updated;
    }
  }, []);

  const moveP1Right = useCallback(() => {
    if (p1ResolvingRef.current || !p1PairRef.current || matchStatusRef.current !== 'playing') return;
    const current = p1PairRef.current;
    const nextCol = current.col + 1;
    if (canPlacePair(p1BoardRef.current, nextCol, current.row, current.rot)) {
      soundManager.playMove();
      const updated = { ...current, col: nextCol };
      setP1Pair(updated);
      p1PairRef.current = updated;
    }
  }, []);

  const rotateP1 = useCallback(
    (direction: 'cw' | 'ccw') => {
      if (p1ResolvingRef.current || !p1PairRef.current || matchStatusRef.current !== 'playing') return;
      const current = p1PairRef.current;
      const currentRot = current.rot;
      const nextRot = (
        direction === 'cw' ? (currentRot + 1) % 4 : (currentRot + 3) % 4
      ) as RotationState;

      // Try normal rotation
      if (canPlacePair(p1BoardRef.current, current.col, current.row, nextRot)) {
        soundManager.playRotate();
        const updated = { ...current, rot: nextRot };
        setP1Pair(updated);
        p1PairRef.current = updated;
        return;
      }

      // Wall kick tests (left kick, right kick, up kick)
      const kicks = [-1, 1, 0];
      for (const kickCol of kicks) {
        const testCol = current.col + kickCol;
        if (canPlacePair(p1BoardRef.current, testCol, current.row, nextRot)) {
          soundManager.playRotate();
          const updated = { ...current, col: testCol, rot: nextRot };
          setP1Pair(updated);
          p1PairRef.current = updated;
          return;
        }
      }
    },
    []
  );

  const softDropP1 = useCallback(() => {
    if (p1ResolvingRef.current || !p1PairRef.current || matchStatusRef.current !== 'playing') return;
    const current = p1PairRef.current;
    const nextRow = current.row + 1;
    if (canPlacePair(p1BoardRef.current, current.col, nextRow, current.rot)) {
      const updated = { ...current, row: nextRow };
      setP1Pair(updated);
      p1PairRef.current = updated;
      setP1Score((s) => s + 1);
    } else {
      // Reached floor/obstacle -> lock
      lockP1Pair(current);
    }
  }, [lockP1Pair]);

  const hardDropP1 = useCallback(() => {
    if (p1ResolvingRef.current || !p1PairRef.current || matchStatusRef.current !== 'playing') return;
    const current = p1PairRef.current;
    // Find lowest valid row
    let lowestRow = current.row;
    while (canPlacePair(p1BoardRef.current, current.col, lowestRow + 1, current.rot)) {
      lowestRow++;
    }

    const lockedPair = { ...current, row: lowestRow };
    lockP1Pair(lockedPair);
  }, [lockP1Pair]);

  /**
   * Keyboard listeners for Desktop controls
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (matchStatusRef.current !== 'playing') return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          moveP1Left();
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          moveP1Right();
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          softDropP1();
          break;
        case ' ': // Space = Hard drop
          e.preventDefault();
          hardDropP1();
          break;
        case 'x':
        case 'X':
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          rotateP1('cw'); // Clockwise
          break;
        case 'z':
        case 'Z':
          e.preventDefault();
          rotateP1('ccw'); // Counter-clockwise
          break;
        case 'p':
        case 'P':
        case 'Escape':
          e.preventDefault();
          setMatchStatus((s) => {
            const nextS = s === 'playing' ? 'paused' : s === 'paused' ? 'playing' : s;
            matchStatusRef.current = nextS;
            return nextS;
          });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hardDropP1, moveP1Left, moveP1Right, rotateP1, softDropP1]);

  /**
   * Game loop: Gravity tick for Player 1
   */
  useEffect(() => {
    if (matchStatus !== 'playing') return;

    const gravityInterval = setInterval(() => {
      const active = p1PairRef.current;
      if (active && !p1ResolvingRef.current) {
        const nextRow = active.row + 1;
        if (
          canPlacePair(
            p1BoardRef.current,
            active.col,
            nextRow,
            active.rot
          )
        ) {
          const updated = { ...active, row: nextRow };
          setP1Pair(updated);
          p1PairRef.current = updated;
        } else {
          lockP1Pair(active);
        }
      }
    }, 550);

    return () => clearInterval(gravityInterval);
  }, [lockP1Pair, matchStatus]);

  /**
   * CPU loop: Step-by-step thinking, moving, rotating, and dropping
   */
  useEffect(() => {
    if (matchStatus !== 'playing') return;

    const currentDiffConfig = DIFFICULTY_CONFIGS[difficulty];

    // CPU Horizontal Steering & Rotation interval: 140ms
    const moveInterval = setInterval(() => {
      const activeCpuPair = cpuPairRef.current;
      if (!activeCpuPair || cpuResolvingRef.current) return;

      const target = cpuTargetMoveRef.current;
      if (!target) return;

      // 1. Adjust rotation if needed
      if (activeCpuPair.rot !== target.targetRot) {
        const nextRot = ((activeCpuPair.rot + 1) % 4) as RotationState;
        if (canPlacePair(cpuBoardRef.current, activeCpuPair.col, activeCpuPair.row, nextRot)) {
          const updated = { ...activeCpuPair, rot: nextRot };
          setCpuPair(updated);
          cpuPairRef.current = updated;
          return;
        }
      }

      // 2. Adjust column if needed
      if (activeCpuPair.col < target.targetCol) {
        const nextCol = activeCpuPair.col + 1;
        if (canPlacePair(cpuBoardRef.current, nextCol, activeCpuPair.row, activeCpuPair.rot)) {
          const updated = { ...activeCpuPair, col: nextCol };
          setCpuPair(updated);
          cpuPairRef.current = updated;
        }
      } else if (activeCpuPair.col > target.targetCol) {
        const nextCol = activeCpuPair.col - 1;
        if (canPlacePair(cpuBoardRef.current, nextCol, activeCpuPair.row, activeCpuPair.rot)) {
          const updated = { ...activeCpuPair, col: nextCol };
          setCpuPair(updated);
          cpuPairRef.current = updated;
        }
      }
    }, 140);

    // CPU Gravity Drop interval: steadily pulls pair down
    const gravityInterval = setInterval(() => {
      const activeCpuPair = cpuPairRef.current;
      if (!activeCpuPair || cpuResolvingRef.current) return;

      const nextRow = activeCpuPair.row + 1;
      if (canPlacePair(cpuBoardRef.current, activeCpuPair.col, nextRow, activeCpuPair.rot)) {
        const updated = { ...activeCpuPair, row: nextRow };
        setCpuPair(updated);
        cpuPairRef.current = updated;
      } else {
        lockCpuPair(activeCpuPair);
      }
    }, currentDiffConfig.dropSpeedMs);

    return () => {
      clearInterval(moveInterval);
      clearInterval(gravityInterval);
    };
  }, [difficulty, lockCpuPair, matchStatus]);

  const toggleSound = () => {
    const nextState = soundManager.toggleSFX();
    setSfxMuted(!nextState);
  };

  const toggleMusic = () => {
    const nextState = soundManager.toggleBGM();
    setBgmMuted(!nextState);
  };

  const activeDifficultyConfig = DIFFICULTY_CONFIGS[difficulty];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-sky-500 selection:text-white">
      {/* 1. Universal Top Bar Contract */}
      <header className="h-16 px-4 md:px-8 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md flex items-center justify-between z-30 shrink-0">
        {/* Zone 1: Single text wordmark */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-rose-600 flex items-center justify-center shadow-md">
            <span className="text-lg">🍮</span>
          </div>
          <span className="text-base md:text-lg font-black tracking-tight bg-gradient-to-r from-amber-300 via-rose-300 to-sky-300 bg-clip-text text-transparent">
            ぷよぷよ バトルスタジアム
          </span>
        </div>

        {/* Zone 2: Navigation / Info tabs */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-300">
          <button
            onClick={() => setShowChainsModal(true)}
            className="flex items-center gap-1.5 hover:text-amber-300 transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>連鎖のコツ (連鎖解説)</span>
          </button>
          <button
            onClick={() => setShowHelpModal(true)}
            className="flex items-center gap-1.5 hover:text-sky-300 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-sky-400" />
            <span>あそびかた</span>
          </button>
        </nav>

        {/* Zone 3: Audio controls & primary action */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSound}
            title={sfxMuted ? '効果音をON' : '効果音をOFF'}
            className={`p-2 rounded-lg border text-xs font-medium transition-colors ${
              sfxMuted
                ? 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                : 'bg-slate-800/80 border-slate-700 text-sky-400'
            }`}
          >
            {sfxMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleMusic}
            title={bgmMuted ? 'BGMをON' : 'BGMをOFF'}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-colors ${
              bgmMuted
                ? 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                : 'bg-slate-800/80 border-slate-700 text-amber-400'
            }`}
          >
            BGM: {bgmMuted ? 'OFF' : 'ON'}
          </button>

          {matchStatus === 'playing' ? (
            <button
              onClick={() => setMatchStatus('paused')}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>一時停止</span>
            </button>
          ) : matchStatus === 'paused' ? (
            <button
              onClick={() => setMatchStatus('playing')}
              className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>再開</span>
            </button>
          ) : (
            <button
              onClick={startMatch}
              className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white text-xs font-black rounded-lg shadow-md hover:shadow-rose-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>バトル開始！</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. Main Arena Viewport */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-3 py-4 md:py-6 flex flex-col justify-center">
        {matchStatus === 'idle' ? (
          /* Title / Match Setup Screen */
          <div className="w-full max-w-2xl mx-auto flex flex-col items-center text-center">
            {/* Mascot banner */}
            <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-300 text-xs font-bold animate-pulse">
              <Sparkles className="w-3.5 h-3.5" />
              <span>本格ぷよぷよAI対戦・おじゃま相殺完全対応</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-3">
              ぷよを繋げて、大連鎖！
            </h1>
            <p className="text-slate-400 text-sm md:text-base max-w-md mb-6">
              同じ色のぷよを4つ以上つなげて消そう！CPUの難易度を選んで、白熱の対戦バトルを繰り広げよう。
            </p>

            {/* Difficulty Selector */}
            <div className="w-full max-w-lg mb-6">
              <DifficultySelector
                currentDifficulty={difficulty}
                onSelect={(d) => setDifficulty(d)}
              />
            </div>

            {/* Start Button */}
            <button
              onClick={startMatch}
              className="w-full max-w-md py-4 bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white text-lg font-black rounded-xl shadow-xl shadow-rose-950/50 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>対戦をはじめる (START)</span>
            </button>
          </div>
        ) : (
          /* Active Match Arena */
          <div className="flex flex-col gap-4">
            {/* Match Arena Header / Status */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="font-bold text-slate-200">対戦モード</span>
                <span aria-hidden="true">·</span>
                <span>CPU難易度: <strong className="text-amber-400">{activeDifficultyConfig.name}</strong></span>
                <span aria-hidden="true">·</span>
                <span>敗北条件: 3列目の最上段✕が埋まると敗北</span>
              </div>

              {/* Quick difficulty switch during match */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400">難易度変更:</span>
                <div className="flex gap-1">
                  {(['easy', 'normal', 'hard', 'expert'] as CPUDifficulty[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                        difficulty === d
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {DIFFICULTY_CONFIGS[d].name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Boards Arena Grid: Player 1 (Left) vs CPU (Right) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 items-start justify-center max-w-4xl mx-auto w-full">
              {/* Player 1 Side */}
              <div className="flex flex-col gap-2.5 items-center w-full">
                {/* Player Card */}
                <div className="w-full">
                  <PlayerCard
                    id="player"
                    name="あなた (Player 1)"
                    avatarUrl="/src/assets/images/avatar_player_1790914624231.jpg"
                    score={p1Score}
                    wins={p1Wins}
                    maxChain={p1MaxChain}
                    isResolving={p1Resolving}
                  />
                </div>

                {/* Nuisance Tray */}
                <NuisanceTray amount={p1PendingGarbage} label="あなたへのおじゃま" />

                {/* Board + Next Queue Layout */}
                <div className="flex items-start gap-3 justify-center w-full">
                  {/* P1 Board */}
                  <GameBoard
                    board={p1Board}
                    currentPair={p1Pair}
                    shake={p1Shake}
                    chainCount={p1CurrentChain}
                    chainVoice={p1ChainVoice}
                    isPlayer={true}
                    isAllClear={p1AllClear}
                    cellSize={36}
                  />

                  {/* P1 Next Queue */}
                  <div className="shrink-0 pt-1">
                    <NextQueue pairs={p1Queue} />
                  </div>
                </div>
              </div>

              {/* CPU Side */}
              <div className="flex flex-col gap-2.5 items-center w-full">
                {/* CPU Card */}
                <div className="w-full">
                  <PlayerCard
                    id="cpu"
                    name={`CPU: ${activeDifficultyConfig.characterName}`}
                    avatarUrl={activeDifficultyConfig.avatar}
                    score={cpuScore}
                    wins={cpuWins}
                    maxChain={cpuMaxChain}
                    difficulty={difficulty}
                    isResolving={cpuResolving}
                  />
                </div>

                {/* Nuisance Tray */}
                <NuisanceTray amount={cpuPendingGarbage} label="CPUへのおじゃま" />

                {/* Board + Next Queue Layout */}
                <div className="flex items-start gap-3 justify-center w-full">
                  {/* CPU Next Queue (Positioned on left of CPU board for symmetrical arcade layout) */}
                  <div className="shrink-0 pt-1">
                    <NextQueue pairs={cpuQueue} />
                  </div>

                  {/* CPU Board */}
                  <GameBoard
                    board={cpuBoard}
                    currentPair={cpuPair}
                    shake={cpuShake}
                    chainCount={cpuCurrentChain}
                    chainVoice={cpuChainVoice}
                    isPlayer={false}
                    isAllClear={cpuAllClear}
                    cellSize={36}
                  />
                </div>
              </div>
            </div>

            {/* Controls Guide (Virtual Gamepad on mobile, Keyboard shortcuts on desktop) */}
            <div className="max-w-xl mx-auto w-full mt-2">
              <ControlsGuide
                onMoveLeft={moveP1Left}
                onMoveRight={moveP1Right}
                onSoftDrop={softDropP1}
                onHardDrop={hardDropP1}
                onRotateLeft={() => rotateP1('ccw')}
                onRotateRight={() => rotateP1('cw')}
                disabled={matchStatus !== 'playing' || p1Resolving}
              />
            </div>
          </div>
        )}
      </main>

      {/* 3. Footer */}
      <footer className="py-3 px-4 border-t border-slate-800 text-center text-xs text-slate-500 shrink-0">
        ぷよぷよ バトルスタジアム · 難易度調整・おじゃま相殺・4連結アルゴリズム完全シミュレーション
      </footer>

      {/* COUNTDOWN OVERLAY */}
      {matchStatus === 'countdown' && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in select-none">
          <div className="text-8xl md:text-9xl font-black text-amber-400 drop-shadow-2xl animate-bounce">
            {countdown === 0 ? 'START!' : countdown}
          </div>
          <div className="mt-4 text-slate-300 font-bold text-lg">
            難易度: {activeDifficultyConfig.name} ({activeDifficultyConfig.characterName})
          </div>
        </div>
      )}

      {/* PAUSE OVERLAY */}
      {matchStatus === 'paused' && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <h2 className="text-2xl font-black text-slate-100 mb-2">一時停止中</h2>
            <p className="text-sm text-slate-400 mb-6">息抜きをして、いつでも再開できます。</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setMatchStatus('playing')}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg shadow cursor-pointer"
              >
                バトルを再開する
              </button>
              <button
                onClick={startMatch}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg border border-slate-700 cursor-pointer"
              >
                最初からやり直す
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER / VICTORY OVERLAY */}
      {matchStatus === 'gameover' && winner && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl p-6 md:p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden">
            {winner === 'player' ? (
              <>
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-3xl shadow-inner">
                  🏆
                </div>
                <h2 className="text-3xl font-black text-amber-300 mb-1">
                  YOU WIN!! 勝利！
                </h2>
                <p className="text-xs text-slate-400 mb-4">
                  見事な連鎖で {activeDifficultyConfig.characterName} ({activeDifficultyConfig.name}) を撃破！
                </p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center text-3xl shadow-inner">
                  💥
                </div>
                <h2 className="text-3xl font-black text-rose-400 mb-1">
                  YOU LOSE... 敗北
                </h2>
                <p className="text-xs text-slate-400 mb-4">
                  {activeDifficultyConfig.characterName} の連鎖攻撃に圧倒されました...
                </p>
              </>
            )}

            {/* Score & Chain stats summary */}
            <div className="grid grid-cols-2 gap-2 my-4 p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
              <div className="text-left">
                <span className="text-slate-500 block">あなたのスコア</span>
                <span className="text-base font-bold text-amber-400 font-mono tabular-nums">
                  {p1Score.toLocaleString()}
                </span>
                <span className="text-[11px] text-slate-400 block mt-1">
                  最大連鎖: <strong>{p1MaxChain}</strong> 連鎖
                </span>
              </div>
              <div className="text-left border-l border-slate-800 pl-3">
                <span className="text-slate-500 block">CPUスコア</span>
                <span className="text-base font-bold text-rose-400 font-mono tabular-nums">
                  {cpuScore.toLocaleString()}
                </span>
                <span className="text-[11px] text-slate-400 block mt-1">
                  最大連鎖: <strong>{cpuMaxChain}</strong> 連鎖
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2 mt-4">
              <button
                onClick={startMatch}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-black text-sm rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>もう一回たたかう (RETRY)</span>
              </button>
              <button
                onClick={() => setMatchStatus('idle')}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg border border-slate-700 cursor-pointer"
              >
                難易度を選び直す (タイトルへ)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HOW TO PLAY MODAL */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-black text-slate-100 mb-3 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-sky-400" />
              <span>ぷよぷよのルール・あそびかた</span>
            </h3>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
                <strong className="text-amber-400 block mb-1">1. 基本ルール</strong>
                上から落ちてくる2個1組のぷよを操作します。同じ色のぷよが上下左右に4個以上くっつくと消えます。
              </div>

              <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
                <strong className="text-rose-400 block mb-1">2. 敗北条件（✕マーク）</strong>
                左から3番目の列（赤色の✕マークがある場所）までぷよが積み上がるとゲームオーバーになります。3列目には気をつけましょう！
              </div>

              <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
                <strong className="text-sky-400 block mb-1">3. おじゃまぷよと相殺（そうさい）</strong>
                連鎖を作ると相手におじゃまぷよを送れます。相手からおじゃまぷよが送られてきている最中に連鎖を作ると、「相殺」しておじゃまぷよを打ち消せます！
              </div>

              <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
                <strong className="text-emerald-400 block mb-1">4. 全消し（ALL CLEAR）</strong>
                フィールド上のぷよをすべて消し去ると「全消し」ボーナス！次回攻撃時に30個の追加おじゃまぷよが一気に相手に襲いかかります。
              </div>
            </div>

            <button
              onClick={() => setShowHelpModal(false)}
              className="mt-5 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg cursor-pointer"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* CHAINS TUTORIAL MODAL */}
      {showChainsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-black text-slate-100 mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>連鎖のコツ (連鎖解説)</span>
            </h3>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
                <strong className="text-amber-300 block mb-1">① 階段積み（かいだんづみ）</strong>
                列ごとにぷよを3個ずつ縦に並べ、隣の列の上に1個だけ同じ色を乗せる王道の積み方。端から順番に消えていく綺麗な連鎖が作れます。
              </div>

              <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
                <strong className="text-sky-300 block mb-1">② 挟み込み（はさみこみ）</strong>
                同じ色2個の間に別の色のぷよを1個挟んでおく積み方。挟まれたぷよが消えると、両端のぷよが落ちて合体し連鎖になります。
              </div>

              <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
                <strong className="text-purple-300 block mb-1">③ 連鎖ボイス</strong>
                連鎖が続くほど詠唱ボイスがパワーアップ！
                <ul className="mt-1.5 space-y-0.5 text-slate-400 font-mono">
                  <li>1連鎖: ファイヤー！</li>
                  <li>2連鎖: アイスストーム！</li>
                  <li>3連鎖: ダイアキュート！</li>
                  <li>4連鎖: ブレインダムド！</li>
                  <li>5連鎖以上: ばよえ〜ん！！</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setShowChainsModal(false)}
              className="mt-5 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg cursor-pointer"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
