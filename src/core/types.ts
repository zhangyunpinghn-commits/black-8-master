export type PlayerId = 'human' | 'ai';
export type BallGroup = 'solid' | 'stripe' | null;
export type AiDifficulty = 'easy' | 'normal' | 'hard';
export type FoulReason = 'no-contact' | 'wrong-first-ball' | 'cue-pocketed' | 'black-eight-early' | null;
export type TurnState = 'aiming' | 'rolling' | 'resolving' | 'game-over';

export interface PlayerState {
  id: PlayerId;
  name: string;
  group: BallGroup;
}

export interface GameState {
  currentPlayer: PlayerId;
  players: Record<PlayerId, PlayerState>;
  turnState: TurnState;
  isBreak: boolean;
  ballInHand: boolean;
  winner: PlayerId | null;
  message: string;
}

export interface ShotResult {
  firstContact: number | null;
  pocketed: number[];
  cuePocketed: boolean;
}

export interface RuleResolution {
  foul: FoulReason;
  nextPlayer: PlayerId;
  assignedGroup: BallGroup;
  winner: PlayerId | null;
  keepTurn: boolean;
  message: string;
}

export interface CustomizationSettings {
  version: 1;
  difficulty: AiDifficulty;
  tableTheme: 'emerald' | 'violet' | 'azure';
  cueStyle: 'maple' | 'carbon' | 'neon';
  background: 'night' | 'grid' | 'aurora';
  aimLine: number;
  powerSensitivity: number;
  sound: boolean;
  vibration: boolean;
}

export interface BallSnapshot {
  number: number;
  x: number;
  y: number;
  active: boolean;
}

export interface AiShot {
  angle: number;
  power: number;
  target: number;
}
