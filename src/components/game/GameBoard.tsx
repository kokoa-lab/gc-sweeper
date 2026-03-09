import { useState, useMemo, useEffect } from 'react';
import type { GameState } from '@/lib/gc-engine';
import { MemoryBlock } from './MemoryBlock';
import { ReferenceArrow } from './ReferenceArrow';

interface Props {
  state: GameState;
  onBlockClick: (id: string) => void;
  removingIds: Set<string>;
  shakeIntensity: number;
  markedIds: Set<string>;
}

export function GameBoard({ state, onBlockClick, removingIds, shakeIntensity, markedIds }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const cellSize = 80;
  const width = state.gridCols * cellSize;
  const height = state.gridRows * cellSize;

  const blockMap = useMemo(() => {
    const map = new Map<string, typeof state.blocks[0]>();
    state.blocks.forEach(b => map.set(b.id, b));
    return map;
  }, [state.blocks]);

  const highlighted = useMemo(() => {
    if (!hoveredId) return new Set<string>();
    const set = new Set<string>([hoveredId]);
    const block = blockMap.get(hoveredId);
    if (block) {
      block.references.forEach(r => set.add(r));
      block.referencedBy.forEach(r => set.add(r));
    }
    return set;
  }, [hoveredId, blockMap]);

  const highlightedEdges = useMemo(() => {
    if (!hoveredId) return new Set<string>();
    const set = new Set<string>();
    const block = blockMap.get(hoveredId);
    if (block) {
      block.references.forEach(r => set.add(`${hoveredId}->${r}`));
      block.referencedBy.forEach(r => set.add(`${r}->${hoveredId}`));
    }
    return set;
  }, [hoveredId, blockMap]);

  const getCenter = (block: typeof state.blocks[0]) => ({
    x: block.col * cellSize + cellSize / 2,
    y: block.row * cellSize + cellSize / 2,
  });

  // Shake animation
  const [shakeOffset, setShakeOffset] = useState({ x: 0, y: 0 });
  useEffect(() => {
    if (shakeIntensity <= 0) {
      setShakeOffset({ x: 0, y: 0 });
      return;
    }
    let frame: number;
    let start = performance.now();
    const duration = 300;
    const animate = (now: number) => {
      const elapsed = now - start;
      if (elapsed > duration) {
        setShakeOffset({ x: 0, y: 0 });
        return;
      }
      const decay = 1 - elapsed / duration;
      const intensity = shakeIntensity * decay;
      setShakeOffset({
        x: (Math.random() - 0.5) * intensity * 8,
        y: (Math.random() - 0.5) * intensity * 8,
      });
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [shakeIntensity]);

  return (
    <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
      <div
        className="relative"
        style={{
          transform: `translate(${shakeOffset.x}px, ${shakeOffset.y}px)`,
        }}
      >
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="grid-bg rounded-lg border border-border"
        >
          {/* Reference arrows */}
          {state.blocks.flatMap(block =>
            block.references
              .filter(refId => blockMap.has(refId))
              .map(refId => {
                const target = blockMap.get(refId)!;
                const from = getCenter(block);
                const to = getCenter(target);
                const edgeKey = `${block.id}->${refId}`;
                return (
                  <ReferenceArrow
                    key={edgeKey}
                    fromX={from.x}
                    fromY={from.y}
                    toX={to.x}
                    toY={to.y}
                    isHighlighted={highlightedEdges.has(edgeKey)}
                    isFromRoot={block.status === 'root'}
                  />
                );
              })
          )}

          {/* Memory blocks */}
          {state.blocks.map(block => (
            <MemoryBlock
              key={block.id}
              block={block}
              cellSize={cellSize}
              onClick={onBlockClick}
              isHovered={highlighted.has(block.id)}
              onHover={setHoveredId}
              isRemoving={removingIds.has(block.id)}
              isMarkedVisual={markedIds.has(block.id)}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
