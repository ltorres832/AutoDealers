'use client';

import { useRef } from 'react';
import {
  MAX_PUBLIC_TRUST_GALLERY_PHOTOS,
  type PublicTrustGalleryItem,
} from '@autodealers/shared/public-trust-gallery';

type Props = {
  items: PublicTrustGalleryItem[];
  onChange: (items: PublicTrustGalleryItem[]) => void;
  onUploadFile: (file: File) => Promise<string | null>;
  onUploadComplete?: (items: PublicTrustGalleryItem[]) => void | Promise<void>;
  uploading?: boolean;
  saving?: boolean;
  onSave?: () => void;
  error?: string | null;
};

export function PublicTrustGallerySection({
  items,
  onChange,
  onUploadFile,
  onUploadComplete,
  uploading = false,
  saving = false,
  onSave,
  error = null,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const atLimit = items.length >= MAX_PUBLIC_TRUST_GALLERY_PHOTOS;

  function updateCaption(index: number, caption: string) {
    onChange(
      items.map((item, i) => (i === index ? { ...item, caption: caption.trim() || undefined } : item))
    );
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    let next = [...items];
    let uploaded = 0;
    for (let i = 0; i < fileList.length; i++) {
      if (next.length >= MAX_PUBLIC_TRUST_GALLERY_PHOTOS) break;
      const file = fileList[i]!;
      if (!file.type.startsWith('image/')) continue;
      const url = await onUploadFile(file);
      if (url && !next.some((item) => item.url === url)) {
        next = [...next, { url }];
        uploaded += 1;
      }
    }
    onChange(next);
    if (uploaded > 0 && onUploadComplete) {
      await onUploadComplete(next);
    }
  }

  return (
    <section className="space-y-4" aria-labelledby="public-gallery-heading">
      <div>
        <h2 id="public-gallery-heading" className="text-lg font-bold text-gray-900">
          Galería de confianza — fotos
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Sube fotos en alta calidad (JPG, PNG o WebP). Añade una descripción en cada una: los clientes la
          verán en tu página pública sin abrir la foto.
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Recomendado: fotos horizontales, mínimo 1200 px de ancho · máximo {MAX_PUBLIC_TRUST_GALLERY_PHOTOS}{' '}
          fotos
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          disabled={uploading || atLimit}
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          disabled={uploading || atLimit}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-bold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? 'Subiendo…' : atLimit ? 'Límite alcanzado' : '+ Subir fotos'}
        </button>
        {onSave ? (
          <button
            type="button"
            onClick={onSave}
            disabled={saving || uploading}
            className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar galería'}
          </button>
        ) : null}
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => (
            <div
              key={`${item.url}-${index}`}
              className="overflow-hidden rounded-xl border bg-white shadow-sm"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.url}
                  alt={item.caption || `Foto ${index + 1}`}
                  className="h-full w-full object-cover object-center"
                />
                <button
                  type="button"
                  onClick={() => onChange(items.filter((_, i) => i !== index))}
                  className="absolute right-2 top-2 rounded bg-black/70 px-2 py-1 text-xs font-medium text-white hover:bg-black"
                >
                  Quitar
                </button>
              </div>
              <label className="block p-3">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Descripción pública
                </span>
                <textarea
                  value={item.caption || ''}
                  onChange={(e) => updateCaption(index, e.target.value)}
                  rows={2}
                  maxLength={200}
                  placeholder="Ej: Entrega del Toyota Corolla 2024 a la familia Rivera"
                  className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <span className="mt-1 block text-right text-xs text-gray-400">
                  {(item.caption || '').length}/200
                </span>
              </label>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
          <p className="text-sm text-gray-500">Aún no hay fotos. Usa el botón <strong>+ Subir fotos</strong>.</p>
        </div>
      )}
    </section>
  );
}
