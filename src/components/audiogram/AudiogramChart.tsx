"use client";

import React, { useRef, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts';
import { PatientData, Thresholds } from "@/pages/AudiometerPage"; // Import types
import { Label } from "@/components/ui/label";

interface AudiogramChartProps {
  patientData: PatientData;
  thresholds: Thresholds;
  onThresholdChange: (frequency: number, ear: 'right' | 'left', value: number | null) => void;
}

const frequencies = [125, 250, 500, 750, 1000, 1500, 2000, 3000, 4000, 6000, 8000];
const yAxisTicks = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110];

// Data structure for Recharts
const chartData = frequencies.map(freq => ({
  name: freq,
  frequency: freq,
}));

// Custom Dot for Recharts to display symbols
const CustomDot = (props: any) => {
  const { cx, cy, stroke, payload, dataKey } = props;
  const ear = dataKey === 'right' ? 'OD' : 'OI';
  const symbol = ear === 'OD' ? 'circle' : 'cross';
  const color = ear === 'OD' ? 'red' : 'blue';

  if (payload[dataKey] === null) return null; // Don't draw if threshold is null

  return (
    <g>
      {symbol === 'circle' && (
        <circle cx={cx} cy={cy} r={4} stroke={color} strokeWidth={2} fill="white" />
      )}
      {symbol === 'cross' && (
        <>
          <line x1={cx - 4} y1={cy - 4} x2={cx + 4} y2={cy + 4} stroke={color} strokeWidth={2} />
          <line x1={cx + 4} y1={cy - 4} x2={cx - 4} y2={cy + 4} stroke={color} strokeWidth={2} />
        </>
      )}
    </g>
  );
};

export const AudiogramChart: React.FC<AudiogramChartProps> = ({ patientData, thresholds, onThresholdChange }) => {
  const dataWithThresholds = chartData.map(item => ({
    ...item,
    right: thresholds[item.frequency]?.right,
    left: thresholds[item.frequency]?.left,
  }));

  // Function to determine the x-coordinate for a given frequency on a log scale
  const getLogX = (freq: number) => {
    // This is a simplified log scale mapping for visual representation
    // Recharts XAxis type="number" with domain handles this somewhat,
    // but for custom shading, we need to map frequencies to chart coordinates.
    // For simplicity, we'll use the index of the frequency in the array.
    return frequencies.indexOf(freq);
  };

  return (
    <div className="w-full h-[500px] relative">
      <Label className="text-lg font-semibold mb-4 block text-center">Audiograma Funcional</Label>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={dataWithThresholds}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            type="category"
            allowDuplicatedCategory={false}
            tickFormatter={(value) => `${value} Hz`}
            label={{ value: 'Frecuencia (Hz)', position: 'bottom', offset: 0 }}
            scale="point"
            padding={{ left: 20, right: 20 }}
          />
          <YAxis
            domain={[-10, 110]}
            reversed={true} // dB HL increases downwards
            ticks={yAxisTicks}
            label={{ value: 'Intensidad (dB HL)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip />

          {/* Shaded zones for hearing loss classification */}
          {/* Normal: -10 to 25 dB HL */}
          <ReferenceArea y1={-10} y2={25} fill="#e0ffe0" fillOpacity={0.3} label={{ value: 'Normal', position: 'insideTopLeft', fill: '#333' }} />
          {/* Leve: 26-40 dB HL */}
          <ReferenceArea y1={26} y2={40} fill="#fffacd" fillOpacity={0.3} label={{ value: 'Leve', position: 'insideTopLeft', fill: '#333' }} />
          {/* Moderada: 41-55 dB HL */}
          <ReferenceArea y1={41} y2={55} fill="#ffe0b2" fillOpacity={0.3} label={{ value: 'Moderada', position: 'insideTopLeft', fill: '#333' }} />
          {/* Moderada a Severa: 56-70 dB HL */}
          <ReferenceArea y1={56} y2={70} fill="#ffcc80" fillOpacity={0.3} label={{ value: 'Mod-Severa', position: 'insideTopLeft', fill: '#333' }} />
          {/* Severa: 71-90 dB HL */}
          <ReferenceArea y1={71} y2={90} fill="#ffab91" fillOpacity={0.3} label={{ value: 'Severa', position: 'insideTopLeft', fill: '#333' }} />
          {/* Profunda: 91+ dB HL */}
          <ReferenceArea y1={91} y2={110} fill="#ff8a65" fillOpacity={0.3} label={{ value: 'Profunda', position: 'insideTopLeft', fill: '#333' }} />


          <Line
            type="monotone"
            dataKey="right"
            stroke="red"
            strokeWidth={2}
            dot={<CustomDot dataKey="right" />}
            connectNulls={true}
            name="Oído Derecho"
          />
          <Line
            type="monotone"
            dataKey="left"
            stroke="blue"
            strokeWidth={2}
            dot={<CustomDot dataKey="left" />}
            connectNulls={true}
            name="Oído Izquierdo"
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
        <p>Leyenda: <span className="text-red-600">○ Oído Derecho</span>, <span className="text-blue-600">× Oído Izquierdo</span></p>
      </div>
    </div>
  );
};