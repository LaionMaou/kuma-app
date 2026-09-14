import { EqualizerSettings } from '../types';
import { RADIO_CONFIG } from '../config/radioConfig';

class KawaiiAudioEngine {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private volumeNode: GainNode | null = null;
  private bassBoostNode: BiquadFilterNode | null = null;
  private filterNodes: BiquadFilterNode[] = [];
  private sequenceTimer: number | null = null;
  private currentVolume: number = 0.8;
  private isMuted: boolean = false;
  private subscribers: Array<(playing: boolean) => void> = [];
  private audioElement: HTMLAudioElement | null = null;
  private mediaSourceNode: MediaElementAudioSourceNode | null = null;
  private currentStreamUrl: string = RADIO_CONFIG.DEFAULT_STREAM_URL;
  private isStreamingRealAudio: boolean = false;

  public setStreamUrl(url: string) {
    if (url === this.currentStreamUrl) return;
    this.currentStreamUrl = url;
    if (this.audioElement) {
      const wasPlaying = this.isPlaying;
      this.audioElement.src = url;
      this.audioElement.load();
      if (wasPlaying) {
        this.play();
      }
    }
  }

  public getStreamUrl(): string {
    return this.currentStreamUrl;
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master Volume
      this.volumeNode = this.ctx.createGain();
      this.volumeNode.gain.value = this.isMuted ? 0 : this.currentVolume;

      // Bass Boost filter (low shelf at 100Hz)
      this.bassBoostNode = this.ctx.createBiquadFilter();
      this.bassBoostNode.type = 'lowshelf';
      this.bassBoostNode.frequency.value = 100;
      this.bassBoostNode.gain.value = 6;

      // 5-band Equalizer filters
      // 60Hz, 230Hz, 910Hz, 4000Hz, 14000Hz
      const frequencies = [60, 230, 910, 4000, 14000];
      this.filterNodes = frequencies.map((freq, index) => {
        const filter = this.ctx!.createBiquadFilter();
        if (index === 0) {
          filter.type = 'lowshelf';
        } else if (index === frequencies.length - 1) {
          filter.type = 'highshelf';
        } else {
          filter.type = 'peaking';
          filter.Q.value = 1.0;
        }
        filter.frequency.value = freq;
        filter.gain.value = 0;
        return filter;
      });

      // Chain: Filters -> BassBoost -> Volume -> Destination
      let lastNode: AudioNode = this.filterNodes[0];
      for (let i = 1; i < this.filterNodes.length; i++) {
        lastNode.connect(this.filterNodes[i]);
        lastNode = this.filterNodes[i];
      }
      lastNode.connect(this.bassBoostNode);
      this.bassBoostNode.connect(this.volumeNode);
      this.volumeNode.connect(this.ctx.destination);

      // Create and route HTMLAudioElement for live mp3 stream
      try {
        this.audioElement = new Audio();
        this.audioElement.crossOrigin = 'anonymous';
        this.audioElement.preload = 'none';
        this.audioElement.src = this.currentStreamUrl;

        this.mediaSourceNode = this.ctx.createMediaElementSource(this.audioElement);
        this.mediaSourceNode.connect(this.filterNodes[0]);

        this.audioElement.addEventListener('playing', () => {
          this.isStreamingRealAudio = true;
          // Stop synth if real stream connects
          if (this.sequenceTimer) {
            clearInterval(this.sequenceTimer);
            this.sequenceTimer = null;
          }
        });

        this.audioElement.addEventListener('error', () => {
          // If the stream URL is placeholder or offline, fallback smoothly to synthesizer
          this.isStreamingRealAudio = false;
          if (this.isPlaying && !this.sequenceTimer) {
            this.startMelodicSynthesizer();
          }
        });
      } catch (e) {
        console.warn('MediaElementSource not available or restricted, using fallback engine', e);
      }
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public subscribe(cb: (playing: boolean) => void) {
    this.subscribers.push(cb);
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== cb);
    };
  }

  private notify() {
    this.subscribers.forEach((cb) => cb(this.isPlaying));
  }

  public togglePlay(): boolean {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
    return this.isPlaying;
  }

  public play() {
    this.initContext();
    this.isPlaying = true;
    this.notify();

    if (this.audioElement && this.currentStreamUrl) {
      if (this.audioElement.src !== this.currentStreamUrl) {
        this.audioElement.src = this.currentStreamUrl;
      }
      const playPromise = this.audioElement.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.isStreamingRealAudio = true;
          })
          .catch(() => {
            // Fallback to melodic synth if stream is unreachable or autoplay blocked
            this.isStreamingRealAudio = false;
            this.startMelodicSynthesizer();
          });
      }
    } else {
      this.startMelodicSynthesizer();
    }
  }

  public pause() {
    this.isPlaying = false;
    if (this.audioElement) {
      this.audioElement.pause();
    }
    if (this.sequenceTimer) {
      clearInterval(this.sequenceTimer);
      this.sequenceTimer = null;
    }
    this.notify();
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public setVolume(val: number) {
    this.currentVolume = Math.max(0, Math.min(1, val));
    if (this.volumeNode && !this.isMuted) {
      this.volumeNode.gain.setValueAtTime(this.currentVolume, this.ctx?.currentTime || 0);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.volumeNode) {
      this.volumeNode.gain.setValueAtTime(
        this.isMuted ? 0 : this.currentVolume,
        this.ctx?.currentTime || 0
      );
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public updateEqualizer(eq: EqualizerSettings) {
    if (!this.filterNodes.length) return;
    const gains = [eq.band60, eq.band230, eq.band910, eq.band4k, eq.band14k];
    gains.forEach((gainVal, idx) => {
      if (this.filterNodes[idx] && this.ctx) {
        this.filterNodes[idx].gain.setValueAtTime(gainVal, this.ctx.currentTime);
      }
    });
  }

  public setBassBoost(dB: number) {
    if (this.bassBoostNode && this.ctx) {
      this.bassBoostNode.gain.setValueAtTime(dB, this.ctx.currentTime);
    }
  }

  // Generates a soft, charming J-Pop anime arpeggio progression (pentatonic / lush dream chord tones)
  private startMelodicSynthesizer() {
    if (this.sequenceTimer) clearInterval(this.sequenceTimer);

    // Chords: Dmaj9 -> F#m7 -> Gmaj7 -> A7add11 (Classic Anime nostalgic progression)
    const chordProgressions = [
      [293.66, 369.99, 440.0, 554.37, 659.25], // D, F#, A, C#, E
      [369.99, 440.0, 554.37, 659.25, 739.99], // F#, A, C#, E, F#
      [392.0, 493.88, 587.33, 739.99, 880.0],  // G, B, D, F#, A
      [440.0, 554.37, 659.25, 783.99, 880.0],  // A, C#, E, G, A
    ];

    let chordIdx = 0;
    let noteStep = 0;

    const tick = () => {
      if (!this.isPlaying || !this.ctx || !this.filterNodes[0]) return;

      const chord = chordProgressions[chordIdx];
      const freq = chord[noteStep % chord.length];

      this.playPluckNote(freq, noteStep % 4 === 0);

      noteStep++;
      if (noteStep >= 8) {
        noteStep = 0;
        chordIdx = (chordIdx + 1) % chordProgressions.length;
      }
    };

    tick();
    this.sequenceTimer = window.setInterval(tick, 380);
  }

  private playPluckNote(freq: number, isBass: boolean = false) {
    if (!this.ctx || !this.filterNodes[0]) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const noteGain = this.ctx.createGain();

    osc.type = isBass ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(isBass ? freq / 2 : freq, now);

    // Cute soft envelope
    noteGain.gain.setValueAtTime(0.001, now);
    noteGain.gain.exponentialRampToValueAtTime(isBass ? 0.25 : 0.12, now + 0.04);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, now + (isBass ? 0.9 : 0.6));

    osc.connect(noteGain);
    noteGain.connect(this.filterNodes[0]);

    osc.start(now);
    osc.stop(now + 1.0);
  }
}

export const audioEngine = new KawaiiAudioEngine();
