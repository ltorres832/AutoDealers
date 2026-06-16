'use client';

import React, { type ChangeEvent } from 'react';
import { MAX_PUBLIC_TRUST_GALLERY_PHOTOS } from '../public-trust-gallery';

export type TrustGalleryEditorProps = {
  photos: string[];
  onChange: (photos: string[]) => void;
  onUploadFile: (file: File) => Promise<string | null>;
  onUploadComplete?: (photos: string[]) => void | Promise<void>;
  uploading?: boolean;
  saving?: boolean;
  onSave?: () => void;
  maxPhotos?: number;
  uploadError?: string | null;
};

export function TrustGalleryEditor({
  photos,
  onChange,
  onUploadFile,
  onUploadComplete,
  uploading = false,
  saving = false,
  onSave,
  maxPhotos = MAX_PUBLIC_TRUST_GALLERY_PHOTOS,
  uploadError = null,
}: TrustGalleryEditorProps) {
  const atLimit = photos.length >= maxPhotos;

  function removeAt(index: number) {
    onChange(photos.filter((_, i) => i !== index));
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    e.target.value = '';
    if (!files?.length) return;

    let next = [...photos];
    let uploaded = 0;
    for (let i = 0; i < files.length; i++) {
      if (next.length >= maxPhotos) break;
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      const url = await onUploadFile(file);
      if (url && !next.includes(url)) {
        next = [...next, url];
        uploaded += 1;
      }
    }
    onChange(next);
    if (uploaded > 0 && onUploadComplete) {
      await onUploadComplete(next);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Galería de confianza</h2>
        <p className="mt-1 text-sm text-gray-600">
          Fotos de entregas, clientes satisfechos, eventos o tu equipo. Ayudan a generar confianza en tu
          página pública.
        </p>
        <p className="mt-1 text-xs text-gray-500">Máximo {maxPhotos} fotos (JPG, PNG, WebP). Se guardan al subir.</p>
      </div>

      {uploadError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{uploadError}</p>
      ) : null}

      {photos.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((url, index) => (
            <div key={`${url}-${index}`} className="relative overflow-hidden rounded-lg border bg-gray-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Foto ${index + 1}`} className="aspect-[4/3] w-full object-cover" />
              <button
                type="button"
                onClick={() => removeAt(index)}
                className="absolute right-2 top-2 rounded bg-black/60 px-2 py-1 text-xs text-white hover:bg-black/80"
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">Aún no hay fotos en la galería.</p>
      )}

      <div className="flex flex-wrap gap-3">
        <label
          className={`cursor-pointer rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 ${
            uploading || atLimit ? 'pointer-events-none opacity-50' : ''
          }`}
        >
          {uploading ? 'Subiendo…' : atLimit ? 'Límite alcanzado' : '+ Subir fotos'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            disabled={uploading || atLimit}
            onChange={(e) => void handleFileChange(e)}
          />
        </label>
        {onSave ? (
          <button
            type="button"
            onClick={onSave}
            disabled={saving || uploading}
            className="rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar galería'}
          </button>
        ) : null}
      </div>
    </div>
  );
}
