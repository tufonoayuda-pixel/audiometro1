import React, { useRef, useEffect, useState, useCallback } from 'react';

interface AudiometerSettings {
  frequency: number; // Hz
  intensity: number; // dB HL
  laterality: 'left' | 'right' | 'binaural';
  stimulusType: 'pure' | 'warble' | 'pulsed';
  presentationMode: 'manual' | 'automatic';
  automaticDuration: number; // seconds
}

export interface BackgroundNoiseSettings {
  type: 'none' | 'construction' | 'mall' | 'supermarket' | 'park';
  volume: number; // dB HL
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

const noiseSources = {
  construction: '/audio/construction.mp3',
  mall: '/audio/mall.mp3',
  supermarket: '/audio/supermarket.mp3',
  park: '/audio/park.mp3',
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

  // New state for background noise
  const [loadedNoiseBuffers, setLoadedNoiseBuffers] = useState<Map<string, AudioBuffer>>(new Map());
  const backgroundNoiseSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const backgroundNoiseGainRef = useRef<GainNode | null>(null);
  const [isBackgroundNoiseActive, setIsBackgroundNoiseActive] = useState(false); // NEW STATE

  // New state for microphone
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const microphoneSourceRef = useRef<MediaStreamSourceNode | null>(null);
  const microphoneGainRef = useRef<GainNode | null>(null);
  const [isMicrophoneActive, setIsMicrophoneActive] = useState(false);
  const [microphoneVolume, setMicrophoneVolume] = useState(50); // Default microphone volume in dB HL

  useEffect(() => {
    // Initialize AudioContext on user interaction to bypass autoplay policies
    const initAudioContext = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current.resume().then(() => {
          setIsReady(true);
          console.log('AudioContext initialized and resumed.');
        }).catch(e => console.error('Failed to resume AudioContext:', e));
      }
    };

    document.addEventListener('click', initAudioContext, { once: true });
    document.addEventListener('keydown', initAudioContext, { once: true });

    return () => {
      document.removeEventListener('click', initAudioContext);
      document.removeEventListener('keydown', initAudioContext);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        console.log('AudioContext closed on unmount.');
      }
    };
  }, []);

  // New: Function to load audio buffers
  const loadAudio = useCallback(async (url: string, key: string) => {
    console.log(`Attempting to load audio: ${url} with key: ${key}`);
    if (loadedNoiseBuffers.has(key)) {
      console.log(`Audio buffer for ${key} already loaded.`);
      return loadedNoiseBuffers.get(key)!;
    }
    if (!audioContextRef.current) {
      console.error('AudioContext not initialized, cannot load audio.');
      return null;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      setLoadedNoiseBuffers(prev => new Map(prev).set(key, audioBuffer));
      console.log(`Successfully loaded audio: ${url}`);
      return audioBuffer;
    } catch (error) {
      console.error(`Error loading audio ${url}:`, error);
      return null;
    }
  }, [loadedNoiseBuffers]);

  // New: Function to stop background noise
  const stopBackgroundNoise = useCallback(() => {
    console.log('Attempting to stop background noise.');
    if (backgroundNoiseSourceRef.current) {
      backgroundNoiseSourceRef.current.stop();
      backgroundNoiseSourceRef.current.disconnect();
      backgroundNoiseSourceRef.current = null;
      console.log('Background noise source stopped and disconnected.');
    }
    if (backgroundNoiseGainRef.current) {
      backgroundNoiseGainRef.current.disconnect();
      backgroundNoiseGainRef.current = null;
      console.log('Background noise gain disconnected.');
    }
    setIsBackgroundNoiseActive(false); // Update state
    console.log('Background noise stopped.');
  }, []);

  // New: Function to start background noise
  const startBackgroundNoise = useCallback(async (noiseType: BackgroundNoiseSettings['type'], volume: number) => {
    console.log(`Attempting to start background noise: ${noiseType} at volume: ${volume} dB HL`);
    if (noiseType === 'none' || !audioContextRef.current) {
      console.log('Noise type is none or AudioContext not initialized. Stopping noise.');
      stopBackgroundNoise();
      return;
    }

    // Stop any existing noise before starting a new one
    stopBackgroundNoise(); 

    const audioContext = audioContextRef.current!;
    if (audioContext.state === 'suspended') {
      console.log('AudioContext is suspended, attempting to resume for background noise.');
      await audioContext.resume().catch(e => console.error('Failed to resume AudioContext for background noise:', e));
    }

    const url = noiseSources[noiseType];
    const buffer = await loadAudio(url, noiseType);

    if (buffer) {
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.loop = true; // Loop the background noise

      const gainNode = audioContext.createGain();
      const calculatedGain = dbToGain(volume);
      gainNode.gain.setValueAtTime(calculatedGain, audioContext.currentTime);
      console.log(`Background noise gain set to: ${calculatedGain} (from ${volume} dB HL)`);

      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      source.start(0);

      backgroundNoiseSourceRef.current = source;
      backgroundNoiseGainRef.current = gainNode;
      setIsBackgroundNoiseActive(true); // Update state
      console.log(`Background noise (${noiseType}) started at ${volume} dB HL.`);
    } else {
      console.error(`Failed to get audio buffer for ${noiseType}. Cannot start background noise.`);
    }
  }, [loadAudio, stopBackgroundNoise]);

  // New: Function to stop microphone
  const stopMicrophone = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (microphoneSourceRef.current) {
      microphoneSourceRef.current.disconnect();
      microphoneSourceRef.current = null;
    }
    if (microphoneGainRef.current) {
      microphoneGainRef.current.disconnect();
      microphoneGainRef.current = null;
    }
    setIsMicrophoneActive(false);
    console.log('Microphone stopped.');
  }, []);

  // New: Function to start microphone
  const startMicrophone = useCallback(async (volume: number) => {
    if (!isReady || isMicrophoneActive || !audioContextRef.current) {
      console.warn('AudioContext not ready or microphone already active.');
      return;
    }

    const audioContext = audioContextRef.current;
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const source = audioContext.createMediaStreamSource(stream);
      const gainNode = audioContext.createGain();
      gainNode.gain.setValueAtTime(dbToGain(volume), audioContext.currentTime);

      source.connect(gainNode);
      gainNode.connect(audioContext.destination);

      microphoneSourceRef.current = source;
      microphoneGainRef.current = gainNode;
      setIsMicrophoneActive(true);
      console.log('Microphone started.');
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setIsMicrophoneActive(false);
      // Optionally show a toast error
    }
  }, [isReady, isMicrophoneActive, dbToGain]);

  // Update microphone gain if volume changes
  useEffect(() => {
    if (microphoneGainRef.current && audioContextRef.current) {
      microphoneGainRef.current.gain.setValueAtTime(dbToGain(microphoneVolume), audioContextRef.current.currentTime);
    }
  }, [microphoneVolume, dbToGain]);


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

  return {
    startTone,
    stopTone,
    isPlaying,
    isReady,
    startMicrophone,
    stopMicrophone,
    isMicrophoneActive,
    microphoneVolume,
    setMicrophoneVolume,
    isBackgroundNoiseActive, // NEW EXPORT
    startBackgroundNoise,   // NEW EXPORT
    stopBackgroundNoise,    // NEW EXPORT
  };
}