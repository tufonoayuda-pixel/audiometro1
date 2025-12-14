"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudiometerControlPanelProps {
  onStartTone: (settings: any) => void;
  onStopTone: () => void;
  isPlaying: boolean;
  isReady: boolean;
  onSaveThreshold: (frequency: number, intensity: number, laterality: 'left' | 'right' | 'binaural') => void;
}

const fixedFrequencies = [125, 250, 500, 750, 1000, 1500, 2000, 3000, 4000, 6000, 8000];

export const AudiometerControlPanel: React.FC<AudiometerControlPanelProps> = ({
  onStartTone,
  onStopTone,
  isPlaying,
  isReady,
  onSaveThreshold,
}) => {
  const [frequency, setFrequency] = useState<number>(1000);
  const [customFrequency, setCustomFrequency] = useState<string>('');
  const [intensity, setIntensity] = useState<number>(50); // dB HL
  const [laterality, setLaterality] = useState<'left' | 'right' | 'binaural'>('binaural');
  const [stimulusType, setStimulusType] = useState<'pure' | 'warble' | 'pulsed'>('pure');
  const [presentationMode, setPresentationMode] = useState<'manual' | 'automatic'>('manual');
  const [automaticDuration, setAutomaticDuration] = useState<number>(2); // seconds
  const toneButtonRef = useRef<HTMLButtonElement>(null);

  const currentFrequency = customFrequency ? parseFloat(customFrequency) : frequency;

  const handleFrequencyChange = (value: string) => {
    if (value === 'custom') {
      setFrequency(0); // Indicate custom frequency is active
      setCustomFrequency(''); // Clear custom input initially
    } else {
      const parsedValue = parseInt(value);
      if (fixedFrequencies.includes(parsedValue)) {
        setFrequency(parsedValue);
        setCustomFrequency('');
      }
    }
  };

  const handleCustomFrequencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || (/^\d+$/.test(value) && parseInt(value) >= 100 && parseInt(value) <= 10000)) {
      setCustomFrequency(value);
      setFrequency(0); // Indicate custom frequency is active
    }
  };

  const adjustFrequency = (delta: number) => {
    let newFreq = currentFrequency;

    if (frequency !== 0 && fixedFrequencies.includes(frequency)) {
      // Currently a fixed frequency is selected
      const currentIndex = fixedFrequencies.indexOf(frequency);
      let newIndex = currentIndex + delta;

      if (newIndex >= 0 && newIndex < fixedFrequencies.length) {
        newFreq = fixedFrequencies[newIndex];
        setFrequency(newFreq);
        setCustomFrequency('');
      } else if (newIndex < 0) {
        // Going below the lowest fixed frequency, switch to custom
        newFreq = Math.max(100, fixedFrequencies[0] + delta * 50); // Adjust by 50Hz from lowest fixed
        setFrequency(0);
        setCustomFrequency(String(newFreq));
      } else {
        // Going above the highest fixed frequency, switch to custom
        newFreq = Math.min(10000, fixedFrequencies[fixedFrequencies.length - 1] + delta * 50); // Adjust by 50Hz from highest fixed
        setFrequency(0);
        setCustomFrequency(String(newFreq));
      }
    } else {
      // Currently a custom frequency is selected or input is empty
      newFreq = (customFrequency === '' ? 1000 : parseFloat(customFrequency)) + delta * 50;
      newFreq = Math.max(100, Math.min(10000, newFreq));
      setFrequency(0);
      setCustomFrequency(String(newFreq));
    }
  };

  const adjustIntensity = (delta: number) => {
    setIntensity((prevIntensity) => {
      const newIntensity = prevIntensity + delta;
      return Math.max(-10, Math.min(100, newIntensity));
    });
  };

  const handleIntensityChange = (value: number[]) => {
    setIntensity(value[0]);
  };

  const handleIntensityInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= -10 && value <= 100) {
      setIntensity(value);
    }
  };

  const handleAutomaticDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 1 && value <= 20) { // Updated max to 20
      setAutomaticDuration(value);
    }
  };

  const settings = {
    frequency: currentFrequency,
    intensity,
    laterality,
    stimulusType,
    presentationMode,
    automaticDuration,
  };

  // Keyboard controls for tone activation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.code === 'Space' || event.code === 'Escape') && !isPlaying && isReady && presentationMode === 'manual') {
        event.preventDefault();
        onStartTone(settings);
      }
      // Laterality shortcuts
      if (event.key === 'd' || event.key === 'D') setLaterality('right');
      if (event.key === 'i' || event.key === 'I') setLaterality('left');
      if (event.key === 'b' || event.key === 'B') setLaterality('binaural');
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if ((event.code === 'Space' || event.code === 'Escape') && isPlaying && presentationMode === 'manual') {
        event.preventDefault();
        onStopTone();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPlaying, isReady, onStartTone, onStopTone, settings, presentationMode]);

  const isFrequencyInvalid = customFrequency !== '' && (parseFloat(customFrequency) < 100 || parseFloat(customFrequency) > 10000);

  return (
    <div className="p-6 border rounded-lg shadow-md bg-card text-card-foreground w-full max-w-md mx-auto">
      <h2 className="text-2xl font-semibold mb-6 text-center">Simulador de Audiómetro</h2>

      {!isReady && (
        <Alert className="mb-4 bg-yellow-100 border-yellow-400 text-yellow-800 dark:bg-yellow-900 dark:border-yellow-600 dark:text-yellow-200">
          <Terminal className="h-4 w-4" />
          <AlertTitle>¡Atención!</AlertTitle>
          <AlertDescription>
            Haz clic en cualquier parte de la página para activar el audio.
          </AlertDescription>
        </Alert>
      )}

      {intensity > 80 && (
        <Alert variant="destructive" className="mb-4">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Advertencia de Intensidad Alta</AlertTitle>
          <AlertDescription>
            La intensidad seleccionada ({intensity} dB HL) es superior a 80 dB HL. ¡Ten precaución!
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6">
        {/* Frecuencia */}
        <div>
          <Label htmlFor="frequency-select" className="mb-2 block">Frecuencia (Hz)</Label>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => adjustFrequency(-1)}
              disabled={currentFrequency <= 100 || isFrequencyInvalid}
            >
              -
            </Button>
            <Select onValueChange={handleFrequencyChange} value={frequency === 0 && customFrequency === '' ? '' : (fixedFrequencies.includes(frequency) ? String(frequency) : 'custom')}>
              <SelectTrigger id="frequency-select" className="w-full">
                <SelectValue placeholder="Seleccionar o ingresar" />
              </SelectTrigger>
              <SelectContent>
                {fixedFrequencies.map((freq) => (
                  <SelectItem key={freq} value={String(freq)}>
                    {freq} Hz
                  </SelectItem>
                ))}
                <SelectItem value="custom">Frecuencia Personalizada</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => adjustFrequency(1)}
              disabled={currentFrequency >= 10000 || isFrequencyInvalid}
            >
              +
            </Button>
          </div>
          {(frequency === 0 || !fixedFrequencies.includes(frequency)) && (
            <Input
              type="number"
              placeholder="100 - 10000 Hz"
              value={customFrequency}
              onChange={handleCustomFrequencyChange}
              className="mt-2"
              min={100}
              max={10000}
            />
          )}
          {isFrequencyInvalid && (
            <p className="text-red-500 text-sm mt-1">La frecuencia personalizada debe estar entre 100 y 10000 Hz.</p>
          )}
        </div>

        {/* Intensidad */}
        <div>
          <Label htmlFor="intensity-slider" className="mb-2 block">Intensidad (dB HL)</Label>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => adjustIntensity(-5)}
              disabled={intensity <= -10}
            >
              -
            </Button>
            <Slider
              id="intensity-slider"
              min={-10}
              max={100}
              step={1}
              value={[intensity]}
              onValueChange={handleIntensityChange}
              className="flex-grow"
            />
            <Input
              type="number"
              value={intensity}
              onChange={handleIntensityInputChange}
              className="w-20 text-center"
              min={-10}
              max={100}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => adjustIntensity(5)}
              disabled={intensity >= 100}
            >
              +
            </Button>
          </div>
        </div>

        {/* Tipo de Estímulo */}
        <div>
          <Label className="mb-2 block">Tipo de Estímulo</Label>
          <RadioGroup onValueChange={(value: 'pure' | 'warble' | 'pulsed') => setStimulusType(value)} value={stimulusType} className="flex justify-around">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pure" id="pure" />
              <Label htmlFor="pure">Tono Puro</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="warble" id="warble" />
              <Label htmlFor="warble">Tono Warble</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pulsed" id="pulsed" />
              <Label htmlFor="pulsed">Tono Pulsado</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Lateralidad */}
        <div>
          <Label className="mb-2 block">Lateralidad (D/I/B)</Label>
          <RadioGroup onValueChange={(value: 'left' | 'right' | 'binaural') => setLaterality(value)} value={laterality} className="flex justify-around">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="left" id="left" />
              <Label htmlFor="left">Izquierdo</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="right" id="right" />
              <Label htmlFor="right">Derecho</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="binaural" id="binaural" />
              <Label htmlFor="binaural">Binaural</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Modo de Presentación */}
        <div>
          <Label className="mb-2 block">Modo de Presentación</Label>
          <RadioGroup onValueChange={(value: 'manual' | 'automatic') => setPresentationMode(value)} value={presentationMode} className="flex justify-around">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="manual" id="manual" />
              <Label htmlFor="manual">Manual</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="automatic" id="automatic" />
              <Label htmlFor="automatic">Automático</Label>
            </div>
          </RadioGroup>
          {presentationMode === 'automatic' && (
            <div className="mt-2">
              <Label htmlFor="automatic-duration" className="block mb-1">Duración Automática (s)</Label>
              <Input
                id="automatic-duration"
                type="number"
                value={automaticDuration}
                onChange={handleAutomaticDurationChange}
                min={1}
                max={20} // Updated max to 20
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* Botones de Tono y Guardar */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            ref={toneButtonRef}
            className={cn(
              "w-full py-4 text-lg font-bold",
              isPlaying ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700",
              !isReady && "opacity-50 cursor-not-allowed"
            )}
            disabled={!isReady || isFrequencyInvalid}
            onMouseDown={() => presentationMode === 'manual' && onStartTone(settings)}
            onMouseUp={() => presentationMode === 'manual' && onStopTone()}
            onClick={() => presentationMode === 'automatic' && (isPlaying ? onStopTone() : onStartTone(settings))}
            onTouchStart={() => presentationMode === 'manual' && onStartTone(settings)}
            onTouchEnd={() => presentationMode === 'manual' && onStopTone()}
          >
            {isPlaying ? "Detener Tono" : "Iniciar Tono"}
          </Button>
          <Button
            className="w-full py-4 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => onSaveThreshold(currentFrequency, intensity, laterality)}
            disabled={!isReady || isFrequencyInvalid || currentFrequency === 0}
          >
            Guardar Resultado
          </Button>
        </div>
      </div>
    </div>
  );
};