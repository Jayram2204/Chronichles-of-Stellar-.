export class NeuralVoiceSynthesizer {
  private synth: SpeechSynthesis | null = null;
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      console.log('[NeuralVoiceSynthesizer] Cyberware Neural Voice Comm-Link online.');
    } else {
      console.warn('[NeuralVoiceSynthesizer] Browser Web Speech API not supported.');
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted && this.synth) {
      this.synth.cancel();
    }
    return this.isMuted;
  }

  public getMutedState(): boolean {
    return this.isMuted;
  }

  /**
   * Synthesizes AI dialogue text using NPC-specific cybernetic pitch & rate modulation
   */
  public speak(npcId: string, text: string): void {
    if (!this.synth || this.isMuted) return;

    // Stop current speech if any
    this.synth.cancel();

    // Sanitize string (remove markdown, technical brackets, JSON)
    const cleanText = text
      .replace(/[\{\}\[\]\_\*]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);

    // Get available voices
    const voices = this.synth.getVoices();

    // Pitch & rate presets for cyberpunk personas
    switch (npcId) {
      case 'merchant':
        utterance.pitch = 1.35;
        utterance.rate = 1.15;
        utterance.volume = 0.95;
        break;
      case 'guard':
        utterance.pitch = 0.55;
        utterance.rate = 0.85;
        utterance.volume = 1.0;
        break;
      case 'informant':
        utterance.pitch = 0.75;
        utterance.rate = 0.95;
        utterance.volume = 0.85;
        break;
      default:
        utterance.pitch = 1.0;
        utterance.rate = 1.0;
        utterance.volume = 0.9;
        break;
    }

    // Try finding robotic/English male or female voices if present
    if (voices.length > 0) {
      const preferredVoice =
        voices.find((v) => v.name.includes('Google') || v.name.includes('Daniel') || v.name.includes('Fred')) ||
        voices.find((v) => v.lang.startsWith('en')) ||
        voices[0];
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
    }

    try {
      this.synth.speak(utterance);
    } catch (e) {
      console.warn('[NeuralVoiceSynthesizer] Speech synthesis output error:', e);
    }
  }
}

export const neuralVoiceSynthesizer = new NeuralVoiceSynthesizer();
