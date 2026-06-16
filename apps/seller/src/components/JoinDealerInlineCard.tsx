'use client';

import { useState } from 'react';
import Link from 'next/link';

export function JoinDealerInlineCard() {
  const [code, setCode] = useState('');

  const href = `/join-dealer?code=${encodeURIComponent(code.trim())}`;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Unirte a un concesionario</h2>
      <p className="text-sm text-gray-600 mb-4">
        Pega el código que te compartió el dealer (o abre el link) para vincular tu cuenta.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Ej: A1B2C3D4"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
        />
        <Link
          href={href}
          className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 text-center"
        >
          Continuar
        </Link>
      </div>
    </div>
  );
}

