import Phaser from 'phaser';
import { registerSW } from 'virtual:pwa-register';
import { loadSettings, saveSettings } from './core/settings';
import type { CustomizationSettings, GameState, PlayerId } from './core/types';
import { GameScene, gameBus } from './game/GameScene';
import './style.css';

interface UiUpdate {
  game: GameState;
  power: number;
  angle: number;
  remaining: Record<PlayerId, number>;
  paused: boolean;
}

let settings = loadSettings();

const icon = (name: 'settings' | 'pause' | 'restart' | 'close') => {
  const paths = {
    settings: '<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-2.83 2.83-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21h-4v-.17a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06-2.83-2.83.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3v-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06L7.04 4.3l.06.06a1.65 1.65 0 0 0 1.82.33h.16a1.65 1.65 0 0 0 1-1.51V3h4v.17a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06 2.83 2.83-.06.06A1.65 1.65 0 0 0 19.4 9v.08a1.65 1.65 0 0 0 1.51 1H21v4h-.09a1.65 1.65 0 0 0-1.51.92Z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    restart: '<path d="M20 11a8 8 0 1 0-2.34 5.66M20 4v7h-7"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>'
  };
  return `<svg aria-hidden="true" viewBox="0 0 24 24">${paths[name]}</svg>`;
};

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <main class="game-shell">
    <header class="topbar">
      <div class="brand"><span class="brand-ball">8</span><div><strong>黑8大师</strong><small>NEON POOL</small></div></div>
      <div class="scoreboard">
        <div class="player active" data-player="human"><span>你</span><b id="human-group">未分组</b><i id="human-left">7</i></div>
        <div class="versus">VS</div>
        <div class="player" data-player="ai"><span>电脑</span><b id="ai-group">未分组</b><i id="ai-left">7</i></div>
      </div>
      <div class="top-actions">
        <button class="icon-button" id="pause-button" aria-label="暂停游戏">${icon('pause')}</button>
        <button class="icon-button" id="settings-button" aria-label="打开设置">${icon('settings')}</button>
      </div>
    </header>

    <section class="play-layout">
      <div class="table-panel">
        <div class="status-pill"><span id="turn-dot"></span><b id="turn-label">你的回合</b><em id="turn-message">开球</em></div>
        <div id="game" aria-label="台球桌游戏区域"></div>
      </div>
      <aside class="controls" aria-label="击球控制">
        <div class="power-copy"><span>击球力度</span><b id="power-value">68</b><small>%</small></div>
        <div class="power-track"><input class="power" id="power" type="range" min="8" max="100" value="68" orient="vertical" aria-label="击球力度" /></div>
        <div class="nudge-row"><button id="nudge-left" aria-label="向左微调">−</button><span>微调</span><button id="nudge-right" aria-label="向右微调">＋</button></div>
        <button class="shoot" id="shoot"><span>击球</span><small>SHOT</small></button>
      </aside>
    </section>
    <footer><span>滑动球桌调整方向</span><i></i><span>设置力度</span><i></i><span>点击击球确认</span></footer>
  </main>

  <div class="rotate"><span class="rotate-phone">↻</span><span class="rotate-ball">8</span><h1>请横屏游戏</h1><p>旋转手机，获得完整球桌视野</p></div>

  <div class="modal-backdrop" id="settings-modal" hidden>
    <section class="modal settings-card" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <header><div><small>GAME SETUP</small><h2 id="settings-title">游戏设置</h2></div><button class="icon-button close" data-close aria-label="关闭设置">${icon('close')}</button></header>
      <div class="setting-grid">
        <label><span>AI 难度</span><select id="difficulty"><option value="easy">简单</option><option value="normal">普通</option><option value="hard">困难</option></select></label>
        <label><span>瞄准线长度</span><div class="range-with-value"><input id="aim-line" type="range" min="25" max="100" /><b id="aim-line-value"></b></div></label>
        <label><span>力度灵敏度</span><select id="power-sensitivity"><option value="0.8">沉稳</option><option value="1">标准</option><option value="1.2">灵敏</option></select></label>
        <div class="setting-row"><span>音效</span><button class="switch" id="sound" role="switch"><i></i></button></div>
        <div class="setting-row"><span>震动反馈</span><button class="switch" id="vibration" role="switch"><i></i></button></div>
      </div>
      <div class="custom-section"><h3>球桌颜色</h3><div class="swatches" id="table-themes"><button data-value="emerald" style="--swatch:#16a889" aria-label="翡翠球桌"></button><button data-value="violet" style="--swatch:#7654d6" aria-label="紫罗兰球桌"></button><button data-value="azure" style="--swatch:#1287b6" aria-label="湛蓝球桌"></button></div></div>
      <div class="custom-section"><h3>球杆款式</h3><div class="choice-chips" id="cue-styles"><button data-value="maple">枫木</button><button data-value="carbon">碳纤维</button><button data-value="neon">霓光</button></div></div>
      <div class="custom-section"><h3>环境背景</h3><div class="choice-chips" id="backgrounds"><button data-value="night">深夜</button><button data-value="grid">网格</button><button data-value="aurora">极光</button></div></div>
      <button class="primary" data-close>保存并返回</button>
    </section>
  </div>

  <div class="modal-backdrop" id="pause-modal" hidden>
    <section class="modal pause-card" role="dialog" aria-modal="true"><span class="mini-ball">8</span><small>GAME PAUSED</small><h2>比赛暂停</h2><button class="primary" id="resume">继续比赛</button><button class="secondary" id="restart">${icon('restart')} 重新开局</button></section>
  </div>

  <div class="modal-backdrop" id="game-over-modal" hidden>
    <section class="modal pause-card" role="dialog" aria-modal="true"><span class="trophy">◆</span><small>GAME OVER</small><h2 id="game-over-title">你赢了！</h2><p id="game-over-message"></p><button class="primary" id="play-again">再来一局</button></section>
  </div>
