const STORAGE_KEY = 'gc-sweeper-highscores';

export interface HighScoreEntry {
  score: number;
  level: number;
  date: string;
}

export function getHighScores(): HighScoreEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HighScoreEntry[];
  } catch {
    return [];
  }
}

export function saveHighScore(score: number, level: number): { isNew: boolean; rank: number } {
  const scores = getHighScores();
  const entry: HighScoreEntry = { score, level, date: new Date().toISOString() };
  scores.push(entry);
  scores.sort((a, b) => b.score - a.score);
  const top = scores.slice(0, 10);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(top));
  const rank = top.findIndex(e => e === entry);
  return { isNew: rank !== -1 && rank < 5, rank: rank === -1 ? top.length : rank + 1 };
}

export function getTopScore(): number {
  const scores = getHighScores();
  return scores.length > 0 ? scores[0].score : 0;
}
