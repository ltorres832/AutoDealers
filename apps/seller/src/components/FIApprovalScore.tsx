'use client';

import { useState, useEffect } from 'react';

interface ApprovalScore {
  score: number;
  probability: number;
  recommendation: 'approve' | 'conditional' | 'reject' | 'needs_cosigner';
  reasons: string[];
  riskFactors: string[];
  positiveFactors: string[];
  suggestedDownPayment?: number;
  suggestedTerm?: number;
}

interface FIApprovalScoreProps {
  requestId: string;
  vehiclePrice: number;
  downPayment: number;
  monthlyPayment: number;
  onScoreCalculated?: (score: ApprovalScore) => void;
}

export default function FIApprovalScore({
  requestId,
  vehiclePrice,
  downPayment,
  monthlyPayment,
  onScoreCalculated,
}: FIApprovalScoreProps) {
  const [score, setScore] = useState<ApprovalScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (requestId && vehiclePrice && downPayment && monthlyPayment) {
      calculateScore();
    }
  }, [requestId, vehiclePrice, downPayment, monthlyPayment]);

  async function calculateScore() {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/fi/approval-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          requestId,
          vehiclePrice,
          downPayment,
          monthlyPayment,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al calcular score');
      }

      const data = await response.json();
      setScore(data.score);
      if (onScoreCalculated) {
        onScoreCalculated(data.score);
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error calculating score:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Calculando score de aprobación...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!score) {
    return null;
  }

  const getRecommendationColor = () => {
    switch (score.recommendation) {
      case 'approve':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'conditional':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'needs_cosigner':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'reject':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getRecommendationLabel = () => {
    switch (score.recommendation) {
      case 'approve':
        return 'Aprobar';
      case 'conditional':
        return 'Aprobación Condicional';
      case 'needs_cosigner':
        return 'Requiere Co-signer';
      case 'reject':
        return 'Rechazar';
      default:
        return 'Pendiente';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">🎯 Score de Aprobación Automático</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <span className="text-sm text-blue-700">Score Total</span>
          <p className="text-4xl font-bold text-blue-900">{score.score}/100</p>
          <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                score.score >= 75 ? 'bg-green-600' :
                score.score >= 60 ? 'bg-yellow-600' :
                score.score >= 45 ? 'bg-orange-600' :
                'bg-red-600'
              }`}
              style={{ width: `${score.score}%` }}
            ></div>
          </div>
        </div>
        
        <div className={`border-2 rounded-lg p-4 ${getRecommendationColor()}`}>
          <span className="text-sm font-medium">Recomendación</span>
          <p className="text-2xl font-bold mt-1">{getRecommendationLabel()}</p>
          <p className="text-sm mt-1">
            Probabilidad: {(score.probability * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {score.reasons.length > 0 && (
        <div className="mb-4">
          <h3 className="font-semibold text-gray-900 mb-2">📋 Razones:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
            {score.reasons.map((reason, index) => (
              <li key={index}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      {score.positiveFactors.length > 0 && (
        <div className="mb-4">
          <h3 className="font-semibold text-green-900 mb-2">✅ Factores Positivos:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-green-700">
            {score.positiveFactors.map((factor, index) => (
              <li key={index}>{factor}</li>
            ))}
          </ul>
        </div>
      )}

      {score.riskFactors.length > 0 && (
        <div className="mb-4">
          <h3 className="font-semibold text-red-900 mb-2">⚠️ Factores de Riesgo:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
            {score.riskFactors.map((factor, index) => (
              <li key={index}>{factor}</li>
            ))}
          </ul>
        </div>
      )}

      {(score.suggestedDownPayment || score.suggestedTerm) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 mb-2">💡 Sugerencias:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800">
            {score.suggestedDownPayment && (
              <li>
                Considerar aumentar el pronto pago a ${score.suggestedDownPayment.toLocaleString()} 
                (${((score.suggestedDownPayment / vehiclePrice) * 100).toFixed(1)}% del precio)
              </li>
            )}
            {score.suggestedTerm && (
              <li>
                Considerar extender el plazo a {score.suggestedTerm} meses para reducir el pago mensual
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}


