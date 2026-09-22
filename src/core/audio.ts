export class GameAudio {
  private context: AudioContext | null = null;

  play(kind: 'hit' | 'pocket' | 'win', enabled: boolean) {
    if (!enabled || typeof AudioContext === 'undefined') return;
    try {
      this.context ??= new AudioContext();
      if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      const now = this.context.currentTime;
      oscillator.type = kind === 'hit' ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(kind === 'hit' ? 145 : kind === 'pocket' ? 260 : 420, now);
      oscillator.frequency.exponentialRampToValueAtTime(kind === 'win' ? 760 : 80, now + 0.12);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      oscillator.connect(gain).connect(this.context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.15);
    } catch {
      // Audio is optional; a browser restriction must never block a shot.
    }
  }
}
