/**
 * DragOverlaySVG — visual feedback line drawn during touch/pointer card drag.
 */
export default function DragOverlaySVG({ touchPath }) {
  return (
    <svg className="fixed inset-0 pointer-events-none z-40">
      <line
        x1={touchPath.startX}
        y1={touchPath.startY}
        x2={touchPath.x}
        y2={touchPath.y}
        stroke="rgba(59, 130, 246, 0.6)"
        strokeWidth="3"
        strokeDasharray="6 6"
      />
      <circle cx={touchPath.startX} cy={touchPath.startY} r="6" fill="rgba(59, 130, 246, 0.6)" />
      <circle cx={touchPath.x} cy={touchPath.y} r="8" fill="rgba(59, 130, 246, 0.9)" />
    </svg>
  );
}