`;

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const emit = <T>(type: string, detail?: T) => gameBus.dispatchEvent(new CustomEvent(type, { detail }));
const settingsModal = $('#settings-modal');
const pauseModal = $('#pause-modal');
const gameOverModal = $('#game-over-modal');
const powerInput = $<HTMLInputElement>('#power');

function applySettingsUi() {
  document.body.dataset.background = settings.background;
  $<HTMLSelectElement>('#difficulty').value = settings.difficulty;
  $<HTMLInputElement>('#aim-line').value = String(settings.aimLine);
  $('#aim-line-value').textContent = `${settings.aimLine}%`;
  $<HTMLSelectElement>('#power-sensitivity').value = String(settings.powerSensitivity);
  for (const [id, value] of [['sound', settings.sound], ['vibration', settings.vibration]] as const) {
    $<HTMLButtonElement>(`#${id}`).setAttribute('aria-checked', String(value));
  }
  document.querySelectorAll<HTMLButtonElement>('[data-value]').forEach((button) => {
    const value = button.dataset.value;
    button.classList.toggle('selected', value === settings.tableTheme || value === settings.cueStyle || value === settings.background);
  });
}

function persistSettings() {
  saveSettings(settings);
  applySettingsUi();
  emit('settings:changed', settings);
}

$('#settings-button').addEventListener('click', () => { applySettingsUi(); settingsModal.hidden = false; });
document.querySelectorAll<HTMLElement>('[data-close]').forEach((button) => button.addEventListener('click', () => { settingsModal.hidden = true; persistSettings(); }));
$('#pause-button').addEventListener('click', () => emit('ui:pause'));
$('#resume').addEventListener('click', () => emit('ui:pause'));
$('#restart').addEventListener('click', () => { pauseModal.hidden = true; emit('ui:new-game'); });
$('#play-again').addEventListener('click', () => { gameOverModal.hidden = true; emit('ui:new-game'); });
$('#shoot').addEventListener('click', () => emit('ui:shoot'));
$('#nudge-left').addEventListener('click', () => emit('ui:nudge', -0.018));
$('#nudge-right').addEventListener('click', () => emit('ui:nudge', 0.018));
powerInput.addEventListener('input', () => {
  const normalized = Math.min(1, (Number(powerInput.value) / 100) * settings.powerSensitivity);
  $('#power-value').textContent = powerInput.value;
  emit('ui:power', normalized);
});
$<HTMLSelectElement>('#difficulty').addEventListener('change', (event) => { settings.difficulty = (event.target as HTMLSelectElement).value as CustomizationSettings['difficulty']; persistSettings(); });
$<HTMLInputElement>('#aim-line').addEventListener('input', (event) => { settings.aimLine = Number((event.target as HTMLInputElement).value); persistSettings(); });
$<HTMLSelectElement>('#power-sensitivity').addEventListener('change', (event) => { settings.powerSensitivity = Number((event.target as HTMLSelectElement).value); persistSettings(); });
for (const id of ['sound', 'vibration'] as const) {
  $(`#${id}`).addEventListener('click', () => { settings[id] = !settings[id]; persistSettings(); });
}
$('#table-themes').addEventListener('click', (event) => { const value = (event.target as HTMLElement).dataset.value as CustomizationSettings['tableTheme']; if (value) { settings.tableTheme = value; persistSettings(); } });
$('#cue-styles').addEventListener('click', (event) => { const value = (event.target as HTMLElement).dataset.value as CustomizationSettings['cueStyle']; if (value) { settings.cueStyle = value; persistSettings(); } });
$('#backgrounds').addEventListener('click', (event) => { const value = (event.target as HTMLElement).dataset.value as CustomizationSettings['background']; if (value) { settings.background = value; persistSettings(); } });

gameBus.addEventListener('game:update', (event) => {
  const update = (event as CustomEvent<UiUpdate>).detail;
  const current = update.game.currentPlayer;
  document.querySelectorAll('.player').forEach((node) => node.classList.toggle('active', (node as HTMLElement).dataset.player === current));
  const label = (group: GameState['players']['human']['group']) => group === 'solid' ? '全色球' : group === 'stripe' ? '花色球' : '未分组';
  $('#human-group').textContent = label(update.game.players.human.group);
  $('#ai-group').textContent = label(update.game.players.ai.group);
  $('#human-left').textContent = String(update.remaining.human);
  $('#ai-left').textContent = String(update.remaining.ai);
  $('#turn-label').textContent = current === 'human' ? '你的回合' : '电脑回合';
  $('#turn-message').textContent = update.game.message;
  $('#turn-dot').classList.toggle('ai', current === 'ai');
  $<HTMLButtonElement>('#shoot').disabled = current !== 'human' || update.game.turnState !== 'aiming' || update.paused;
  pauseModal.hidden = !update.paused;
});

gameBus.addEventListener('game:over', (event) => {
  const detail = (event as CustomEvent<{ winner: PlayerId; message: string }>).detail;
  $('#game-over-title').textContent = detail.winner === 'human' ? '漂亮，你赢了！' : '电脑赢得本局';
  $('#game-over-message').textContent = detail.message;
  gameOverModal.hidden = false;
});

applySettingsUi();
registerSW({ immediate: true });

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 920,
  height: 500,
  backgroundColor: 'transparent',
  transparent: true,
  physics: { default: 'matter', matter: { gravity: { x: 0, y: 0 }, enableSleeping: false, positionIterations: 8, velocityIterations: 6 } },
  fps: { target: 60, forceSetTimeOut: false },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: []
});
game.scene.add('game', GameScene, true, { settings });
