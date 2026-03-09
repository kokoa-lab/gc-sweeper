import { useState, useCallback, useRef, useEffect } from 'react';
import { generateLevel, clickBlock, markBlock, sweepBlock, getTutorialHint, type GameState } from '@/lib/gc-engine';
import { GameBoard } from './GameBoard';
import { GameHUD } from './GameHUD';
import { playCollect, playWrong, playMark, playLevelComplete, playGameOver, playStartSweep, playTick } from '@/lib/sounds';
import { saveHighScore, getTopScore, getHighScores, type HighScoreEntry } from '@/lib/highscore';

export function GCSweeper() {
  const [gameState, setGameState] = useState<GameState>(() => generateLevel(1));
  const [totalScore, setTotalScore] = useState(0);
  const [showHelp, setShowHelp] = useState(true);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [shakeKey, setShakeKey] = useState(0);
  const [shakeIntensity, setShakeIntensity] = useState(0);
  const [markedIds, setMarkedIds] = useState<Set<string>>(new Set());
  const [topScore, setTopScore] = useState(getTopScore);
  const [lastResult, setLastResult] = useState<{ isNew: boolean; rank: number } | null>(null);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const prevPhaseRef = useRef(gameState.phase);

  // Timer countdown
  useEffect(() => {
    const phase = gameState.phase;
    if (phase === 'gameover' || phase === 'levelcomplete') return;
    const interval = setInterval(() => {
      setGameState(prev => {
        if (prev.phase === 'gameover' || prev.phase === 'levelcomplete') return prev;
        if (prev.timeLeft <= 1) {
          playGameOver();
          return { ...prev, timeLeft: 0, phase: 'gameover' as const, lives: 0 };
        }
        if (prev.timeLeft <= 6) playTick();
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState.phase, gameState.level]);

  // Track phase transitions for sound
  useEffect(() => {
    if (prevPhaseRef.current === 'marking' && gameState.phase === 'sweeping') {
      playStartSweep();
    }
    if (gameState.phase === 'levelcomplete' && prevPhaseRef.current !== 'levelcomplete') {
      playLevelComplete();
    }
    if (gameState.phase === 'gameover' && prevPhaseRef.current !== 'gameover') {
      playGameOver();
    }
    prevPhaseRef.current = gameState.phase;
  }, [gameState.phase]);

  const handleBlockClick = useCallback((blockId: string) => {
    setGameState(prev => {
      // Mark-and-sweep marking phase
      if (prev.phase === 'marking') {
        const result = markBlock(prev, blockId);
        if (result.markResult === 'correct' || result.markResult === 'done') {
          playMark();
          setMarkedIds(s => new Set([...s, blockId]));
          if (result.markResult === 'done') {
            // Small shake to signal phase change
            setShakeIntensity(0.5);
            setShakeKey(k => k + 1);
          }
        } else if (result.markResult === 'wrong') {
          playWrong();
          setShakeIntensity(1);
          setShakeKey(k => k + 1);
        }
        return result;
      }

      // Sweep phase (mark-sweep mode) or playing phase (ref-counting mode)
      const isSweepPhase = prev.phase === 'sweeping';
      const next = isSweepPhase ? sweepBlock(prev, blockId) : clickBlock(prev, blockId);
      
      const wasGarbage = next.collectedGarbage > prev.collectedGarbage;
      
      if (wasGarbage) {
        playCollect(next.combo);
        // Animate removal
        setRemovingIds(new Set([blockId]));
        if (next.combo >= 3) {
          setShakeIntensity(Math.min(next.combo * 0.3, 2));
          setShakeKey(k => k + 1);
        }
        // Delay actual state update for animation
        setTimeout(() => {
          setRemovingIds(new Set());
          setGameState(next);
        }, 300);
        return prev; // Keep old state during animation
      } else if (next.lives < prev.lives) {
        playWrong();
        setShakeIntensity(1.5);
        setShakeKey(k => k + 1);
      }
      
      return next;
    });
  }, []);

  const handleNextLevel = useCallback(() => {
    const timeBonus = gameState.timeLeft * 10;
    setTotalScore(prev => prev + gameState.score + timeBonus);
    setMarkedIds(new Set());
    setLastResult(null);
    setGameState(generateLevel(gameState.level + 1));
  }, [gameState]);

  const handleRestart = useCallback(() => {
    setTotalScore(0);
    setMarkedIds(new Set());
    setLastResult(null);
    setGameState(generateLevel(1));
  }, []);

  // Save score on game over or level complete (game over only)
  useEffect(() => {
    if (gameState.phase === 'gameover') {
      const finalScore = totalScore + gameState.score;
      const result = saveHighScore(finalScore, gameState.level);
      setLastResult(result);
      setTopScore(getTopScore());
    }
  }, [gameState.phase]);

  const phaseConfig = gameState.phase === 'marking' 
    ? { icon: '🔍', label: 'MARK', desc: '루트에서 도달 가능한 블록을 클릭하여 마킹하세요', color: 'border-secondary bg-secondary/10 text-secondary' }
    : gameState.phase === 'sweeping'
    ? { icon: '🧹', label: 'SWEEP', desc: '마킹되지 않은 쓰레기 블록을 클릭하여 수거하세요', color: 'border-destructive bg-destructive/10 text-destructive' }
    : gameState.phase === 'playing'
    ? { icon: '🗑️', label: 'COLLECT', desc: '루트에서 도달할 수 없는 쓰레기 블록을 클릭하세요', color: 'border-primary bg-primary/10 text-primary' }
    : null;

  return (
    <div className="flex flex-col h-screen bg-background scanline">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold font-display text-primary neon-text tracking-tight">
            GC Sweeper
          </h1>
          <span className="text-[10px] font-mono text-muted-foreground border border-border px-2 py-0.5 rounded-sm">
            v2.0
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowScoreboard(s => !s)}
            className="text-xs font-mono text-muted-foreground hover:text-foreground border border-border px-3 py-1.5 rounded-sm transition-colors hover:border-neon-yellow/50"
          >
            🏆_TOP
          </button>
          <button
            onClick={() => setShowHelp(true)}
            className="text-xs font-mono text-muted-foreground hover:text-foreground border border-border px-3 py-1.5 rounded-sm transition-colors hover:border-primary/50"
          >
            ?_HELP
          </button>
          <button
            onClick={handleRestart}
            className="text-xs font-mono text-muted-foreground hover:text-destructive border border-border px-3 py-1.5 rounded-sm transition-colors hover:border-destructive/50"
          >
            RESTART
          </button>
        </div>
      </header>

      <GameHUD state={gameState} />

      {/* Phase indicator — always visible above the board */}
      {phaseConfig && (
        <div className={`mx-4 mt-3 px-4 py-3 rounded-md border-2 ${phaseConfig.color} text-center`}>
          <div className="flex items-center justify-center gap-2">
            <span className="text-lg">{phaseConfig.icon}</span>
            <span className="text-sm font-bold font-mono tracking-wider">{phaseConfig.label}</span>
          </div>
          <p className="text-xs font-mono mt-1 opacity-80">{phaseConfig.desc}</p>
        </div>
      )}

      {/* Tutorial hint */}
      {getTutorialHint(gameState.level) && (
        <div className="mx-4 mt-2 px-4 py-2 rounded-md border border-neon-yellow/40 bg-neon-yellow/5 text-center">
          <p className="text-xs font-mono text-neon-yellow">
            {getTutorialHint(gameState.level)}
          </p>
        </div>
      )}

      {/* Game area */}
      <GameBoard
        state={gameState}
        onBlockClick={handleBlockClick}
        removingIds={removingIds}
        shakeIntensity={shakeIntensity}
        markedIds={markedIds}
        key={`board-${gameState.level}`}
      />

      {/* Legend */}
      <footer className="flex items-center justify-center gap-6 px-6 py-3 border-t border-border text-[10px] font-mono text-muted-foreground flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-block-root/30 border border-block-root" />
          <span>ROOT</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-muted border border-border" />
          <span>블록</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-primary/20 border border-primary" />
          <span>마킹됨</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
          <span className="text-secondary">참조</span>
        </div>
      </footer>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg max-w-lg w-full p-6 neon-box">
            <h2 className="text-xl font-bold font-display text-primary neon-text mb-4">
              🧹 GC Sweeper
            </h2>
            <div className="space-y-3 text-sm font-mono text-foreground/80">
              <p>
                <span className="text-primary">메모리 블록</span>이 격자에 배치되어 있습니다.
                <span className="text-secondary"> 참조 화살표</span>가 블록 간의 연결을 보여줍니다.
              </p>
              
              <div className="border border-secondary/30 rounded p-3 bg-secondary/5">
                <p className="text-secondary font-bold mb-1">📌 Mark & Sweep 모드 (홀수 레벨)</p>
                <p className="text-[12px]">
                  1단계 <span className="text-primary">MARK</span>: 루트에서 도달 가능한 블록을 클릭하여 마킹<br/>
                  2단계 <span className="text-destructive">SWEEP</span>: 마킹되지 않은 쓰레기를 클릭하여 수거
                </p>
              </div>
              
              <div className="border border-accent/30 rounded p-3 bg-accent/5">
                <p className="text-accent font-bold mb-1">🔢 Ref Counting 모드 (짝수 레벨)</p>
                <p className="text-[12px]">
                  루트에서 도달할 수 없는 쓰레기 블록을 바로 클릭하여 수거
                </p>
              </div>

              <div className="border-t border-border pt-3 mt-3 space-y-1 text-[12px]">
                <p>⚡ 연속 수거/마킹하면 <span className="text-primary">콤보 보너스!</span></p>
                <p>💀 잘못 클릭하면 <span className="text-destructive">라이프 감소</span></p>
                <p>🔍 마우스 호버로 연결 관계 확인</p>
                <p>🔊 사운드 효과 포함 (브라우저 허용 필요)</p>
              </div>
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className="mt-6 w-full py-2 bg-primary text-primary-foreground font-mono text-sm rounded-sm hover:opacity-90 transition-opacity"
            >
              START_GC()
            </button>
          </div>
        </div>
      )}

      {/* Level Complete */}
      {gameState.phase === 'levelcomplete' && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-primary/50 rounded-lg max-w-sm w-full p-6 neon-box text-center">
            <h2 className="text-2xl font-bold font-display text-primary neon-text mb-2">
              SWEEP COMPLETE
            </h2>
            <p className="text-muted-foreground font-mono text-sm mb-4">
              Level {gameState.level} cleared!
            </p>
            <div className="space-y-2 mb-6 font-mono text-sm">
              <p>Score: <span className="text-primary">{gameState.score}</span></p>
              <p>Time bonus: <span className="text-neon-yellow">+{gameState.timeLeft * 10}</span></p>
              <p>Total: <span className="text-secondary">{(totalScore + gameState.score + gameState.timeLeft * 10).toLocaleString()}</span></p>
              <p>Wrong clicks: <span className="text-destructive">{gameState.wrongClicks}</span></p>
            </div>
            <button
              onClick={handleNextLevel}
              className="w-full py-2 bg-primary text-primary-foreground font-mono text-sm rounded-sm hover:opacity-90 transition-opacity"
            >
              NEXT_LEVEL({gameState.level + 1})
            </button>
          </div>
        </div>
      )}

      {/* Game Over */}
      {gameState.phase === 'gameover' && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-destructive/50 rounded-lg max-w-sm w-full p-6 neon-box-red text-center">
            <h2 className="text-2xl font-bold font-display text-destructive mb-2">
              SEGFAULT
            </h2>
            <p className="text-muted-foreground font-mono text-sm mb-4">
              Memory corruption detected
            </p>
            <div className="space-y-2 mb-6 font-mono text-sm">
              <p>Final Score: <span className="text-primary">{(totalScore + gameState.score).toLocaleString()}</span></p>
              <p>Level reached: <span className="text-secondary">{gameState.level}</span></p>
              <p>Best: <span className="text-neon-yellow">{topScore.toLocaleString()}</span></p>
              {lastResult?.isNew && (
                <p className="text-neon-yellow animate-pulse">🏆 NEW HIGH SCORE! #{lastResult.rank}</p>
              )}
            </div>
            <button
              onClick={handleRestart}
              className="w-full py-2 bg-destructive text-destructive-foreground font-mono text-sm rounded-sm hover:opacity-90 transition-opacity"
            >
              REBOOT()
            </button>
          </div>
        </div>
      )}

      {/* Scoreboard */}
      {showScoreboard && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-neon-yellow/50 rounded-lg max-w-sm w-full p-6 neon-box-yellow text-center">
            <h2 className="text-xl font-bold font-display text-neon-yellow mb-4">
              🏆 HIGH SCORES
            </h2>
            <div className="space-y-1 font-mono text-sm mb-6">
              {getHighScores().length === 0 ? (
                <p className="text-muted-foreground">No scores yet. Play a game!</p>
              ) : (
                getHighScores().map((entry, i) => (
                  <div key={i} className={`flex justify-between px-3 py-1.5 rounded-sm ${i === 0 ? 'bg-neon-yellow/10 text-neon-yellow' : 'text-foreground/70'}`}>
                    <span>#{i + 1}</span>
                    <span className="text-primary">{entry.score.toLocaleString()}</span>
                    <span className="text-muted-foreground">Lv.{entry.level}</span>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => setShowScoreboard(false)}
              className="w-full py-2 bg-muted text-foreground font-mono text-sm rounded-sm hover:opacity-90 transition-opacity"
            >
              CLOSE()
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
