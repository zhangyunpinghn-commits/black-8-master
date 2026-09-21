import { groupForBall, remainingForGroup } from './rules';
import type { AiDifficulty, AiShot, BallGroup, BallSnapshot } from './types';

const BALL_RADIUS = 13;

function distanceToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const abx = bx - ax;
  const aby = by - ay;
  const lengthSquared = abx * abx + aby * aby || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / lengthSquared));
  return Math.hypot(px - (ax + t * abx), py - (ay + t * aby));
}

function clearPath(from: BallSnapshot, to: { x: number; y: number }, balls: BallSnapshot[], ignored: number[]) {
  return balls.every((ball) => !ball.active || ignored.includes(ball.number) || distanceToSegment(ball.x, ball.y, from.x, from.y, to.x, to.y) > BALL_RADIUS * 2.15);
}

export function legalTargets(group: BallGroup, balls: BallSnapshot[]): BallSnapshot[] {
  const activeNumbers = balls.filter((ball) => ball.active).map((ball) => ball.number);
  const cleared = group !== null && remainingForGroup(group, activeNumbers) === 0;
  return balls.filter((ball) => ball.active && ball.number !== 0 && (cleared ? ball.number === 8 : group ? groupForBall(ball.number) === group : ball.number !== 8));
}

export function chooseAiShot(
  balls: BallSnapshot[],
  pockets: { x: number; y: number }[],
  group: BallGroup,
  difficulty: AiDifficulty,
  random: () => number = Math.random
): AiShot {
  const cue = balls.find((ball) => ball.number === 0 && ball.active);
  const targets = legalTargets(group, balls);
  if (!cue || targets.length === 0) return { angle: 0, power: 0.5, target: 8 };

  const candidates = targets.flatMap((target) => pockets.map((pocket) => {
    const pathClear = clearPath(target, pocket, balls, [target.number, 0]);
    const pocketAngle = Math.atan2(pocket.y - target.y, pocket.x - target.x);
    const contactX = target.x - Math.cos(pocketAngle) * BALL_RADIUS * 2;
    const contactY = target.y - Math.sin(pocketAngle) * BALL_RADIUS * 2;
    const cueClear = clearPath(cue, { x: contactX, y: contactY }, balls, [0, target.number]);
    const distance = Math.hypot(contactX - cue.x, contactY - cue.y) + Math.hypot(pocket.x - target.x, pocket.y - target.y);
    return { target, contactX, contactY, valid: pathClear && cueClear, score: (pathClear && cueClear ? 1600 : 0) - distance };
  }));

  const valid = candidates.filter((candidate) => candidate.valid).sort((a, b) => b.score - a.score);
  const pool = valid.length ? valid : candidates.sort((a, b) => b.score - a.score);
  const index = difficulty === 'hard' ? 0 : difficulty === 'normal' ? Math.min(Math.floor(random() * 2), pool.length - 1) : Math.floor(random() * pool.length);
  const shot = pool[Math.max(0, index)];
  const angleError = difficulty === 'easy' ? 0.14 : difficulty === 'normal' ? 0.055 : 0.018;
  const powerError = difficulty === 'easy' ? 0.22 : difficulty === 'normal' ? 0.1 : 0.035;
  const distance = Math.hypot(shot.contactX - cue.x, shot.contactY - cue.y);
  return {
    angle: Math.atan2(shot.contactY - cue.y, shot.contactX - cue.x) + (random() - 0.5) * angleError,
    power: Math.max(0.38, Math.min(0.96, 0.48 + distance / 900 + (random() - 0.5) * powerError)),
    target: shot.target.number
  };
}
