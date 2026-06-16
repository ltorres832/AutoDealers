'use client';

import Link from 'next/link';

export function DealerManagedReferralsNotice() {
  return (
    <div className="max-w-2xl mx-auto mt-8 rounded-lg border border-amber-200 bg-amber-50 p-8 text-center">
      <div className="text-4xl mb-3">🎁</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Referidos no disponibles</h1>
      <p className="text-gray-700 leading-relaxed">
        Tu cuenta está vinculada a un concesionario que paga la membresía. Las recompensas por referidos
        aplican solo a vendedores independientes con plan propio.
      </p>
      <Link
        href="/dashboard"
        className="inline-block mt-6 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
      >
        Volver al dashboard
      </Link>
    </div>
  );
}
