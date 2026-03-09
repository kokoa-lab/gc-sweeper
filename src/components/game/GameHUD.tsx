import type { GameState } from '@/lib/gc-engine';

interface Props {
  state: GameState;
}

export function GameHUD({ state }: Props) {
  const phaseText = state.phase === 'marking' ? 'MARK' : state.phase === 'sweeping' ? 'SWEEP' : 'COLLECT';
  
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-border bg-card">
      <div className="flex items-center gap-6">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Score</span>
          <span className="text-xl font-bold font-mono text-primary neon-text">{state.score.toLocaleString()}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Level</span>
          <span className="text-xl font-bold font-mono text-secondary neon-text-cyan">{state.level}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Combo</span>
          <span className="text-xl font-bold font-mono text-foreground">×{state.combo}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="flex flex-col items-end">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Time</span>
          <span className={`text-xl font-bold font-mono ${
            state.timeLeft <= 5 ? 'text-destructive animate-pulse' : 
            state.timeLeft <= 10 ? 'text-neon-yellow' : 'text-foreground'
          }`}>
            {state.timeLeft}s
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Phase</span>
          <span className={`text-[10px] font-mono font-bold ${
            state.phase === 'marking' ? 'text-secondary neon-text-cyan' : 
            state.phase === 'sweeping' ? 'text-destructive' : 'text-accent'
          }`}>
            {phaseText}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Garbage</span>
          <span className="text-sm font-mono text-foreground">
            {state.collectedGarbage}/{state.totalGarbage}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Mode</span>
          <span className="text-[10px] font-mono text-accent">
            {state.gcMode === 'mark-sweep' ? 'MARK & SWEEP' : 'REF COUNT'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-sm ${
                i < state.lives ? 'bg-primary neon-box' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
