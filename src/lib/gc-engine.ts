// GC Sweeper Game Engine

export type BlockStatus = 'alive' | 'garbage' | 'root';

export interface MemoryBlock {
  id: string;
  row: number;
  col: number;
  label: string;
  status: BlockStatus;
  references: string[];
  referencedBy: string[];
  isMarked: boolean;
}

export interface GameState {
  blocks: MemoryBlock[];
  score: number;
  level: number;
  lives: number;
  combo: number;
  gcMode: 'mark-sweep' | 'ref-counting';
  phase: 'playing' | 'marking' | 'sweeping' | 'gameover' | 'levelcomplete';
  gridCols: number;
  gridRows: number;
  totalGarbage: number;
  collectedGarbage: number;
  wrongClicks: number;
  markingProgress: string[]; // IDs marked so far in mark phase
  timeLeft: number; // seconds remaining
  maxTime: number; // total time for this level
}

const VAR_NAMES = [
  'ptr', 'obj', 'buf', 'str', 'arr', 'map', 'set', 'ctx',
  'req', 'res', 'cfg', 'tmp', 'ref', 'val', 'key', 'idx',
  'fn', 'cb', 'evt', 'dom', 'node', 'data', 'heap', 'stack',
  'mem', 'alloc', 'free', 'gc', 'list', 'tree', 'queue', 'cache',
];

function generateLabel(): string {
  const name = VAR_NAMES[Math.floor(Math.random() * VAR_NAMES.length)];
  const addr = Math.floor(Math.random() * 0xFFFF).toString(16).padStart(4, '0');
  return `${name}_0x${addr}`;
}

// Level difficulty configuration
interface LevelConfig {
  gridCols: number;
  gridRows: number;
  totalBlocks: number;
  rootCount: number;
  aliveRatio: number;  // higher = easier (more alive, less garbage)
  extraRefs: number;   // extra cross-references between alive blocks
  danglingRefs: number; // confusing refs between garbage blocks
  maxTime: number;
  lives: number;
  gcMode: 'mark-sweep' | 'ref-counting';
  isTutorial?: boolean;
  tutorialHint?: string;
}

function getLevelConfig(level: number): LevelConfig {
  // Level 1: Tutorial — ref-counting, very simple
  if (level === 1) {
    return {
      gridCols: 3, gridRows: 3, totalBlocks: 4, rootCount: 1,
      aliveRatio: 0.5, extraRefs: 0, danglingRefs: 0,
      maxTime: 90, lives: 5, gcMode: 'ref-counting',
      isTutorial: true,
      tutorialHint: '🎓 튜토리얼: 루트(ROOT)에서 화살표로 연결되지 않은 블록이 쓰레기입니다. 쓰레기를 클릭하세요!',
    };
  }
  // Level 2: Tutorial — mark-sweep intro
  if (level === 2) {
    return {
      gridCols: 3, gridRows: 3, totalBlocks: 5, rootCount: 1,
      aliveRatio: 0.5, extraRefs: 0, danglingRefs: 0,
      maxTime: 90, lives: 5, gcMode: 'mark-sweep',
      isTutorial: true,
      tutorialHint: '🎓 튜토리얼: 먼저 루트에서 도달 가능한 블록을 마킹한 후, 쓰레기를 수거하세요!',
    };
  }

  // Levels 3-7: Early game (gradual ramp)
  // Levels 8-14: Mid game
  // Levels 15-20: Late game
  // Levels 21+: Endurance / endless

  const tier = level <= 7 ? 'early' : level <= 14 ? 'mid' : level <= 20 ? 'late' : 'endless';

  let gridCols: number, gridRows: number, totalBlocks: number, rootCount: number;
  let aliveRatio: number, extraRefs: number, danglingRefs: number;
  let maxTime: number, lives: number;

  switch (tier) {
    case 'early': {
      gridCols = Math.min(5, 3 + Math.floor((level - 3) / 2));
      gridRows = Math.min(5, 3 + Math.floor((level - 3) / 2));
      totalBlocks = 5 + (level - 3) * 2;
      rootCount = 1;
      aliveRatio = Math.max(0.4, 0.6 - (level - 3) * 0.04);
      extraRefs = Math.floor((level - 3) / 2);
      danglingRefs = level >= 5 ? 1 : 0;
      maxTime = 75 - (level - 3) * 3;
      lives = 4;
      break;
    }
    case 'mid': {
      const t = level - 8; // 0..6
      gridCols = Math.min(6, 5 + Math.floor(t / 3));
      gridRows = Math.min(6, 5 + Math.floor(t / 2));
      totalBlocks = Math.min(gridCols * gridRows, 16 + t * 2);
      rootCount = Math.min(2, 1 + Math.floor(t / 3));
      aliveRatio = Math.max(0.3, 0.45 - t * 0.02);
      extraRefs = 2 + Math.floor(t / 2);
      danglingRefs = 1 + Math.floor(t / 2);
      maxTime = Math.max(35, 55 - t * 3);
      lives = 3;
      break;
    }
    case 'late': {
      const t = level - 15; // 0..5
      gridCols = 6;
      gridRows = Math.min(7, 6 + Math.floor(t / 3));
      totalBlocks = Math.min(gridCols * gridRows, 24 + t * 2);
      rootCount = Math.min(3, 2 + Math.floor(t / 3));
      aliveRatio = Math.max(0.25, 0.35 - t * 0.02);
      extraRefs = 4 + t;
      danglingRefs = 2 + Math.floor(t / 2);
      maxTime = Math.max(25, 40 - t * 2);
      lives = 3;
      break;
    }
    default: { // endless 21+
      const t = level - 21;
      gridCols = 6;
      gridRows = Math.min(8, 7 + Math.floor(t / 5));
      totalBlocks = Math.min(gridCols * gridRows, 30 + t);
      rootCount = Math.min(3, 2 + Math.floor(t / 5));
      aliveRatio = Math.max(0.2, 0.3 - t * 0.01);
      extraRefs = 6 + Math.floor(t / 2);
      danglingRefs = 3 + Math.floor(t / 2);
      maxTime = Math.max(20, 30 - Math.floor(t / 3));
      lives = 3;
      break;
    }
  }

  // Alternate between mark-sweep (odd) and ref-counting (even) after tutorial
  const gcMode = level % 2 !== 0 ? 'mark-sweep' : 'ref-counting';

  return { gridCols, gridRows, totalBlocks, rootCount, aliveRatio, extraRefs, danglingRefs, maxTime, lives, gcMode };
}

