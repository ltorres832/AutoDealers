'use client';

import FIWorkflowsManager from '@/components/FIWorkflowsManager';

export default function FIWorkflowsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Workflows F&I</h1>
        <p className="mt-2 text-gray-600">
          Automatiza procesos F&I con workflows personalizados
        </p>
      </div>

      <FIWorkflowsManager />
    </div>
  );
}


