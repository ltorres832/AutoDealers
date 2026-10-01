'use client';

import { extractVinFromBarcodeText } from './vin';
import type { Worker } from 'tesseract.js';
import type { BrowserMultiFormatReader } from '@zxing/library';

export const VIN_SCAN_TIMEOUT_MS = 45_000;
export const VIN_SCAN_TIP = 'No se pudo leer el VIN. Alinea los 17 caracteres dentro del recuadro, evita reflejos y mejora la luz. También puedes pegarlo manualmente.';
export type VinScanMode = 'text' | 'barcode';
export type VinCameraScanHandle = { stop: () => void };
export type VinCameraScanOptions = {
  video: HTMLVideoElement;
  mode?: VinScanMode;
  timeoutMs?: number;
  onDetected: (vin: string) => void;
  onTimeout?: () => void;
  onError?: (message: string) => void;
  onStatus?: (message: string) => void;
};

// Keep the text crop aligned with the guide in VinDecodeField (object-contain).
export const VIN_TEXT_REGION = { x: 0.05, y: 0.4, width: 0.9, height: 0.2 };

/** Own one camera stream and one recognition loop for the entire session. */
export function startVinCameraScan(options: VinCameraScanOptions): VinCameraScanHandle {
  const { video } = options;
  const mode = options.mode ?? 'text';
  let stopped = false;
  let stream: MediaStream | null = null;
  let worker: Worker | null = null;
  let reader: BrowserMultiFormatReader | null = null;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let nextFrame: ReturnType<typeof setTimeout> | undefined;
  let lastVin: string | null = null;
  let matchingFrames = 0;
  let recognitionReady = false;
  let isBarcodeMiss: (error: unknown) => boolean = () => false;

  const status = (message: string) => { if (!stopped) options.onStatus?.(message); };
  const stop = () => {
    if (stopped) return;
    stopped = true;
    clearTimeout(deadline);
    clearTimeout(nextFrame);
    stream?.getTracks().forEach((track) => track.stop());
    if (stream && video.srcObject === stream) video.srcObject = null;
    reader?.reset();
    if (worker) void worker.terminate().catch(() => undefined);
    worker = null;
  };
  const fail = (error: unknown) => {
    if (stopped) return;
    const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    stop();
    options.onError?.(/NotAllowedError|Permission|denegado/i.test(detail)
      ? 'Permiso de cámara denegado. Habilita la cámara o pega el VIN manualmente.'
      : 'No se pudo iniciar o continuar la lectura. Revisa tu conexión y vuelve a intentar, o pega el VIN manualmente.');
  };
  const armDeadline = () => {
    clearTimeout(deadline);
    deadline = setTimeout(() => {
      if (stopped) return;
      stop();
      if (recognitionReady) options.onTimeout?.();
      else options.onError?.('La preparación del lector tardó demasiado. Revisa la conexión y el permiso de cámara, y vuelve a intentar.');
    }, options.timeoutMs ?? VIN_SCAN_TIMEOUT_MS);
  };
  const detected = (vin: string) => {
    if (stopped) return;
    stop();
    try { navigator.vibrate?.(40); } catch { /* optional feedback */ }
    options.onDetected(vin);
  };

  // Also bound camera permissions and OCR downloads; restart when scanning begins.
  armDeadline();
  void (async () => {
    try {
      status('Abriendo cámara…');
      const acquired = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      if (stopped) { acquired.getTracks().forEach((track) => track.stop()); return; }
      stream = acquired;
      video.srcObject = stream;
      video.muted = true;
      video.setAttribute('playsinline', 'true');
      await video.play();
      if (stopped) return;
      const track = stream.getVideoTracks()[0];
      const caps = track?.getCapabilities?.() as (MediaTrackCapabilities & { focusMode?: string[] }) | undefined;
      if (caps?.focusMode?.includes('continuous')) {
        const focus: MediaTrackConstraintSet & { focusMode: string } = { focusMode: 'continuous' };
        await track.applyConstraints({ advanced: [focus] }).catch(() => undefined);
      }
      if (stopped) return;

      if (mode === 'text') {
        status('Preparando lector de texto… La primera carga puede tardar unos segundos.');
        const { createWorker, PSM } = await import('tesseract.js');
        if (stopped) return;
        const created = await createWorker('eng', 1, {
          workerPath: '/vin-ocr/worker.min.js', corePath: '/vin-ocr', langPath: '/vin-ocr',
          workerBlobURL: false, errorHandler: fail,
          logger: (event) => { if (!recognitionReady && typeof event.progress === 'number') status(`Preparando lector… ${Math.round(event.progress * 100)}%`); },
        });
        if (stopped) { await created.terminate(); return; }
        worker = created;
        await worker.setParameters({
          tessedit_char_whitelist: 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789',
          tessedit_pageseg_mode: PSM.SPARSE_TEXT,
          user_defined_dpi: '150',
        });
      } else {
        const { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat, NotFoundException, ChecksumException, FormatException } = await import('@zxing/library');
        if (stopped) return;
        isBarcodeMiss = (error) => error instanceof NotFoundException || error instanceof ChecksumException || error instanceof FormatException;
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_39, BarcodeFormat.CODE_128, BarcodeFormat.PDF_417, BarcodeFormat.DATA_MATRIX, BarcodeFormat.QR_CODE]);
        hints.set(DecodeHintType.TRY_HARDER, true);
        reader = new BrowserMultiFormatReader(hints);
      }
      if (stopped) return;
      recognitionReady = true;
      armDeadline();
      status(mode === 'text' ? 'Leyendo VIN… Alinea las letras y números dentro del recuadro.' : 'Buscando el código de barras del VIN…');
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (mode === 'text' && !context) throw new Error('Canvas no disponible');

      const scanFrame = async () => {
        if (stopped) return;
        try {
          if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
            if (mode === 'text' && worker && context) {
              const region = VIN_TEXT_REGION;
              const width = video.videoWidth * region.width;
              const height = video.videoHeight * region.height;
              const scale = Math.max(1, Math.min(3, 1600 / width));
              canvas.width = Math.round(width * scale);
              canvas.height = Math.round(height * scale);
              context.drawImage(video, video.videoWidth * region.x, video.videoHeight * region.y, width, height, 0, 0, canvas.width, canvas.height);
              const { data } = await worker.recognize(canvas);
              if (stopped) return;
              const vin = data.confidence >= 60 ? extractVinFromBarcodeText(data.text) : null;
              matchingFrames = vin && vin === lastVin ? matchingFrames + 1 : vin ? 1 : 0;
              lastVin = vin;
              // Require two independent frames to reduce accidental OCR autofills.
              if (vin && matchingFrames >= 2) { detected(vin); return; }
              status(vin ? 'Confirmando VIN… Mantén la cámara quieta.' : data.text.trim() ? 'Detectando texto… Acerca los 17 caracteres y mantén la cámara quieta.' : 'Buscando letras y números… Acerca la cámara y evita reflejos.');
            } else if (reader) {
              try {
                const vin = extractVinFromBarcodeText(reader.decode(video).getText());
                if (vin) { detected(vin); return; }
              } catch (error) {
                // These are normal for frames without a readable barcode.
                if (!isBarcodeMiss(error)) throw error;
              }
            }
          }
          if (!stopped) nextFrame = setTimeout(() => void scanFrame(), mode === 'text' ? 300 : 150);
        } catch (error) { fail(error); }
      };
      void scanFrame();
    } catch (error) { fail(error); }
  })();
  return { stop };
}
