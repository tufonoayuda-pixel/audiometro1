import React, { useRef, useEffect, useState, useCallback } from 'react';

interface AudiometerSettings {
  frequency: number; // Hz
  intensity: number; // dB HL
  laterality: 'left' | 'right' | 'binaural';
  stimulusType: 'pure' | 'warble' | 'pulsed';
  presentationMode: 'manual' | 'automatic';
  automaticDuration: number; // seconds
}

const FADE_TIME = 0.01; // 10 ms fade-in/out

// Convert dB HL to linear gain. This is a simplified conversion for simulation.
// 0 dB HL is often considered the threshold of normal hearing.
// We'll map -10 dB HL to a very low gain and 100 dB HL to a high gain.
// A common formula for gain from dB is 10^(dB/20).
// Let's assume 0 dB HL corresponds to a gain of 0.1 (arbitrary reference for simulation)
// and adjust relative to that.
const dbToGain = (db: number) => {
  // A more realistic mapping might involve a reference SPL, but for simulation,
  // we'll use a direct exponential scaling.
  // Let's scale -10dB to 0.01 and 100dB to 1.0 (or higher if needed)
  // This is a simplified approach.
  return Math.pow(10, (db - 50) / 20); // Adjusting the reference point for a reasonable range
};

export function useAudiometer() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const pannerNodeRef = useRef<StereoPannerNode | null>(null);
  const warbleLfoRef = useRef<OscillatorNode | null>(null);
  const pulsedLfoRef = useRef<OscillatorNode | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Initialize AudioContext on user interaction to bypass autoplay policies
    const initAudioContext = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current.resume().then(() => {
          setIsReady(true);
          console.log('AudioContext initialized and resumed.');
        });
      }
    };

    document.addEventListener('click', initAudioContext, { once: true });
    document.addEventListener('keydown', initAudioContext, { once: true });

    return () => {
      document.removeEventListener('click', initAudioContext);
      document.removeEventListener('keydown', initAudioContext);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  const stopTone = useCallback(() => {
    if (oscillatorRef.current) {
      const now = audioContextRef.current!.currentTime;
      gainNodeRef.current!.gain.cancelScheduledValues(now);
      gainNodeRef.current!.gain.linearRampToValueAtTime(0, now + FADE_TIME);
      oscillatorRef.current.stop(now + FADE_TIME);
      oscillatorRef.current.disconnect();
      oscillatorRef.current = null;
      gainNodeRef.current = null;
      pannerNodeRef.current = null;
      if (warbleLfoRef.current) {
        warbleLfoRef.current.stop();
        warbleLfoRef.current.disconnect();
        warbleLfoRef.current = null;
      }
      if (pulsedLfoRef.current) {
        pulsedLfoRef.current.stop();
        pulsedLfoRef.current.disconnect();
        pulsedLfoRef.current = null;
      }
      setIsPlaying(false);
    }
  }, []);

  const startTone = useCallback((settings: AudiometerSettings) => {
    if (!isReady || isPlaying) return;

    const { frequency, intensity, laterality, stimulusType, presentationMode, automaticDuration } = settings;
    const audioContext = audioContextRef.current;
    if (!audioContext) {
      console.error('AudioContext not initialized.');
      return;
    }

    // Ensure context is running
    if (audioContext.state === 'suspended') {
      audioContext.resume().then(() => console.log('AudioContext resumed.'));
    }

    // Stop any existing tone before starting a new one
    stopTone();

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const pannerNode = audioContext.createStereoPanner();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

    const targetGain = dbToGain(intensity);
    gainNode.gain.setValueAtTime(0, audioContext.currentTime); // Start at 0 gain
    gainNode.gain.linearRampToValueAtTime(targetGain, audioContext.currentTime + FADE_TIME);

    let panValue = 0; // Binaural
    if (laterality === 'left') {
      panValue = -1;
    } else if (laterality === 'right') {
      panValue = 1;
    }
    pannerNode.pan.setValueAtTime(panValue, audioContext.currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(pannerNode);
    pannerNode.connect(audioContext.destination);

    oscillator.start(audioContext.currentTime);

    oscillatorRef.current = oscillator;
    gainNodeRef.current = gainNode;
    pannerNodeRef.current = pannerNode;
    setIsPlaying(true);

    // Stimulus Type Logic
    if (stimulusType === 'warble') {
      const warbleLfo = audioContext.createOscillator();
      warbleLfo.type = 'sine';
      warbleLfo.frequency.setValueAtTime(5, audioContext.currentTime); // 5 Hz modulation
      const modulationDepth = frequency * 0.07; // ±7% of frequency
      const gainLfo = audioContext.createGain();
      gainLfo.gain.setValueAtTime(modulationDepth, audioContext.currentTime);

      warbleLfo.connect(gainLfo);
      gainLfo.connect(oscillator.frequency);
      warbleLfo.start(audioContext.currentTime);
      warbleLfoRef.current = warbleLfo;
    } else if (stimulusType === 'pulsed') {
      const pulsePeriod = 0.4; // 200ms ON / 200ms OFF
      const pulseLfo = audioContext.createOscillator();
      pulseLfo.type = 'square'; // Square wave for on/off
      pulseLfo.frequency.setValueAtTime(1 / pulsePeriod, audioContext.currentTime);

      const pulseGain = audioContext.createGain();
      pulseGain.gain.setValueAtTime(0.5, audioContext.currentTime); // Modulate between 0 and 1, so 0.5 amplitude
      
      // Connect LFO to gainNode's gain, but scale it to go from 0 to targetGain
      // A square wave from -1 to 1 needs to be mapped to 0 to 1 for gain.
      // (value + 1) / 2 will map -1 to 0 and 1 to 1.
      const gainModulator = audioContext.createGain();
      gainModulator.gain.setValueAtTime(targetGain / 2, audioContext.currentTime); // Amplitude of modulation
      pulseLfo.connect(gainModulator);

      const offsetGain = audioContext.createGain();
      offsetGain.gain.setValueAtTime(targetGain / 2, audioContext.currentTime); // Offset to ensure gain is always positive
      
      gainModulator.connect(gainNode.gain);
      offsetGain.connect(gainNode.gain);

      pulseLfo.start(audioContext.currentTime);
      pulsedLfoRef.current = pulseLfo;
    }

    // Automatic presentation mode
    if (presentationMode === 'automatic') {
      setTimeout(() => {
        stopTone();
      }, automaticDuration * 1000);
    }
  }, [isReady, isPlaying, stopTone]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !isPlaying) {
        // Prevent default spacebar action (e.g., scrolling)
        event.preventDefault();
        // This will be handled by the ToneGenerator component's button press
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space' && isPlaying) {
        // This will be handled by the ToneGenerator component's button release
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPlaying]); // Only re-run if isPlaying changes

  return { startTone, stopTone, isPlaying, isReady };
}