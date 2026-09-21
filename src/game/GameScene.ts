import Phaser from 'phaser';
import { chooseAiShot } from '../core/ai';
import { GameAudio } from '../core/audio';
import { resolveShot } from '../core/rules';
import type { BallSnapshot, CustomizationSettings, GameState, PlayerId, ShotResult } from '../core/types';

export const gameBus = new EventTarget();

const TABLE = { left: 60, right: 860, top: 60, bottom: 440 };
const POCKETS = [
  { x: 66, y: 66 }, { x: 460, y: 61 }, { x: 854, y: 66 },
  { x: 66, y: 434 }, { x: 460, y: 439 }, { x: 854, y: 434 }
];
const BALL_RADIUS = 13;
const COLORS: Record<number, number> = {
  1: 0xf6d64a, 2: 0x2d8cff, 3: 0xe64a4a, 4: 0x8b5bd6, 5: 0xff8a31, 6: 0x32c779, 7: 0xa83939,
  8: 0x10151b, 9: 0xf6d64a, 10: 0x2d8cff, 11: 0xe64a4a, 12: 0x8b5bd6, 13: 0xff8a31, 14: 0x32c779, 15: 0xa83939
};

interface BallEntity {
  number: number;
  view: Phaser.GameObjects.Container;
  body: MatterJS.BodyType;
  active: boolean;
}

interface UiState {
  game: GameState;
  power: number;
  angle: number;
  remaining: Record<PlayerId, number>;
  paused: boolean;
}

export class GameScene extends Phaser.Scene {
  private balls: BallEntity[] = [];
  private state!: GameState;
  private settings!: CustomizationSettings;
  private aimGraphics!: Phaser.GameObjects.Graphics;
  private cueGraphics!: Phaser.GameObjects.Graphics;
  private tableGraphics!: Phaser.GameObjects.Graphics;
  private power = 0.68;
  private aimAngle = 0;
  private shot: ShotResult = { firstContact: null, pocketed: [], cuePocketed: false };
  private stillFrames = 0;
  private shotStartedAt = 0;
  private audio = new GameAudio();
  private paused = false;
  private listeners: Array<[string, EventListener]> = [];

  constructor() { super('game'); }

  init(data: { settings: CustomizationSettings }) {
    this.settings = data.settings;
    this.state = this.freshState();
  }

