'use client';

import React, { type ChangeEvent } from 'react';
import { MAX_PUBLIC_PROMO_VIDEOS } from '../promo-video-urls';

export type PromoVideosEditorProps = {
  urls: string[];
  onChange: (urls: string[]) => void;
  onUploadFile: (file: File) => Promise<string | null>;
  uploading?: boolean;
  saving?: boolean;
  onSave?: () => void;
  maxVideos?: number;
  title?: string;
  description?: string;
};

export function PromoVideosEditor({
  urls,
  onChange,
  onUploadFile,
  uploading = false,
  saving = false,
  onSave,
  maxVideos = MAX_PUBLIC_PROMO_VIDEOS,
  title = 'Videos en tu página pública',
  description = 'Puedes agregar varios videos. En la web se muestran en filas de dos, uno al lado del otro.',
}: PromoVideosEditorProps) {
  const atLimit = urls.length >= maxVideos;

  function addUrl(raw: string) {
    const t = raw.trim();
    if (!t) return;
    if (urls.includes(t)) return;
    if (urls.length >= maxVideos) return;
    onChange([...urls, t]);
  }

  function removeAt(index: number) {
    onChange(urls.filter((_, i) => i !== index));
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    e.target.value = '';
    if (!files?.length) return;

    let next = [...urls];
    for (let i = 0; i < files.length; i++) {
      if (next.length >= maxVideos) break;
      const file = files[i];
      if (!file.type.startsWith('video/')) continue;
      const url = await onUploadFile(file);
      if (url && !next.includes(url)) {
        next = [...next, url];
      }
    }
    onChange(next);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="mt-1 text-sm text-gray-600">{description}</p>
        <p className="mt-1 text-xs text-gray-500">
          YouTube, Vimeo o enlace HTTPS a .mp4 / .webm. Máximo {maxVideos} videos.
        </p>
      </div>

      {urls.length > 0 ? (
        <ul className="space-y-2">
          {urls.map((url, index) => (
            <li
              key={`${url}-${index}`}
              className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:flex-row sm:items-center"
            >
              <span className="text-xs font-medium text-gray-500 shrink-0">Video {index + 1}</span>
              <input
                type="url"
                readOnly
                value={url}
                className="min-w-0 flex-1 rounded border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-800"
              />
              <button
                type="button"
                onClick={() => removeAt(index)}
                className="shrink-0 rounded border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500 italic">Aún no hay videos. Agrega un enlace o sube archivos.</p>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
        <label className="block text-sm font-medium text-gray-700">Agregar enlace</label>
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const v = String(fd.get('newUrl') || '');
            addUrl(v);
            e.currentTarget.reset();
          }}
        >
          <input
            name="newUrl"
            type="url"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="https://www.youtube.com/watch?v=…"
            disabled={atLimit}
          />
          <button
            type="submit"
            disabled={atLimit}
            className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
          >
            Agregar
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
        <p className="text-sm font-medium text-gray-700">Subir desde tu equipo</p>
        <p className="text-xs text-gray-500">MP4, WebM u otros formatos de video. Hasta 100 MB por archivo.</p>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium hover:bg-gray-100 disabled:opacity-50">
          <input
            type="file"
            accept="video/*"
            multiple
            className="hidden"
            disabled={uploading || atLimit}
            onChange={handleFileChange}
          />
          {uploading ? 'Subiendo…' : 'Elegir uno o varios videos'}
        </label>
      </div>

      {onSave ? (
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Guardar videos'}
        </button>
      ) : null}
    </div>
  );
}
