
class SoundService {
  private ctx: AudioContext | null = null;
  private bgmGain: GainNode | null = null;
  private bgmTimeout: number | null = null;
  private isBgmPlaying: boolean = false;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playPop() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playShot() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playWin() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      gain.gain.setValueAtTime(0.1, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.3);
    });
  }

  playLose() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [392.00, 349.23, 329.63, 261.63]; // G4, F4, E4, C4
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + i * 0.15);
      gain.gain.setValueAtTime(0.1, now + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.4);
    });
  }

  playStretch() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  startBGM() {
    this.init();
    if (!this.ctx || this.isBgmPlaying) return;
    this.isBgmPlaying = true;
    
    if (!this.bgmGain) {
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.connect(this.ctx.destination);
    }
    
    // Increased overall BGM gain for more presence
    this.bgmGain.gain.setTargetAtTime(0.18, this.ctx.currentTime, 0.5);
    this.scheduleBgmNotes();
  }

  private scheduleBgmNotes() {
    if (!this.ctx || !this.isBgmPlaying) return;
    
    const now = this.ctx.currentTime;
    // More fun arpeggiated melody
    const melody = [
      261.63, 329.63, 392.00, 523.25, // C4, E4, G4, C5
      440.00, 349.23, 392.00, 329.63  // A4, F4, G4, E4
    ]; 
    const duration = 0.45; // Faster tempo
    
    melody.forEach((freq, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const noteGain = this.ctx.createGain();
      
      // Use triangle for a softer but more distinct "retro game" feel
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * duration);
      
      noteGain.gain.setValueAtTime(0, now + i * duration);
      noteGain.gain.linearRampToValueAtTime(0.08, now + i * duration + 0.05); // Faster attack
      noteGain.gain.linearRampToValueAtTime(0, now + i * duration + duration - 0.05); // Clear decay
      
      osc.connect(noteGain);
      noteGain.connect(this.bgmGain!);
      
      osc.start(now + i * duration);
      osc.stop(now + i * duration + duration);
    });

    this.bgmTimeout = window.setTimeout(() => this.scheduleBgmNotes(), melody.length * duration * 1000);
  }

  stopBGM() {
    this.isBgmPlaying = false;
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
    }
    if (this.bgmTimeout) {
      clearTimeout(this.bgmTimeout);
      this.bgmTimeout = null;
    }
  }
}

export const soundService = new SoundService();