  create() {
    this.matter.world.setBounds(45, 45, 830, 410, 42, true, true, true, true);
    this.tableGraphics = this.add.graphics().setDepth(0);
    this.drawTable();
    this.aimGraphics = this.add.graphics().setDepth(8);
    this.cueGraphics = this.add.graphics().setDepth(7);
    this.createBalls();
    this.bindEvents();
    this.matter.world.on('collisionstart', this.onCollisionStart, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerdown', this.onPointerDown, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.syncUi();
  }

  update() {
    if (this.paused) return;
    this.checkPockets();
    if (this.state.turnState === 'rolling') this.checkSettled();
    if (this.state.turnState === 'aiming') this.drawAim();
  }

  private freshState(): GameState {
    return {
      currentPlayer: 'human',
      players: {
        human: { id: 'human', name: '你', group: null },
        ai: { id: 'ai', name: '电脑', group: null }
      },
      turnState: 'aiming',
      isBreak: true,
      ballInHand: false,
      winner: null,
      message: '你的回合 · 开球'
    };
  }

  private drawTable() {
    const theme = this.settings.tableTheme;
    const cloth = theme === 'violet' ? 0x382963 : theme === 'azure' ? 0x0a5170 : 0x07564f;
    const rail = theme === 'violet' ? 0x9f7aff : theme === 'azure' ? 0x39c8ff : 0x36f2c5;
    const g = this.tableGraphics.clear();
    g.fillStyle(0x071018, 1).fillRoundedRect(15, 15, 890, 470, 34);
    g.lineStyle(5, rail, 0.72).strokeRoundedRect(25, 25, 870, 450, 27);
    g.fillStyle(0x13262c, 1).fillRoundedRect(38, 38, 844, 424, 23);
    g.fillStyle(cloth, 1).fillRoundedRect(TABLE.left, TABLE.top, TABLE.right - TABLE.left, TABLE.bottom - TABLE.top, 14);
    g.lineStyle(1, 0xffffff, 0.12).lineBetween(260, TABLE.top + 6, 260, TABLE.bottom - 6);
    g.fillStyle(0xffffff, 0.28).fillCircle(260, 250, 3);
    POCKETS.forEach((pocket) => {
      g.fillStyle(0x010508, 1).fillCircle(pocket.x, pocket.y, 22);
      g.lineStyle(2, rail, 0.22).strokeCircle(pocket.x, pocket.y, 24);
    });
  }

  private createBalls() {
    this.balls = [];
    this.createBall(0, 260, 250);
    const order = [1, 9, 2, 10, 8, 3, 11, 4, 12, 5, 13, 6, 14, 7, 15];
    let index = 0;
    const startX = 635;
    for (let row = 0; row < 5; row += 1) {
      for (let col = 0; col <= row; col += 1) {
        this.createBall(order[index++], startX + row * 24, 250 + (col - row / 2) * 27);
      }
    }
  }

  private createBall(number: number, x: number, y: number) {
    const fill = number === 0 ? 0xf5fbff : number > 8 ? 0xf7f9fb : COLORS[number];
    const circle = this.add.circle(0, 0, BALL_RADIUS, fill).setStrokeStyle(number > 8 ? 6 : 1.5, number > 8 ? COLORS[number] : 0xffffff, number > 8 ? 1 : 0.36);
    const shine = this.add.circle(-4, -5, 3, 0xffffff, 0.42);
    const children: Phaser.GameObjects.GameObject[] = [circle, shine];
    if (number > 0) {
      children.push(this.add.text(0, 0, String(number), { fontFamily: 'Arial', fontSize: number > 9 ? '8px' : '9px', fontStyle: 'bold', color: number === 8 ? '#ffffff' : '#091015' }).setOrigin(0.5));
    }
    const view = this.add.container(x, y, children).setDepth(4);
    this.matter.add.gameObject(view, { shape: { type: 'circle', radius: BALL_RADIUS }, restitution: 0.94, friction: 0.004, frictionAir: 0.014, density: 0.002 });
    const body = view.body as MatterJS.BodyType;
    body.label = `ball-${number}`;
    this.balls.push({ number, view, body, active: true });
  }

  private bindEvents() {
    this.listen('ui:shoot', () => this.shoot());
    this.listen('ui:power', (event) => { this.power = (event as CustomEvent<number>).detail; this.syncUi(); });
    this.listen('ui:nudge', (event) => { this.aimAngle += (event as CustomEvent<number>).detail; this.drawAim(); this.syncUi(); });
    this.listen('ui:pause', () => this.togglePause());
    this.listen('ui:new-game', () => this.scene.restart({ settings: this.settings }));
    this.listen('settings:changed', (event) => {
      this.settings = (event as CustomEvent<CustomizationSettings>).detail;
      this.drawTable();
      this.syncUi();
    });
  }

  private listen(type: string, handler: EventListener) {
    gameBus.addEventListener(type, handler);
    this.listeners.push([type, handler]);
  }

  private cleanup() {
    this.listeners.forEach(([type, handler]) => gameBus.removeEventListener(type, handler));
    this.listeners = [];
    this.matter.world.off('collisionstart', this.onCollisionStart, this);
  }

  private onCollisionStart(event: Phaser.Physics.Matter.Events.CollisionStartEvent) {
    if (this.state.turnState !== 'rolling' || this.shot.firstContact !== null) return;
    for (const pair of event.pairs) {
      const labels = [pair.bodyA.label, pair.bodyB.label];
      if (!labels.includes('ball-0')) continue;
      const other = labels.find((label) => label.startsWith('ball-') && label !== 'ball-0');
      if (other) {
        this.shot.firstContact = Number(other.replace('ball-', ''));
        this.audio.play('hit', this.settings.sound);
        break;
      }
    }
  }

  private onPointerMove(pointer: Phaser.Input.Pointer) {
    if (!this.canHumanAim()) return;
    const cue = this.ball(0);
    if (!cue) return;
    this.aimAngle = Math.atan2(pointer.worldY - cue.view.y, pointer.worldX - cue.view.x);
    this.drawAim();
    this.syncUi();
  }

  private onPointerDown(pointer: Phaser.Input.Pointer) {
    if (!this.canHumanAim() || !this.state.ballInHand) return;
    const x = Phaser.Math.Clamp(pointer.worldX, TABLE.left + BALL_RADIUS + 5, TABLE.right - BALL_RADIUS - 5);
    const y = Phaser.Math.Clamp(pointer.worldY, TABLE.top + BALL_RADIUS + 5, TABLE.bottom - BALL_RADIUS - 5);
    const clear = this.balls.every((ball) => !ball.active || ball.number === 0 || Math.hypot(ball.view.x - x, ball.view.y - y) > BALL_RADIUS * 2.2);
    if (!clear) return;
    const cue = this.ball(0)!;
    this.matter.body.setPosition(cue.body, { x, y });
    cue.view.setVisible(true);
    this.state.message = '自由球已放置，可以击球';
    this.syncUi();
  }

  private canHumanAim() {
    return !this.paused && this.state.currentPlayer === 'human' && this.state.turnState === 'aiming';
  }

  private shoot(angle = this.aimAngle, power = this.power) {
    if (this.paused || this.state.turnState !== 'aiming') return;
    if (this.state.currentPlayer === 'human' && !this.canHumanAim()) return;
    const cue = this.ball(0);
    if (!cue || !cue.active) return;
    this.state.ballInHand = false;
    cue.view.setVisible(true);
    cue.body.isSensor = false;
    this.shot = { firstContact: null, pocketed: [], cuePocketed: false };
    this.state.turnState = 'rolling';
    this.state.message = '球在滚动…';
    this.shotStartedAt = this.time.now;
    this.stillFrames = 0;
    const speed = 17.5 * Math.max(0.12, Math.min(1, power));
    this.matter.body.setVelocity(cue.body, { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed });
    this.audio.play('hit', this.settings.sound);
    if (this.settings.vibration && navigator.vibrate) navigator.vibrate(18);
    this.aimGraphics.clear();
    this.cueGraphics.clear();
    this.syncUi();
  }

  private drawAim() {
    const cue = this.ball(0);
    if (!cue?.active || this.state.currentPlayer !== 'human') {
      this.aimGraphics.clear();
      this.cueGraphics.clear();
      return;
    }
    const length = 190 + this.settings.aimLine * 3.3;
    const dx = Math.cos(this.aimAngle);
    const dy = Math.sin(this.aimAngle);
    this.aimGraphics.clear().lineStyle(2, 0xeafff8, 0.76);
    for (let distance = 22; distance < length; distance += 18) {
      this.aimGraphics.lineBetween(cue.view.x + dx * distance, cue.view.y + dy * distance, cue.view.x + dx * (distance + 9), cue.view.y + dy * (distance + 9));
    }
    const cueColor = this.settings.cueStyle === 'carbon' ? 0x4f5961 : this.settings.cueStyle === 'neon' ? 0x57ffe0 : 0xd7b579;
    const cueLength = 180;
    this.cueGraphics.clear().lineStyle(this.settings.cueStyle === 'neon' ? 8 : 7, cueColor, 1);
    this.cueGraphics.lineBetween(cue.view.x - dx * 24, cue.view.y - dy * 24, cue.view.x - dx * cueLength, cue.view.y - dy * cueLength);
    this.cueGraphics.lineStyle(2, 0xffffff, 0.75).lineBetween(cue.view.x - dx * 22, cue.view.y - dy * 22, cue.view.x - dx * 35, cue.view.y - dy * 35);
  }

  private checkPockets() {
    for (const ball of this.balls) {
      if (!ball.active || this.state.turnState !== 'rolling') continue;
      const pocketed = POCKETS.some((pocket) => Math.hypot(ball.view.x - pocket.x, ball.view.y - pocket.y) <= 22);
      if (!pocketed) continue;
      this.matter.body.setVelocity(ball.body, { x: 0, y: 0 });
      if (ball.number === 0) {
        this.shot.cuePocketed = true;
        ball.view.setVisible(false);
        ball.body.isSensor = true;
        this.matter.body.setPosition(ball.body, { x: 240, y: 250 });
      } else {
        ball.active = false;
        ball.view.setVisible(false);
        ball.body.collisionFilter.mask = 0;
        this.shot.pocketed.push(ball.number);
      }
      this.audio.play('pocket', this.settings.sound);
      if (this.settings.vibration && navigator.vibrate) navigator.vibrate([12, 18, 12]);
    }
  }

  private checkSettled() {
    if (this.time.now - this.shotStartedAt < 350) return;
    const moving = this.balls.some((ball) => ball.active && ball.view.visible && ball.body.speed > 0.09);
    this.stillFrames = moving ? 0 : this.stillFrames + 1;
    if (this.stillFrames >= 15) this.finishShot();
  }

  private finishShot() {
    this.state.turnState = 'resolving';
    const activeNumbers = this.balls.filter((ball) => ball.active && ball.number > 0).map((ball) => ball.number);
    const resolution = resolveShot(this.state, this.shot, activeNumbers);
    const shooter = this.state.currentPlayer;
    if (resolution.assignedGroup) {
      this.state.players[shooter].group = resolution.assignedGroup;
      this.state.players[shooter === 'human' ? 'ai' : 'human'].group = resolution.assignedGroup === 'solid' ? 'stripe' : 'solid';
    }
    this.state.isBreak = false;
    this.state.winner = resolution.winner;
    this.state.message = resolution.message;
    if (resolution.winner) {
      this.state.turnState = 'game-over';
      this.audio.play('win', this.settings.sound);
      gameBus.dispatchEvent(new CustomEvent('game:over', { detail: { winner: resolution.winner, message: resolution.message } }));
      this.syncUi();
      return;
    }

    this.state.currentPlayer = resolution.nextPlayer;
    this.state.ballInHand = Boolean(resolution.foul);
    this.restoreCue();
    this.state.turnState = 'aiming';
    this.syncUi();
    if (this.state.currentPlayer === 'ai') this.time.delayedCall(850, () => this.playAiTurn());
  }

  private restoreCue() {
    const cue = this.ball(0)!;
    cue.active = true;
    cue.body.collisionFilter.mask = 0xffffffff;
    cue.body.isSensor = false;
    cue.view.setVisible(true);
    this.matter.body.setVelocity(cue.body, { x: 0, y: 0 });
    if (this.shot.cuePocketed || this.state.ballInHand) {
      const x = this.state.currentPlayer === 'ai' ? 245 : 225;
      this.matter.body.setPosition(cue.body, { x, y: 250 });
    }
  }

  private playAiTurn() {
    if (this.paused || this.state.currentPlayer !== 'ai' || this.state.turnState !== 'aiming') return;
    this.state.message = '电脑正在瞄准…';
    this.syncUi();
    const snapshots: BallSnapshot[] = this.balls.map((ball) => ({ number: ball.number, x: ball.view.x, y: ball.view.y, active: ball.active }));
    const shot = chooseAiShot(snapshots, POCKETS, this.state.players.ai.group, this.settings.difficulty);
    this.time.delayedCall(520, () => this.shoot(shot.angle, shot.power));
  }

  private togglePause() {
    this.paused = !this.paused;
    this.matter.world.enabled = !this.paused;
    this.syncUi();
    if (!this.paused && this.state.currentPlayer === 'ai' && this.state.turnState === 'aiming') this.time.delayedCall(300, () => this.playAiTurn());
  }

  private ball(number: number) { return this.balls.find((ball) => ball.number === number); }

  private syncUi() {
    const remaining = { human: 7, ai: 7 };
    for (const player of ['human', 'ai'] as PlayerId[]) {
      const group = this.state.players[player].group;
      remaining[player] = group ? this.balls.filter((ball) => ball.active && ((group === 'solid' && ball.number >= 1 && ball.number <= 7) || (group === 'stripe' && ball.number >= 9))).length : 7;
    }
    const detail: UiState = { game: structuredClone(this.state), power: this.power, angle: this.aimAngle, remaining, paused: this.paused };
    gameBus.dispatchEvent(new CustomEvent('game:update', { detail }));
  }
}
