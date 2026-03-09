import { type MemoryBlock as MemoryBlockType } from '@/lib/gc-engine';
import { cn } from '@/lib/utils';

interface Props {
  block: MemoryBlockType;
  cellSize: number;
  onClick: (id: string) => void;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  isRemoving?: boolean;
  isMarkedVisual?: boolean;
}

export function MemoryBlock({ block, cellSize, onClick, isHovered, onHover, isRemoving, isMarkedVisual }: Props) {
  const x = block.col * cellSize;
  const y = block.row * cellSize;
  const padding = 4;

  const isRoot = block.status === 'root';

  return (
    <g
      className="cursor-pointer"
      onClick={() => onClick(block.id)}
      onMouseEnter={() => onHover(block.id)}
      onMouseLeave={() => onHover(null)}
      style={{
        transition: 'opacity 0.3s, transform 0.4s',
        opacity: isRemoving ? 0 : 1,
        transform: isRemoving ? `translate(0, 40px)` : 'translate(0, 0)',
      }}
    >
      {/* Block background */}
      <rect
        x={x + padding}
        y={y + padding}
        width={cellSize - padding * 2}
        height={cellSize - padding * 2}
        rx={4}
        className={cn(
          'transition-all duration-200',
          isRoot
            ? 'fill-block-root/20 stroke-block-root'
            : isMarkedVisual
            ? 'fill-primary/20 stroke-primary'
            : 'fill-muted stroke-border',
          isHovered && 'stroke-[2.5]',
          !isHovered && 'stroke-[1.5]'
        )}
      />

      {/* Glow effect on hover */}
      {isHovered && (
        <rect
          x={x + padding}
          y={y + padding}
          width={cellSize - padding * 2}
          height={cellSize - padding * 2}
          rx={4}
          className="fill-none stroke-primary/40 stroke-[4] blur-[2px]"
        />
      )}

      {/* Marked checkmark */}
      {isMarkedVisual && (
        <text
          x={x + cellSize - padding - 6}
          y={y + padding + 10}
          textAnchor="middle"
          className="fill-primary text-[10px] pointer-events-none"
        >
          ✓
        </text>
      )}

      {/* Root indicator */}
      {isRoot && (
        <text
          x={x + cellSize / 2}
          y={y + padding + 14}
          textAnchor="middle"
          className="fill-block-root text-[9px] font-bold font-mono"
        >
          ROOT
        </text>
      )}

      {/* Label */}
      <text
        x={x + cellSize / 2}
        y={y + cellSize / 2 + (isRoot ? 4 : 0)}
        textAnchor="middle"
        dominantBaseline="middle"
        className={cn(
          'text-[10px] font-mono pointer-events-none',
          isRoot ? 'fill-block-root' : isMarkedVisual ? 'fill-primary' : 'fill-foreground'
        )}
      >
        {block.label.split('_')[0]}
      </text>

      {/* Address */}
      <text
        x={x + cellSize / 2}
        y={y + cellSize - padding - 8}
        textAnchor="middle"
        className="fill-muted-foreground text-[8px] font-mono pointer-events-none"
      >
        {block.label.split('_')[1]}
      </text>
    </g>
  );
}
