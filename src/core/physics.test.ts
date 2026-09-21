import { describe, expect, it } from 'vitest';
import { applyFriction, isPocketed, reflectOnCushion, resolveCircleCollision } from './physics';

describe('physics helpers', () => {
  it('slows a rolling ball to rest', () => {
    let velocity = { x: 10, y: 0 };
    for (let i = 0; i < 300; i += 1) velocity = applyFriction(velocity, 0.96);
    expect(velocity.x).toBe(0);
  });

  it('reflects from a vertical cushion', () => {
    expect(reflectOnCushion({ x: 5, y: 1 }, { x: -1, y: 0 })).toEqual({ x: -4.6000000000000005, y: 0.92 });
  });

  it('detects a ball entering a pocket', () => {
    expect(isPocketed({ x: 10, y: 8 }, { x: 0, y: 0 }, 13)).toBe(true);
    expect(isPocketed({ x: 14, y: 0 }, { x: 0, y: 0 }, 13)).toBe(false);
  });

  it('transfers velocity in a head-on collision', () => {
    const [a, b] = resolveCircleCollision({ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 0 });
    expect(a.x).toBe(0);
    expect(b.x).toBe(5);
  });
});
