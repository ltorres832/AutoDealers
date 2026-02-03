'use client';

import DashboardLayout from '../../../components/DashboardLayout';

export default function PlanPage() {
  // Página deshabilitada temporalmente
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h1 className="text-2xl font-bold text-yellow-800 mb-2">Sección Deshabilitada</h1>
          <p className="text-yellow-700">
            La sección de Plan y Facturación está temporalmente deshabilitada.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}

