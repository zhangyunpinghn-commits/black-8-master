import { describe, expect, it } from 'vitest';
import { resolveShot } from './rules';
import type { GameState, ShotResult } from './types';

const state = (overrides: Partial<GameState> = {}): GameState => ({
  currentPlayer: 'human',
  players: { human: { id: 'human', name: '你', group: null }, ai: { id: 'ai', name: '电脑', group: null } },
  turnState: 'resolving',
  isBreak: false,
  ballInHand: false,
  winner: null,
  message: '',
  ...overrides
});
const shot = (overrides: Partial<ShotResult> = {}): ShotResult => ({ firstContact: 1, pocketed: [], cuePocketed: false, ...overrides });

describe('simplified eight-ball rules', () => {
  it('assigns a group after the first legal scoring shot', () => {
    const result = resolveShot(state(), shot({ pocketed: [3] }), [1, 2, 4, 5, 6, 7, 8, 9]);
    expect(result.assignedGroup).toBe('solid');
    expect(result.keepTurn).toBe(true);
  });

  it('gives ball in hand after a scratch', () => {
    const result = resolveShot(state(), shot({ cuePocketed: true }), [1, 8, 9]);
    expect(result.foul).toBe('cue-pocketed');
    expect(result.nextPlayer).toBe('ai');
  });

  it('detects no contact and wrong first ball', () => {
    expect(resolveShot(state(), shot({ firstContact: null }), [1, 8]).foul).toBe('no-contact');
    const grouped = state();
    grouped.players.human.group = 'solid';
    expect(resolveShot(grouped, shot({ firstContact: 9 }), [1, 8, 9]).foul).toBe('wrong-first-ball');
  });

  it('loses when black eight is pocketed early', () => {
    const result = resolveShot(state(), shot({ firstContact: 8, pocketed: [8] }), [1, 2, 9]);
    expect(result.winner).toBe('ai');
  });

  it('wins after clearing the assigned group', () => {
    const grouped = state();
    grouped.players.human.group = 'solid';
    const result = resolveShot(grouped, shot({ firstContact: 8, pocketed: [8] }), [8, 9, 10]);
    expect(result.winner).toBe('human');
  });
});