export function generateLevel(level: number): GameState {
  const config = getLevelConfig(level);
  const { gridCols, gridRows, totalBlocks } = config;

  const positions: { row: number; col: number }[] = [];
  const posSet = new Set<string>();
  
  while (positions.length < totalBlocks) {
    const row = Math.floor(Math.random() * gridRows);
    const col = Math.floor(Math.random() * gridCols);
    const key = `${row},${col}`;
    if (!posSet.has(key)) {
      posSet.add(key);
      positions.push({ row, col });
    }
  }

  const blocks: MemoryBlock[] = positions.map((pos, i) => ({
    id: `block_${i}`,
    row: pos.row,
    col: pos.col,
    label: generateLabel(),
    status: 'alive' as BlockStatus,
    references: [],
    referencedBy: [],
    isMarked: false,
  }));

  for (let i = 0; i < config.rootCount && i < blocks.length; i++) {
    blocks[i].status = 'root';
  }

  const rootBlocks = blocks.filter(b => b.status === 'root');
  const nonRootBlocks = blocks.filter(b => b.status !== 'root');
  
  const targetAlive = Math.floor(nonRootBlocks.length * config.aliveRatio);
  
  const shuffled = [...nonRootBlocks].sort(() => Math.random() - 0.5);
  const aliveBlocks = shuffled.slice(0, targetAlive);
  const garbageBlocks = shuffled.slice(targetAlive);

  // Ensure at least 1 garbage block
  if (garbageBlocks.length === 0 && aliveBlocks.length > 0) {
    const moved = aliveBlocks.pop()!;
    garbageBlocks.push(moved);
  }

  aliveBlocks.forEach((block, i) => {
    const source = i < rootBlocks.length 
      ? rootBlocks[i % rootBlocks.length] 
      : aliveBlocks[Math.floor(Math.random() * i)];
    
    source.references.push(block.id);
    block.referencedBy.push(source.id);
  });

  for (let i = 0; i < config.extraRefs && aliveBlocks.length > 1; i++) {
    const a = aliveBlocks[Math.floor(Math.random() * aliveBlocks.length)];
    const b = aliveBlocks[Math.floor(Math.random() * aliveBlocks.length)];
    if (a.id !== b.id && !a.references.includes(b.id)) {
      a.references.push(b.id);
      b.referencedBy.push(a.id);
    }
  }

  if (garbageBlocks.length > 1) {
    for (let i = 0; i < config.danglingRefs; i++) {
      const a = garbageBlocks[Math.floor(Math.random() * garbageBlocks.length)];
      const b = garbageBlocks[Math.floor(Math.random() * garbageBlocks.length)];
      if (a.id !== b.id && !a.references.includes(b.id)) {
        a.references.push(b.id);
        b.referencedBy.push(a.id);
      }
    }
  }

  garbageBlocks.forEach(b => { b.status = 'garbage'; });

  const isMarkSweep = config.gcMode === 'mark-sweep';

  return {
    blocks,
    score: 0,
    level,
    lives: config.lives,
    combo: 0,
    gcMode: config.gcMode,
    phase: isMarkSweep ? 'marking' : 'playing',
    gridCols,
    gridRows,
    totalGarbage: garbageBlocks.length,
    collectedGarbage: 0,
    wrongClicks: 0,
    markingProgress: [],
    timeLeft: config.maxTime,
    maxTime: config.maxTime,
  };
}

