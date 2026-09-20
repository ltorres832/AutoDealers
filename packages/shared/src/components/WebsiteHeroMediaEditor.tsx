'use client';

import { useState, type ChangeEvent } from 'react';
import type { WebsiteHeroMediaMode } from '../website-hero-media';

export type WebsiteHeroMediaEditorProps = {
  mediaMode: WebsiteHeroMediaMode;
  backgroundImage?: string;
  backgroundVideoUrl?: string;
  onChange: (next: {
    mediaMode: WebsiteHeroMediaMode;
    backgroundImage?: string;
    backgroundVideoUrl?: string;
  }) => void;
  onUploadImage: (file: File) => Promise<string | null>;
  onUploadVideo: (file: File) => Promise<string | null>;
  uploading?: boolean;
  disabled?: boolean;
};

const MODES: Array<{ id: WebsiteHeroMediaMode; label: string; hint: string }> = [
  {
    id: 'gradient',
    label: 'Gradiente (por defecto)',
    hint: 'El diseño actual con colores de marca / púrpura–rojo.',
  },
  {
    id: 'image',
    label: 'Foto de fondo',
    hint: 'Imagen a pantalla completa (recomendado 1920×1080 o más).',
  },
  {
    id: 'video',
    label: 'Video de fondo',
    hint: 'Sube un MP4/WebM o pega un link de YouTube, Vimeo o .mp4.',
  },
];

export function WebsiteHeroMediaEditor({
  mediaMode,
  backgroundImage,
  backgroundVideoUrl,
  onChange,
  onUploadImage,
  onUploadVideo,
  uploading = false,
  disabled = false,
}: WebsiteHeroMediaEditorProps) {
  const [videoLinkDraft, setVideoLinkDraft] = useState('');
  const [localError, setLocalError] = useState('');

  function patch(partial: Partial<{
    mediaMode: WebsiteHeroMediaMode;
    backgroundImage?: string;
    backgroundVideoUrl?: string;
  }>) {
    onChange({
      mediaMode: partial.mediaMode ?? mediaMode,
      backgroundImage:
        partial.backgroundImage !== undefined ? partial.backgroundImage : backgroundImage,
      backgroundVideoUrl:
        partial.backgroundVideoUrl !== undefined
          ? partial.backgroundVideoUrl
          : backgroundVideoUrl,
    });
  }

  async function handleImageFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setLocalError('');
    if (!file.type.startsWith('image/')) {
      setLocalError('Solo se permiten imágenes (JPG, PNG, WebP).');
      return;
    }
    const url = await onUploadImage(file);
    if (!url) {
      setLocalError('No se pudo subir la imagen.');
      return;
    }
    patch({ mediaMode: 'image', backgroundImage: url });
  }

  async function handleVideoFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setLocalError('');
    if (!file.type.startsWith('video/')) {
      setLocalError('Solo se permiten videos (MP4, WebM, MOV).');
      return;
    }
    const url = await onUploadVideo(file);
    if (!url) {
      setLocalError('No se pudo subir el video.');
      return;
    }
    patch({ mediaMode: 'video', backgroundVideoUrl: url });
  }

  function applyVideoLink() {
    const t = videoLinkDraft.trim();
    if (!t) return;
    setLocalError('');
    patch({ mediaMode: 'video', backgroundVideoUrl: t });
    setVideoLinkDraft('');
  }

  return (
    <div className="space-y-4 border-t pt-4 mt-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Fondo del hero</h3>
        <p className="text-xs text-gray-500 mt-1">
          Déjalo como viene, o personalízalo con foto o video. El contenido se ajusta para que
          nada se vea cortado en móvil ni escritorio.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {MODES.map((m) => (
          <label
            key={m.id}
            className={`cursor-pointer rounded-lg border p-3 text-left transition ${
              mediaMode === m.id
                ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-600'
                : 'border-gray-200 bg-white hover:border-gray-300'
            } ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
          >
            <input
              type="radio"
              className="sr-only"
              name="hero-media-mode"
              checked={mediaMode === m.id}
              disabled={disabled}
              onChange={() => patch({ mediaMode: m.id })}
            />
            <span className="block text-sm font-medium text-gray-900">{m.label}</span>
            <span className="mt-1 block text-xs text-gray-500">{m.hint}</span>
          </label>
        ))}
      </div>

      {mediaMode === 'image' ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
          {backgroundImage ? (
            <div className="relative overflow-hidden rounded-lg bg-black aspect-[16/9] max-h-56">
              <img
                src={backgroundImage}
                alt="Vista previa del hero"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          ) : (
            <p className="text-sm text-gray-600">Aún no hay foto. Sube una imagen horizontal.</p>
          )}
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
              {uploading ? 'Subiendo…' : backgroundImage ? 'Cambiar foto' : 'Subir foto'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                disabled={uploading || disabled}
                onChange={handleImageFile}
              />
            </label>
            {backgroundImage ? (
              <button
                type="button"
                disabled={disabled}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => patch({ backgroundImage: undefined, mediaMode: 'gradient' })}
              >
                Quitar y usar gradiente
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {mediaMode === 'video' ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
          {backgroundVideoUrl ? (
            <p className="text-sm text-gray-700 break-all">
              Video actual:{' '}
              <a
                href={backgroundVideoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-700 underline"
              >
                {backgroundVideoUrl.length > 80
                  ? `${backgroundVideoUrl.slice(0, 80)}…`
                  : backgroundVideoUrl}
              </a>
            </p>
          ) : (
            <p className="text-sm text-gray-600">Sube un archivo o pega un enlace.</p>
          )}

          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
              {uploading ? 'Subiendo…' : 'Subir video'}
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                className="hidden"
                disabled={uploading || disabled}
                onChange={handleVideoFile}
              />
            </label>
            {backgroundVideoUrl ? (
              <button
                type="button"
                disabled={disabled}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => patch({ backgroundVideoUrl: undefined, mediaMode: 'gradient' })}
              >
                Quitar y usar gradiente
              </button>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="url"
              value={videoLinkDraft}
              disabled={disabled}
              onChange={(e) => setVideoLinkDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  applyVideoLink();
                }
              }}
              placeholder="https://youtube.com/... o https://….mp4"
              className="w-full flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={disabled || !videoLinkDraft.trim()}
              onClick={applyVideoLink}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100 disabled:opacity-50"
            >
              Usar link
            </button>
          </div>
          <p className="text-xs text-gray-500">
            YouTube/Vimeo se reproducen en silenciado y en bucle como fondo. Archivos subidos: MP4
            o WebM, máx. ~100 MB.
          </p>
        </div>
      ) : null}

      {localError ? <p className="text-sm text-red-600">{localError}</p> : null}
    </div>
  );
}
