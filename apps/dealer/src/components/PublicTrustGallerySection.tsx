'use client';

import { useRef } from 'react';

const MAX_PHOTOS = 24;

type Props = {
  photos: string[];
  onChange: (photos: string[]) => void;
  onUploadFile: (file: File) => Promise<string | null>;
  onUploadComplete?: (photos: string[]) => void | Promise<void>;
  uploading?: boolean;
  saving?: boolean;
  onSave?: () => void;
  error?: string | null;
};

export function PublicTrustGallerySection({
  photos,
  onChange,
  onUploadFile,
  onUploadComplete,
  uploading = false,
  saving = false,
  onSave,
  error = null,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const atLimit = photos.length >= MAX_PHOTOS;

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    let next = [...photos];
    let uploaded = 0;
    for (let i = 0; i < fileList.length; i++) {
      if (next.length >= MAX_PHOTOS) break;
      const file = fileList[i]!;
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
    <section className="space-y-4" aria-labelledby="public-gallery-heading">
      <div>
        <h2 id="public-gallery-heading" className="text-lg font-bold text-gray-900">
          Galería de confianza — fotos
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Sube fotos de entregas, clientes satisfechos o tu equipo. Se muestran en tu página pública.
        </p>
        <p className="mt-1 text-xs text-gray-500">JPG, PNG o WebP · máximo {MAX_PHOTOS} fotos</p>
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

      {photos.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((url, index) => (
            <div key={`${url}-${index}`} className="relative overflow-hidden rounded-xl border bg-gray-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Foto ${index + 1}`} className="aspect-[4/3] w-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(photos.filter((_, i) => i !== index))}
                className="absolute right-2 top-2 rounded bg-black/70 px-2 py-1 text-xs font-medium text-white hover:bg-black"
              >
                Quitar
              </button>
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