// Export for UI to show tutorial hints
export function getTutorialHint(level: number): string | null {
  const config = getLevelConfig(level);
  return config.tutorialHint ?? null;
}

// Get all reachable block IDs from roots
export function getReachableIds(blocks: MemoryBlock[]): Set<string> {
  const roots = blocks.filter(b => b.status === 'root');
  const visited = new Set<string>();
  const queue = roots.map(r => r.id);
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    const block = blocks.find(b => b.id === current);
    if (block) {
      block.references.forEach(ref => {
        if (!visited.has(ref)) queue.push(ref);
      });
    }
  }
  return visited;
}

// Mark phase: player clicks a block they think is reachable
export function markBlock(state: GameState, blockId: string): GameState & { markResult: 'correct' | 'wrong' | 'already' | 'done' } {
  if (state.phase !== 'marking') return { ...state, markResult: 'wrong' };
  
  const block = state.blocks.find(b => b.id === blockId);
  if (!block) return { ...state, markResult: 'wrong' };
  
  // Can't mark roots (they're always marked)
  if (block.status === 'root') return { ...state, markResult: 'already' };
  
  // Already marked?
  if (state.markingProgress.includes(blockId)) return { ...state, markResult: 'already' };
  
  const reachable = getReachableIds(state.blocks);
  
  if (reachable.has(blockId)) {
    // Correct mark
    const newProgress = [...state.markingProgress, blockId];
    const newCombo = state.combo + 1;
    const points = 50 * newCombo;
    
    // Check if all reachable non-root blocks are marked
    const nonRootReachable = [...reachable].filter(id => {
      const b = state.blocks.find(bl => bl.id === id);
      return b && b.status !== 'root';
    });
    const allMarked = nonRootReachable.every(id => newProgress.includes(id));
    
    return {
      ...state,
      markingProgress: newProgress,
      score: state.score + points,
      combo: newCombo,
      phase: allMarked ? 'sweeping' : 'marking',
      markResult: allMarked ? 'done' : 'correct',
    };
  } else {
    // Wrong - marked an unreachable block
    const newLives = state.lives - 1;
    return {
      ...state,
      lives: newLives,
      combo: 0,
      wrongClicks: state.wrongClicks + 1,
      phase: newLives <= 0 ? 'gameover' : 'marking',
      markResult: 'wrong',
    };
  }
}

// Sweep phase click (same as before but only in sweeping phase)
export function sweepBlock(state: GameState, blockId: string): GameState {
  const block = state.blocks.find(b => b.id === blockId);
  if (!block || state.phase !== 'sweeping') return state;

  const isGarbage = block.status === 'garbage';
  
  if (isGarbage) {
    const newBlocks = state.blocks.filter(b => b.id !== blockId);
    newBlocks.forEach(b => {
      b.references = b.references.filter(r => r !== blockId);
      b.referencedBy = b.referencedBy.filter(r => r !== blockId);
    });

    const newCombo = state.combo + 1;
    const points = 100 * newCombo;
    const newCollected = state.collectedGarbage + 1;
    const isComplete = newCollected >= state.totalGarbage;

    return {
      ...state,
      blocks: newBlocks,
      score: state.score + points,
      combo: newCombo,
      collectedGarbage: newCollected,
      phase: isComplete ? 'levelcomplete' : 'sweeping',
    };
  } else {
    const newLives = state.lives - 1;
    return {
      ...state,
      lives: newLives,
      combo: 0,
      wrongClicks: state.wrongClicks + 1,
      phase: newLives <= 0 ? 'gameover' : 'sweeping',
    };
  }
}

// Ref-counting mode click (original behavior)
export function clickBlock(state: GameState, blockId: string): GameState {
  const block = state.blocks.find(b => b.id === blockId);
  if (!block || state.phase !== 'playing') return state;

  const isGarbage = block.status === 'garbage';
  
  if (isGarbage) {
    const newBlocks = state.blocks.filter(b => b.id !== blockId);
    newBlocks.forEach(b => {
      b.references = b.references.filter(r => r !== blockId);
      b.referencedBy = b.referencedBy.filter(r => r !== blockId);
    });

    const newCombo = state.combo + 1;
    const points = 100 * newCombo;
    const newCollected = state.collectedGarbage + 1;
    const isComplete = newCollected >= state.totalGarbage;

    return {
      ...state,
      blocks: newBlocks,
      score: state.score + points,
      combo: newCombo,
      collectedGarbage: newCollected,
      phase: isComplete ? 'levelcomplete' : 'playing',
    };
  } else {
    const newLives = state.lives - 1;
    return {
      ...state,
      lives: newLives,
      combo: 0,
      wrongClicks: state.wrongClicks + 1,
      phase: newLives <= 0 ? 'gameover' : 'playing',
    };
  }
}
