"use client";

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Thresholds } from "@/pages/AudiometerPage"; // Import the type

interface ThresholdInputTableProps {
  thresholds: Thresholds;
  onThresholdChange: (frequency: number, ear: 'right' | 'left', value: number | null) => void;
}

const frequencies = [125, 250, 500, 750, 1000, 1500, 2000, 3000, 4000, 6000, 8000];

export const ThresholdInputTable: React.FC<ThresholdInputTableProps> = ({ thresholds, onThresholdChange }) => {
  const handleInputChange = (
    frequency: number,
    ear: 'right' | 'left',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = parseInt(e.target.value);
    if (e.target.value === '') {
      onThresholdChange(frequency, ear, null);
    } else if (!isNaN(value) && value >= -10 && value <= 110) {
      onThresholdChange(frequency, ear, value);
    }
  };

  return (
    <div className="overflow-x-auto">
      <Label className="text-lg font-semibold mb-4 block">Umbrales Auditivos (dB HL)</Label>
      <Table className="min-w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Frecuencia (Hz)</TableHead>
            <TableHead className="text-center">Oído Derecho (OD)</TableHead>
            <TableHead className="text-center">Oído Izquierdo (OI)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {frequencies.map((freq) => (
            <TableRow key={freq}>
              <TableCell className="font-medium">{freq}</TableCell>
              <TableCell>
                <Input
                  type="number"
                  value={thresholds[freq]?.right === null ? '' : thresholds[freq]?.right}
                  onChange={(e) => handleInputChange(freq, 'right', e)}
                  min={-10}
                  max={110}
                  className="w-24 text-center"
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  value={thresholds[freq]?.left === null ? '' : thresholds[freq]?.left}
                  onChange={(e) => handleInputChange(freq, 'left', e)}
                  min={-10}
                  max={110}
                  className="w-24 text-center"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};