"use client";

import React, { useState } from 'react';
import { useAudiometer } from "@/hooks/useAudiometer";
import { AudiometerControlPanel } from "@/components/audiometer/AudiometerControlPanel";
import { PatientForm } from "@/components/audiogram/PatientForm";
import { ThresholdInputTable } from "@/components/audiogram/ThresholdInputTable";
import { AudiogramChart } from "@/components/audiogram/AudiogramChart";
import { PrintReport } from "@/components/audiogram/PrintReport";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Define types for patient data and audiogram thresholds
export interface PatientData {
  fullName: string;
  age: number | '';
  evaluationDate: Date;
  hearingLossType: 'Conductiva' | 'Neurosensorial' | 'Mixta' | 'Normal' | 'No determinada' | '';
  affectedEar: {
    right: boolean;
    left: boolean;
    bilateral: boolean;
  };
  hasHearingAids: 'yes' | 'no' | '';
  examinerName: string;
}

export type Thresholds = {
  [frequency: number]: {
    right: number | null;
    left: number | null;
  };
};

const initialThresholds: Thresholds = {
  125: { right: null, left: null },
  250: { right: null, left: null },
  500: { right: null, left: null },
  750: { right: null, left: null },
  1000: { right: null, left: null },
  1500: { right: null, left: null },
  2000: { right: null, left: null },
  3000: { right: null, left: null },
  4000: { right: null, left: null },
  6000: { right: null, left: null },
  8000: { right: null, left: null },
};

const AudiometerPage = () => {
  const { startTone, stopTone, isPlaying, isReady } = useAudiometer();
  const [patientData, setPatientData] = useState<PatientData>({
    fullName: '',
    age: '',
    evaluationDate: new Date(),
    hearingLossType: '',
    affectedEar: { right: false, left: false, bilateral: false },
    hasHearingAids: '',
    examinerName: '',
  });
  const [thresholds, setThresholds] = useState<Thresholds>(initialThresholds);

  const handleThresholdChange = (frequency: number, ear: 'right' | 'left', value: number | null) => {
    setThresholds((prev) => ({
      ...prev,
      [frequency]: {
        ...prev[frequency],
        [ear]: value,
      },
    }));
  };

  const handleSaveResult = (frequency: number, intensity: number, laterality: 'left' | 'right' | 'binaural') => {
    if (!fixedFrequencies.includes(frequency)) {
      toast.error("Solo se pueden guardar umbrales para frecuencias fijas.");
      return;
    }

    if (laterality === 'right' || laterality === 'binaural') {
      handleThresholdChange(frequency, 'right', intensity);
    }
    if (laterality === 'left' || laterality === 'binaural') {
      handleThresholdChange(frequency, 'left', intensity);
    }
    toast.success(`Umbral de ${intensity} dB HL guardado para ${frequency} Hz en oído ${laterality === 'right' ? 'derecho' : laterality === 'left' ? 'izquierdo' : 'binaural'}.`);
  };

  const handlePrint = () => {
    // Check if patient data is complete enough for printing
    if (!patientData.fullName || !patientData.age || !patientData.examinerName) {
      toast.error("Por favor, completa el nombre del paciente, la edad y el nombre del examinador antes de imprimir.");
      return;
    }
    window.print();
  };

  const fixedFrequencies = Object.keys(initialThresholds).map(Number); // Get fixed frequencies from initialThresholds

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8 flex flex-col items-center">
      <h1 className="text-4xl font-extrabold text-gray-900 dark:text-gray-50 mb-8 text-center">
        Audiómetro Casero
      </h1>

      <div className="w-full max-w-6xl">
        <Tabs defaultValue="audiometer" className="w-full">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
            <TabsTrigger value="audiometer">Simulador</TabsTrigger>
            <TabsTrigger value="patient-data">Datos del Paciente</TabsTrigger>
            <TabsTrigger value="audiogram">Audiograma</TabsTrigger>
          </TabsList>

          <TabsContent value="audiometer" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Controles del Audiómetro</CardTitle>
              </CardHeader>
              <CardContent>
                <AudiometerControlPanel
                  onStartTone={startTone}
                  onStopTone={stopTone}
                  isPlaying={isPlaying}
                  isReady={isReady}
                  onSaveThreshold={handleSaveResult}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="patient-data" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Antecedentes del Paciente</CardTitle>
              </CardHeader>
              <CardContent>
                <PatientForm patientData={patientData} setPatientData={setPatientData} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audiogram" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Registro de Umbrales y Audiograma</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <ThresholdInputTable thresholds={thresholds} onThresholdChange={handleThresholdChange} />
                <AudiogramChart patientData={patientData} thresholds={thresholds} onThresholdChange={handleThresholdChange} />
                <Button onClick={handlePrint} className="w-full mt-4">
                  Generar e Imprimir Informe
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Print-only view */}
      <div className="hidden print:block w-full max-w-4xl mx-auto p-8 bg-white shadow-lg mt-8">
        <PrintReport patientData={patientData} thresholds={thresholds} />
      </div>

      <MadeWithDyad />
      <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
        Creado por Flgo. Cristobal San Martin
      </div>
    </div>
  );
};

export default AudiometerPage;