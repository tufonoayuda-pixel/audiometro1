"use client";

import React from 'react';
import { PatientData, Thresholds } from "@/pages/AudiometerPage"; // Import types
import { AudiogramChart } from "./AudiogramChart";
import { format } from "date-fns";

interface PrintReportProps {
  patientData: PatientData;
  thresholds: Thresholds;
}

const frequencies = [125, 250, 500, 750, 1000, 1500, 2000, 3000, 4000, 6000, 8000];

export const PrintReport: React.FC<PrintReportProps> = ({ patientData, thresholds }) => {
  // Dummy function for onThresholdChange, as it's not needed for printing
  const dummyOnThresholdChange = () => {};

  return (
    <div className="print-container p-8 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-50">
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 1cm;
        }
        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .print-container {
          font-family: 'Arial', sans-serif;
          color: #333;
          line-height: 1.6;
        }
        .print-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          border-bottom: 1px solid #eee;
          padding-bottom: 1rem;
        }
        .print-header img {
          max-height: 60px;
          width: auto;
        }
        .print-header h1 {
          font-size: 1.8rem;
          font-weight: bold;
          color: #222;
        }
        .patient-info, .examiner-info {
          margin-bottom: 1.5rem;
          border: 1px solid #eee;
          padding: 1rem;
          border-radius: 0.5rem;
        }
        .patient-info h2, .examiner-info h2 {
          font-size: 1.2rem;
          font-weight: bold;
          margin-bottom: 0.8rem;
          color: #444;
        }
        .patient-info p, .examiner-info p {
          margin-bottom: 0.4rem;
        }
        .audiogram-section {
          margin-top: 2rem;
          margin-bottom: 2rem;
        }
        .audiogram-chart-wrapper {
          width: 100%;
          height: 400px; /* Fixed height for print */
          margin-top: 1rem;
        }
        .threshold-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 1.5rem;
        }
        .threshold-table th, .threshold-table td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: center;
        }
        .threshold-table th {
          background-color: #f9f9f9;
          font-weight: bold;
        }
        .disclaimer {
          margin-top: 3rem;
          font-size: 0.85rem;
          color: #666;
          text-align: center;
          border-top: 1px solid #eee;
          padding-top: 1rem;
        }
      `}</style>

      <div className="print-header">
        {/* Placeholder for Logo */}
        <img src="/placeholder.svg" alt="Logo" className="h-16 w-auto" />
        <h1>Audiograma – Screening Auditivo</h1>
      </div>

      <div className="patient-info">
        <h2>Datos del Paciente</h2>
        <p><strong>Nombre:</strong> {patientData.fullName}</p>
        <p><strong>Edad:</strong> {patientData.age} años</p>
        <p><strong>Fecha de Evaluación:</strong> {format(patientData.evaluationDate, "dd/MM/yyyy")}</p>
        <p><strong>Tipo de Hipoacusia:</strong> {patientData.hearingLossType || 'No especificado'}</p>
        <p>
          <strong>Oído Afectado:</strong>{' '}
          {patientData.affectedEar.bilateral ? 'Bilateral' :
           (patientData.affectedEar.right && patientData.affectedEar.left ? 'Derecho e Izquierdo' :
            (patientData.affectedEar.right ? 'Derecho' :
             (patientData.affectedEar.left ? 'Izquierdo' : 'No especificado')))}
        </p>
        <p><strong>Portador de Audífonos:</strong> {patientData.hasHearingAids === 'yes' ? 'Sí' : (patientData.hasHearingAids === 'no' ? 'No' : 'No especificado')}</p>
      </div>

      <div className="examiner-info">
        <h2>Datos del Examinador</h2>
        <p><strong>Nombre del Examinador:</strong> {patientData.examinerName}</p>
      </div>

      <div className="audiogram-section">
        <h2 className="text-xl font-bold mb-4 text-center">Gráfico del Audiograma</h2>
        <div className="audiogram-chart-wrapper">
          <AudiogramChart patientData={patientData} thresholds={thresholds} onThresholdChange={dummyOnThresholdChange} />
        </div>

        <h2 className="text-xl font-bold mt-8 mb-4 text-center">Umbrales Auditivos Registrados</h2>
        <table className="threshold-table">
          <thead>
            <tr>
              <th>Frecuencia (Hz)</th>
              <th>Oído Derecho (dB HL)</th>
              <th>Oído Izquierdo (dB HL)</th>
            </tr>
          </thead>
          <tbody>
            {frequencies.map((freq) => (
              <tr key={freq}>
                <td>{freq}</td>
                <td>{thresholds[freq]?.right !== null ? thresholds[freq]?.right : '-'}</td>
                <td>{thresholds[freq]?.left !== null ? thresholds[freq]?.left : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="disclaimer">
        <p>
          <strong>Nota:</strong> Evaluación realizada con herramienta de screening no diagnóstica.
          Confirmar con audiometría clínica calibrada.
        </p>
      </div>
    </div>
  );
};