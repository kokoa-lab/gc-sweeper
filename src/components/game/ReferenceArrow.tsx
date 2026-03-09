interface Props {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  isHighlighted: boolean;
  isFromRoot: boolean;
}

export function ReferenceArrow({ fromX, fromY, toX, toY, isHighlighted, isFromRoot }: Props) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return null;

  // Shorten arrow by 15px on each end
  const nx = dx / len;
  const ny = dy / len;
  const startX = fromX + nx * 15;
  const startY = fromY + ny * 15;
  const endX = toX - nx * 15;
  const endY = toY - ny * 15;

  // Curve control point (slight bend)
  const midX = (startX + endX) / 2 + ny * 15;
  const midY = (startY + endY) / 2 - nx * 15;

  const arrowId = `arrow-${fromX}-${fromY}-${toX}-${toY}`;

  return (
    <g className={isHighlighted ? 'opacity-100' : 'opacity-40'}>
      <defs>
        <marker
          id={arrowId}
          markerWidth="8"
          markerHeight="6"
          refX="7"
          refY="3"
          orient="auto"
        >
          <path
            d="M0,0 L8,3 L0,6"
            className={isFromRoot ? 'fill-none stroke-block-root stroke-[1.5]' : 'fill-none stroke-secondary stroke-[1.5]'}
          />
        </marker>
      </defs>
      <path
        d={`M${startX},${startY} Q${midX},${midY} ${endX},${endY}`}
        className={`fill-none ${isFromRoot ? 'stroke-block-root/60' : 'stroke-secondary/60'} ${isHighlighted ? 'stroke-[2]' : 'stroke-[1]'}`}
        markerEnd={`url(#${arrowId})`}
      />
    </g>
  );
}
