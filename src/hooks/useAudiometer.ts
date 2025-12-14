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
// Let's assume 50 dB HL corresponds to a gain of 1 (0 dB relative to this reference)
// and adjust relative to that.
const dbToGain = (db: number) => {
  return Math.pow(10, (db - 50) / 20);
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

  // Microphone states
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const microphoneSourceRef = useRef<MediaStreamSourceNode | null>(null);
  const microphoneGainRef = useRef<GainNode | null>(null);
  const [isMicrophoneActive, setIsMicrophoneActive] = useState(false);
  const [isMicrophoneMuted, setIsMicrophoneMuted] = useState(false); // New state for mute
  const [microphoneVolume, setMicrophoneVolume] = useState(50); // Default microphone volume in dB HL
  const [microphoneDevices, setMicrophoneDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState<string | null>(null);
  const [microphonePermissionGranted, setMicrophonePermissionGranted] = useState(false);

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

  // Function to stop microphone (defined early to avoid TDZ issues)
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
    setIsMicrophoneMuted(false); // Reset mute state when stopping
    console.log('Microphone stopped.');
  }, []);

  // Function to get available microphone devices
  const getMicrophoneDevices = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      console.warn('enumerateDevices() not supported.');
      return;
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputDevices = devices.filter(device => device.kind === 'audioinput');
      setMicrophoneDevices(audioInputDevices);
      if (audioInputDevices.length > 0 && !selectedMicrophoneId) {
        setSelectedMicrophoneId(audioInputDevices[0].deviceId); // Select the first one by default
      }
      console.log('Microphone devices enumerated:', audioInputDevices);
    } catch (error) {
      console.error('Error enumerating devices:', error);
    }
  }, [selectedMicrophoneId]);

  // Function to request microphone permission
  const requestMicrophonePermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop tracks immediately after getting permission
      setMicrophonePermissionGranted(true);
      console.log('Microphone permission granted.');
      getMicrophoneDevices(); // Enumerate devices after permission is granted
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
      setMicrophonePermissionGranted(false);
      // Optionally show a toast error
    }
  }, [getMicrophoneDevices]);

  // Check initial permission status and enumerate devices if already granted
  useEffect(() => {
    // Capture stopMicrophone for this effect's closure
    const currentStopMicrophone = stopMicrophone;

    if (navigator.mediaDevices && navigator.mediaDevices.permissions) {
      navigator.mediaDevices.permissions.query({ name: 'microphone' as PermissionName }).then(permissionStatus => {
        if (permissionStatus.state === 'granted') {
          setMicrophonePermissionGranted(true);
          getMicrophoneDevices();
        } else if (permissionStatus.state === 'prompt') {
          setMicrophonePermissionGranted(false); // Will prompt on first startMicrophone call
        } else { // denied
          setMicrophonePermissionGranted(false);
        }
        permissionStatus.onchange = () => {
          if (permissionStatus.state === 'granted') {
            setMicrophonePermissionGranted(true);
            getMicrophoneDevices();
          } else {
            setMicrophonePermissionGranted(false);
            currentStopMicrophone(); // Use the captured reference
          }
        };
      });
    } else {
      // Fallback for browsers that don't support Permissions API
      console.warn('Permissions API not supported. Microphone permission will be requested on first use.');
    }
  }, [getMicrophoneDevices, stopMicrophone]);

  // Function to start microphone
  const startMicrophone = useCallback(async (volume: number) => {
    if (!isReady || isMicrophoneActive || !audioContextRef.current || !microphonePermissionGranted || !selectedMicrophoneId) {
      console.warn('Cannot start microphone: AudioContext not ready, microphone already active, permission not granted, or no microphone selected.');
      return;
    }

    const audioContext = audioContextRef.current;
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedMicrophoneId ? { exact: selectedMicrophoneId } : undefined,
        },
      });
      mediaStreamRef.current = stream;

      const source = audioContext.createMediaStreamSource(stream);
      const gainNode = audioContext.createGain();
      gainNode.gain.setValueAtTime(dbToGain(volume), audioContext.currentTime); // Set initial gain based on volume

      source.connect(gainNode);
      gainNode.connect(audioContext.destination);

      microphoneSourceRef.current = source;
      microphoneGainRef.current = gainNode;
      setIsMicrophoneActive(true);
      setIsMicrophoneMuted(false); // Ensure not muted when starting
      console.log(`Microphone started using device: ${selectedMicroophoneId}.`);
    } catch (error) {
      console.error('Error accessing microphone:', error, 'Ensure permission is granted and a device is selected.');
      setIsMicrophoneActive(false);
      setIsMicrophoneMuted(false);
      // Optionally show a toast error
    }
  }, [isReady, isMicrophoneActive, microphonePermissionGranted, selectedMicrophoneId, dbToGain]);

  // New: Function to toggle microphone mute state
  const toggleMicrophoneMute = useCallback(() => {
    if (microphoneGainRef.current && audioContextRef.current) {
      const now = audioContextRef.current.currentTime;
      if (isMicrophoneMuted) {
        // Unmute: set gain back to current microphone volume
        microphoneGainRef.current.gain.setValueAtTime(dbToGain(microphoneVolume), now);
        setIsMicrophoneMuted(false);
        console.log('Microphone unmuted.');
      } else {
        // Mute: set gain to 0
        microphoneGainRef.current.gain.setValueAtTime(0, now);
        setIsMicrophoneMuted(true);
        console.log('Microphone muted.');
      }
    }
  }, [isMicrophoneMuted, microphoneVolume, dbToGain]);

  // Update microphone gain if volume changes, but only if not muted
  useEffect(() => {
    if (microphoneGainRef.current && audioContextRef.current && !isMicrophoneMuted) {
      microphoneGainRef.current.gain.setValueAtTime(dbToGain(microphoneVolume), audioContextRef.current.currentTime);
    }
  }, [microphoneVolume, isMicrophoneMuted, dbToGain]);


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
    document.removeEventListener('keyup', handleKeyUp); // Remove previous listener to avoid duplicates
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
    isMicrophoneMuted, // Export new state
    toggleMicrophoneMute, // Export new function
    microphoneVolume,
    setMicrophoneVolume,
    microphoneDevices,
    selectedMicrophoneId,
    setSelectedMicrophoneId,
    microphonePermissionGranted,
    requestMicrophonePermission,
  };
}