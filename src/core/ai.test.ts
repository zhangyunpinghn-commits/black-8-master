import { describe, expect, it } from 'vitest';
import { chooseAiShot, legalTargets } from './ai';
import type { BallSnapshot } from './types';

const balls: BallSnapshot[] = [
  { number: 0, x: 220, y: 250, active: true },
  { number: 1, x: 480, y: 220, active: true },
  { number: 8, x: 650, y: 250, active: true },
  { number: 9, x: 500, y: 320, active: true }
];
const pockets = [{ x: 60, y: 60 }, { x: 460, y: 60 }, { x: 860, y: 60 }, { x: 860, y: 440 }];

describe('AI shot selection', () => {
  it('only selects legal targets for an assigned group', () => {
    expect(legalTargets('solid', balls).map((ball) => ball.number)).toEqual([1]);
    expect(legalTargets('stripe', balls).map((ball) => ball.number)).toEqual([9]);
  });

  it('returns a deterministic valid shot with a seeded random source', () => {
    const seeded = () => 0.25;
    const first = chooseAiShot(balls, pockets, 'solid', 'hard', seeded);
    const second = chooseAiShot(balls, pockets, 'solid', 'hard', seeded);
    expect(first).toEqual(second);
    expect(first.target).toBe(1);
    expect(first.power).toBeGreaterThan(0);
  });

  it('falls back without hanging when no direct path exists', () => {
    const crowded = [...balls, { number: 2, x: 350, y: 235, active: true }];
    const result = chooseAiShot(crowded, pockets, 'solid', 'easy', () => 0.4);
    expect([1, 2]).toContain(result.target);
    expect(Number.isFinite(result.angle)).toBe(true);
  });
});
