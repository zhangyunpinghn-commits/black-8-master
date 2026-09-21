export interface Vec2 { x: number; y: number }

export const applyFriction = (velocity: Vec2, drag: number): Vec2 => ({
  x: Math.abs(velocity.x) < 0.01 ? 0 : velocity.x * drag,
  y: Math.abs(velocity.y) < 0.01 ? 0 : velocity.y * drag
});

export const reflectOnCushion = (velocity: Vec2, normal: Vec2, restitution = 0.92): Vec2 => {
  const dot = velocity.x * normal.x + velocity.y * normal.y;
  return {
    x: (velocity.x - 2 * dot * normal.x) * restitution,
    y: (velocity.y - 2 * dot * normal.y) * restitution
  };
};

export const isPocketed = (point: Vec2, pocket: Vec2, radius: number): boolean =>
  Math.hypot(point.x - pocket.x, point.y - pocket.y) <= radius;

export function resolveCircleCollision(a: Vec2, av: Vec2, b: Vec2, bv: Vec2): [Vec2, Vec2] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distance = Math.hypot(dx, dy) || 1;
  const nx = dx / distance;
  const ny = dy / distance;
  const relative = (av.x - bv.x) * nx + (av.y - bv.y) * ny;
  if (relative <= 0) return [av, bv];
  return [
    { x: av.x - relative * nx, y: av.y - relative * ny },
    { x: bv.x + relative * nx, y: bv.y + relative * ny }
  ];
}
