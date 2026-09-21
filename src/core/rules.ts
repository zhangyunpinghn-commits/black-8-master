import type { BallGroup, GameState, PlayerId, RuleResolution, ShotResult } from './types';

export const groupForBall = (number: number): BallGroup => {
  if (number >= 1 && number <= 7) return 'solid';
  if (number >= 9 && number <= 15) return 'stripe';
  return null;
};

export const otherPlayer = (player: PlayerId): PlayerId => player === 'human' ? 'ai' : 'human';

export const remainingForGroup = (group: BallGroup, activeNumbers: number[]): number => {
  if (!group) return 0;
  return activeNumbers.filter((number) => groupForBall(number) === group).length;
};

export function resolveShot(state: GameState, shot: ShotResult, activeNumbers: number[]): RuleResolution {
  const current = state.currentPlayer;
  const opponent = otherPlayer(current);
  const playerGroup = state.players[current].group;
  const blackPocketed = shot.pocketed.includes(8);
  const hasClearedGroup = playerGroup !== null && remainingForGroup(playerGroup, activeNumbers) === 0;

  if (blackPocketed) {
    const legalBlack = !shot.cuePocketed && hasClearedGroup && shot.firstContact === 8;
    return {
      foul: legalBlack ? null : 'black-eight-early',
      nextPlayer: current,
      assignedGroup: null,
      winner: legalBlack ? current : opponent,
      keepTurn: false,
      message: legalBlack ? `${state.players[current].name} 赢得本局！` : `黑8违规落袋，${state.players[opponent].name} 获胜`
    };
  }

  let foul: RuleResolution['foul'] = null;
  if (shot.cuePocketed) foul = 'cue-pocketed';
  else if (shot.firstContact === null) foul = 'no-contact';
  else if (playerGroup && remainingForGroup(playerGroup, activeNumbers) > 0 && groupForBall(shot.firstContact) !== playerGroup) foul = 'wrong-first-ball';
  else if (playerGroup && remainingForGroup(playerGroup, activeNumbers) === 0 && shot.firstContact !== 8) foul = 'wrong-first-ball';

  let assignedGroup: BallGroup = null;
  if (!foul && !state.isBreak && !playerGroup) {
    const firstScoringBall = shot.pocketed.find((number) => groupForBall(number));
    if (firstScoringBall) assignedGroup = groupForBall(firstScoringBall);
  }

  const effectiveGroup = playerGroup ?? assignedGroup;
  const scoredOwnBall = shot.pocketed.some((number) => groupForBall(number) === effectiveGroup);
  const keepTurn = !foul && scoredOwnBall;
  const nextPlayer = keepTurn ? current : opponent;
  const foulMessages: Record<Exclude<RuleResolution['foul'], null>, string> = {
    'no-contact': '犯规：母球未碰到目标球',
    'wrong-first-ball': '犯规：先碰到了错误球组',
    'cue-pocketed': '犯规：母球落袋，对手获得自由球',
    'black-eight-early': '黑8提前落袋'
  };

  return {
    foul,
    nextPlayer,
    assignedGroup,
    winner: null,
    keepTurn,
    message: foul ? foulMessages[foul] : keepTurn ? '漂亮！继续击球' : '回合交换'
  };
}
