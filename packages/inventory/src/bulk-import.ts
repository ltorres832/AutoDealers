/**
 * Importación masiva de inventario desde CSV/Excel.
 * Matching por VIN o número de stock, decodificación VIN (NHTSA vPIC) y commit por lotes.
 */
import * as XLSX from 'xlsx';
import { getFirestore, getFirestoreFieldValue } from '@autodealers/shared';
import {
  normalizeVin,
  isValidVinFormat,
  isValidVinCheckDigit,
  isValidVin,
  toVinNormalized,
} from '@autodealers/core';
import type { Vehicle, VehicleCondition, VehicleStatus } from './types';
import { getVehicles } from './vehicles';
import { uploadVehicleImage } from './storage';

function getDb() {
  return getFirestore();
}

// ---------------------------------------------------------------------------
// Columnas reconocidas
// ---------------------------------------------------------------------------

export type ImportField =
  | 'vin'
  | 'stockNumber'
  | 'make'
  | 'model'
  | 'year'
  | 'price'
  | 'mileage'
  | 'color'
  | 'condition'
  | 'status'
  | 'quantity'
  | 'transmission'
  | 'fuelType'
  | 'engine'
  | 'doors'
  | 'seats'
  | 'bodyType'
  | 'description'
  | 'photos'
  | 'dealer';

const COLUMN_ALIASES: Record<ImportField, string[]> = {
  vin: ['vin', 'vin number', 'numero vin', 'número vin', 'no vin', 'vin#'],
  stockNumber: [
    'stock', 'stocknumber', 'stock number', 'stock#', 'no stock', 'no. stock',
    'numero de stock', 'número de stock', 'num stock', 'stk', 'control',
  ],
  make: ['make', 'marca', 'brand', 'fabricante'],
  model: ['model', 'modelo'],
  year: ['year', 'año', 'ano', 'yr'],
  price: ['price', 'precio', 'amount', 'costo', 'valor', 'precio venta', 'sale price'],
  mileage: ['mileage', 'millas', 'millaje', 'miles', 'odometer', 'odometro', 'odómetro', 'km', 'kilometraje'],
  color: ['color', 'colour', 'color exterior', 'exterior color'],
  condition: ['condition', 'condicion', 'condición', 'estado del vehiculo', 'tipo'],
  status: ['status', 'estatus', 'estado', 'disponibilidad'],
  quantity: ['quantity', 'cantidad', 'qty', 'unidades', 'units', 'disponibles', 'cantidad disponible'],
  transmission: ['transmission', 'transmision', 'transmisión', 'caja'],
  fuelType: ['fuel', 'fueltype', 'fuel type', 'combustible', 'tipo de combustible'],
  engine: ['engine', 'motor'],
  doors: ['doors', 'puertas'],
  seats: ['seats', 'asientos', 'pasajeros'],
  bodyType: ['bodytype', 'body type', 'body', 'carroceria', 'carrocería', 'categoria', 'categoría', 'tipo de vehiculo', 'tipo de vehículo'],
  description: ['description', 'descripcion', 'descripción', 'detalles', 'notas', 'comments'],
  photos: ['photos', 'fotos', 'images', 'imagenes', 'imágenes', 'photo urls', 'urls fotos', 'pictures'],
  dealer: ['dealer', 'sede', 'sucursal', 'location', 'tienda', 'branch'],
};

function normalizeHeader(header: string): string {
  return String(header || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_\-.]+/g, ' ')
    .replace(/\s+/g, ' ');
}

/** Detecta a qué campo corresponde una cabecera del archivo (o null si no se reconoce). */
export function detectImportField(header: string): ImportField | null {
  const norm = normalizeHeader(header);
  if (!norm) return null;
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES) as [ImportField, string[]][]) {
    if (aliases.some((a) => normalizeHeader(a) === norm)) return field;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Parseo de archivo
// ---------------------------------------------------------------------------

export interface ParsedInventoryFile {
  /** Cabeceras originales del archivo, en orden. */
  headers: string[];
  /** Mapeo automático cabecera → campo (null si no se reconoció). */
  mapping: Record<string, ImportField | null>;
  /** Filas crudas: cabecera original → valor celda (string). */
  rows: Record<string, string>[];
  totalRows: number;
}

/** Parsea CSV o Excel (primera hoja) desde un buffer. */
export function parseInventoryFile(buffer: Buffer): ParsedInventoryFile {
  const workbook = XLSX.read(buffer, { type: 'buffer', raw: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('El archivo no contiene hojas de datos');
  }
  const sheet = workbook.Sheets[sheetName];
  const matrix: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  // Primera fila con contenido = cabeceras
  const headerRowIdx = matrix.findIndex((row) =>
    Array.isArray(row) && row.some((c) => String(c ?? '').trim() !== '')
  );
  if (headerRowIdx === -1) {
    throw new Error('El archivo está vacío');
  }

  const headers = (matrix[headerRowIdx] as unknown[]).map((h) => String(h ?? '').trim());
  const mapping: Record<string, ImportField | null> = {};
  for (const h of headers) {
    if (h) mapping[h] = detectImportField(h);
  }

  const rows: Record<string, string>[] = [];
  for (let i = headerRowIdx + 1; i < matrix.length; i++) {
    const raw = matrix[i] as unknown[];
    if (!Array.isArray(raw)) continue;
    const row: Record<string, string> = {};
    let hasValue = false;
    headers.forEach((h, idx) => {
      if (!h) return;
      const val = String(raw[idx] ?? '').trim();
      row[h] = val;
      if (val) hasValue = true;
    });
    if (hasValue) rows.push(row);
  }

  return { headers: headers.filter(Boolean), mapping, rows, totalRows: rows.length };
}

// ---------------------------------------------------------------------------
// Normalización de filas
// ---------------------------------------------------------------------------

export interface NormalizedImportRow {
  rowIndex: number;
  vin?: string;
  stockNumber?: string;
  make?: string;
  model?: string;
  year?: number;
  price?: number;
  mileage?: number;
  color?: string;
  condition?: VehicleCondition;
  status?: VehicleStatus;
  quantity?: number;
  transmission?: string;
  fuelType?: string;
  engine?: string;
  doors?: number;
  seats?: number;
  bodyType?: string;
  description?: string;
  photoUrls?: string[];
  dealer?: string;
}

function parseNumber(value?: string): number | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/[$,\s]/g, '').replace(/[^0-9.\-]/g, '');
  if (!cleaned) return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

function parseCondition(value?: string): VehicleCondition | undefined {
  const v = normalizeHeader(value || '');
  if (!v) return undefined;
  if (['new', 'nuevo', 'nueva'].includes(v)) return 'new';
  if (['certified', 'certificado', 'cpo'].includes(v)) return 'certified';
  if (['used', 'usado', 'usada', 'pre owned', 'preowned', 'seminuevo'].includes(v)) return 'used';
  return undefined;
}

function parseStatus(value?: string): VehicleStatus | undefined {
  const v = normalizeHeader(value || '');
  if (!v) return undefined;
  if (['available', 'disponible', 'activo', 'active', 'en venta'].includes(v)) return 'available';
  if (['sold', 'vendido', 'vendida'].includes(v)) return 'sold';
  if (['reserved', 'reservado', 'reservada'].includes(v)) return 'reserved';
  if (['hidden', 'oculto', 'oculta', 'inactivo'].includes(v)) return 'hidden';
  return undefined;
}

function parsePhotoUrls(value?: string): string[] | undefined {
  if (!value) return undefined;
  const urls = value
    .split(/[|;,\n]/)
    .map((u) => u.trim())
    .filter((u) => /^https?:\/\//i.test(u));
  return urls.length > 0 ? urls.slice(0, 20) : undefined;
}

/** Aplica el mapeo (cabecera → campo) a las filas crudas y normaliza tipos. */
export function normalizeImportRows(
  rows: Record<string, string>[],
  mapping: Record<string, ImportField | null>
): NormalizedImportRow[] {
  return rows.map((raw, idx) => {
    const get = (field: ImportField): string | undefined => {
      for (const [header, mapped] of Object.entries(mapping)) {
        if (mapped === field) {
          const v = (raw[header] || '').trim();
          if (v) return v;
        }
      }
      return undefined;
    };

    const row: NormalizedImportRow = { rowIndex: idx + 1 };
    const vin = get('vin');
    if (vin) row.vin = vin.toUpperCase().replace(/\s+/g, '');
    const stock = get('stockNumber');
    if (stock) row.stockNumber = stock;
    row.make = get('make');
    row.model = get('model');
    row.year = parseNumber(get('year'));
    row.price = parseNumber(get('price'));
    row.mileage = parseNumber(get('mileage'));
    row.color = get('color');
    row.condition = parseCondition(get('condition'));
    row.status = parseStatus(get('status'));
    const qty = parseNumber(get('quantity'));
    if (qty != null && qty >= 0) row.quantity = Math.floor(qty);
    row.transmission = get('transmission');
    row.fuelType = get('fuelType');
    row.engine = get('engine');
    row.doors = parseNumber(get('doors'));
    row.seats = parseNumber(get('seats'));
    row.bodyType = get('bodyType');
    row.description = get('description');
    row.photoUrls = parsePhotoUrls(get('photos'));
    row.dealer = get('dealer');
    return row;
  });
}

// ---------------------------------------------------------------------------
// VIN: validación (core) y decodificación NHTSA vPIC
// ---------------------------------------------------------------------------

export {
  normalizeVin,
  isValidVinFormat,
  isValidVinCheckDigit,
  isValidVin,
  toVinNormalized,
};

export interface VinDecodeResult {
  make?: string;
  model?: string;
  year?: number;
  bodyType?: string;
  engine?: string;
  fuelType?: string;
  transmission?: string;
  doors?: number;
}

const VPIC_BODY_MAP: Record<string, string> = {
  'sport utility vehicle (suv)/multi-purpose vehicle (mpv)': 'suv',
  'sedan/saloon': 'sedan',
  pickup: 'pickup-truck',
  truck: 'pickup-truck',
  coupe: 'coupe',
  hatchback: 'hatchback',
  'hatchback/liftback/notchback': 'hatchback',
  wagon: 'wagon',
  'convertible/cabriolet': 'convertible',
  minivan: 'minivan',
  van: 'van',
  'cargo van': 'van',
  crossover: 'crossover',
};

const VPIC_FUEL_MAP: Record<string, string> = {
  gasoline: 'gasoline',
  diesel: 'diesel',
  electric: 'electric',
  'battery electric vehicle (bev)': 'electric',
  'hybrid electric vehicle (hev)': 'hybrid',
  'plug-in hybrid electric vehicle (phev)': 'plug-in-hybrid',
  'flexible fuel vehicle (ffv)': 'gasoline',
};

/**
 * Decodifica un VIN con la API pública NHTSA vPIC (gratis, sin key).
 * Cachea el resultado en Firestore (`vin_decode_cache/{vin}`) para no repetir llamadas.
 */
export async function decodeVin(vin: string): Promise<VinDecodeResult | null> {
  const v = normalizeVin(vin);
  if (!isValidVinFormat(v)) return null;

  const cacheRef = getDb().collection('vin_decode_cache').doc(v);
  try {
    const cached = await cacheRef.get();
    if (cached.exists) {
      const data = cached.data();
      return (data?.result as VinDecodeResult) ?? null;
    }
  } catch {
    // cache es best-effort
  }

  let result: VinDecodeResult | null = null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(v)}?format=json`,
      { signal: controller.signal }
    );
    clearTimeout(timer);
    if (res.ok) {
      const json: any = await res.json();
      const r = json?.Results?.[0];
      if (r && (r.Make || r.Model || r.ModelYear)) {
        result = {};
        if (r.Make) result.make = titleCase(String(r.Make));
        if (r.Model) result.model = String(r.Model);
        const year = Number(r.ModelYear);
        if (Number.isFinite(year) && year > 1950) result.year = year;
        const body = normalizeHeader(String(r.BodyClass || ''));
        if (body && VPIC_BODY_MAP[body]) result.bodyType = VPIC_BODY_MAP[body];
        const engineParts = [r.EngineCylinders ? `${r.EngineCylinders} cil` : '', r.DisplacementL ? `${r.DisplacementL}L` : '']
          .filter(Boolean)
          .join(' ');
        if (engineParts) result.engine = engineParts;
        const fuel = normalizeHeader(String(r.FuelTypePrimary || ''));
        if (fuel && VPIC_FUEL_MAP[fuel]) result.fuelType = VPIC_FUEL_MAP[fuel];
        const trans = normalizeHeader(String(r.TransmissionStyle || ''));
        if (trans.includes('automatic')) result.transmission = 'automatic';
        else if (trans.includes('manual')) result.transmission = 'manual';
        else if (trans.includes('cvt')) result.transmission = 'cvt';
        const doors = Number(r.Doors);
        if (Number.isFinite(doors) && doors > 0) result.doors = doors;
      }
    }
  } catch (error) {
    console.warn('decodeVin: fallo NHTSA vPIC para', v, error instanceof Error ? error.message : error);
    return null;
  }

  try {
    await cacheRef.set({
      result: result ?? null,
      cachedAt: getFirestoreFieldValue().serverTimestamp(),
    });
  } catch {
    // cache es best-effort
  }

  return result;
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

// ---------------------------------------------------------------------------
// Matching contra inventario existente
// ---------------------------------------------------------------------------

export type ImportMatchKey = 'vin' | 'stockNumber' | 'auto';

export type ImportRowAction = 'create' | 'update' | 'error';

export interface ImportPlanRow {
  row: NormalizedImportRow;
  action: ImportRowAction;
  /** ID del vehículo existente si action=update. */
  vehicleId?: string;
  /** Clave usada para el match. */
  matchedBy?: 'vin' | 'stockNumber';
  /** Datos autocompletados por decodificación VIN. */
  vinDecoded?: VinDecodeResult;
  error?: string;
}

export interface ImportPlan {
  rows: ImportPlanRow[];
  toCreate: number;
  toUpdate: number;
  errors: number;
}

/**
 * Clasifica cada fila contra el inventario existente del tenant: crear, actualizar o error.
 * Decodifica VIN (NHTSA) para completar datos faltantes en creaciones.
 */
export async function buildImportPlan(
  tenantId: string,
  rows: NormalizedImportRow[],
  options: { matchKey?: ImportMatchKey; decodeVins?: boolean } = {}
): Promise<ImportPlan> {
  const matchKey = options.matchKey || 'auto';
  const existing = await getVehicles(tenantId, { limit: 8000 });

  const byVin = new Map<string, Vehicle>();
  const byStock = new Map<string, Vehicle>();
  for (const v of existing) {
    const vin = (v.vin || v.specifications?.vin || '').toUpperCase().trim();
    if (vin) byVin.set(vin, v);
    const stock = (v.stockNumber || v.specifications?.stockNumber || '').trim();
    if (stock) byStock.set(stock.toLowerCase(), v);
  }

  const seenKeys = new Set<string>();
  const planRows: ImportPlanRow[] = [];

  for (const row of rows) {
    const vin = row.vin?.toUpperCase().trim();
    const stock = row.stockNumber?.trim();

    // VIN obligatorio en todas las filas (create y update) para sold-sync
    if (!vin) {
      planRows.push({
        row,
        action: 'error',
        error: 'El VIN es obligatorio',
      });
      continue;
    }
    if (!isValidVin(vin)) {
      planRows.push({ row, action: 'error', error: `VIN inválido: ${vin}` });
      continue;
    }

    // Clave de identificación de la fila
    let matched: Vehicle | undefined;
    let matchedBy: 'vin' | 'stockNumber' | undefined;

    if (matchKey === 'vin' || matchKey === 'auto') {
      matched = byVin.get(vin);
      if (matched) matchedBy = 'vin';
    }
    if (!matched && (matchKey === 'stockNumber' || matchKey === 'auto') && stock) {
      matched = byStock.get(stock.toLowerCase());
      if (matched) matchedBy = 'stockNumber';
    }

    const dedupeKey = `vin:${vin}`;
    if (seenKeys.has(dedupeKey)) {
      planRows.push({ row, action: 'error', error: `Fila duplicada en el archivo (${dedupeKey})` });
      continue;
    }
    seenKeys.add(dedupeKey);

    if (matched) {
      planRows.push({ row, action: 'update', vehicleId: matched.id, matchedBy });
      continue;
    }

    // Creación: intentar completar con VIN decode si faltan datos clave
    let vinDecoded: VinDecodeResult | undefined;
    if (options.decodeVins !== false && (!row.make || !row.model || !row.year)) {
      vinDecoded = (await decodeVin(vin)) ?? undefined;
    }

    const make = row.make || vinDecoded?.make;
    const model = row.model || vinDecoded?.model;
    const year = row.year || vinDecoded?.year;
    if (!make || !model || !year) {
      planRows.push({
        row,
        action: 'error',
        vinDecoded,
        error: 'Faltan datos obligatorios (marca, modelo o año) y no se pudieron obtener del VIN',
      });
      continue;
    }
    if (row.price == null || row.price <= 0) {
      planRows.push({ row, action: 'error', vinDecoded, error: 'Falta el precio del vehículo' });
      continue;
    }

    planRows.push({ row, action: 'create', vinDecoded });
  }

  return {
    rows: planRows,
    toCreate: planRows.filter((r) => r.action === 'create').length,
    toUpdate: planRows.filter((r) => r.action === 'update').length,
    errors: planRows.filter((r) => r.action === 'error').length,
  };
}

// ---------------------------------------------------------------------------
// Commit
// ---------------------------------------------------------------------------

export interface ImportCommitResult {
  created: number;
  updated: number;
  skipped: number;
  photosUploaded: number;
  errors: { rowIndex: number; error: string }[];
}

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

async function downloadAndUploadPhotos(
  tenantId: string,
  vehicleId: string,
  urls: string[]
): Promise<string[]> {
  const uploaded: string[] = [];
  for (const url of urls.slice(0, 10)) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) continue;
      const contentType = res.headers.get('content-type') || 'image/jpeg';
      if (!contentType.startsWith('image/')) continue;
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length === 0 || buffer.length > MAX_PHOTO_BYTES) continue;
      const filename = url.split('/').pop()?.split('?')[0] || `photo-${uploaded.length + 1}.jpg`;
      const publicUrl = await uploadVehicleImage(tenantId, vehicleId, buffer, filename, contentType);
      uploaded.push(publicUrl);
    } catch (error) {
      console.warn('bulk-import: no se pudo importar foto', url, error instanceof Error ? error.message : error);
    }
  }
  return uploaded;
}

function buildVehicleDataFromRow(planRow: ImportPlanRow, stockNumber: string): Record<string, any> {
  const { row, vinDecoded } = planRow;
  const make = row.make || vinDecoded?.make || '';
  const model = row.model || vinDecoded?.model || '';
  const year = row.year || vinDecoded?.year || 0;
  const bodyType = (row.bodyType || vinDecoded?.bodyType || '').toLowerCase() || undefined;

  const specifications: Record<string, any> = {
    make,
    model,
    year,
    stockNumber,
  };
  if (row.color) specifications.color = row.color;
  if (row.mileage != null) specifications.mileage = row.mileage;
  const transmission = row.transmission || vinDecoded?.transmission;
  if (transmission) specifications.transmission = transmission;
  const fuelType = row.fuelType || vinDecoded?.fuelType;
  if (fuelType) specifications.fuelType = fuelType;
  const engine = row.engine || vinDecoded?.engine;
  if (engine) specifications.engine = engine;
  const doors = row.doors ?? vinDecoded?.doors;
  if (doors != null) specifications.doors = doors;
  if (row.seats != null) specifications.seats = row.seats;
  if (row.vin) specifications.vin = row.vin;
  if (bodyType) specifications.bodyType = bodyType;

  const data: Record<string, any> = {
    make,
    model,
    year,
    price: row.price ?? 0,
    currency: 'USD',
    condition: row.condition || 'used',
    status: row.status || 'available',
    description: row.description || '',
    photos: [],
    specifications,
    stockNumber,
    publishedOnPublicPage: (row.status || 'available') === 'available',
  };
  if (row.mileage != null) data.mileage = row.mileage;
  if (row.vin) {
    data.vin = row.vin;
    data.vinNormalized = toVinNormalized(row.vin);
  }
  if (bodyType) data.bodyType = bodyType;
  if (row.quantity != null) {
    data.quantity = row.quantity;
    data.quantitySold = 0;
  }
  return data;
}

function buildUpdateFromRow(planRow: ImportPlanRow): Record<string, any> {
  const { row } = planRow;
  const updates: Record<string, any> = {};
  if (row.price != null && row.price > 0) updates.price = row.price;
  if (row.mileage != null) updates.mileage = row.mileage;
  if (row.condition) updates.condition = row.condition;
  if (row.status) updates.status = row.status;
  if (row.description) updates.description = row.description;
  if (row.quantity != null) updates.quantity = row.quantity;
  if (row.color) updates['specifications.color'] = row.color;
  if (row.vin) {
    updates.vin = row.vin;
    updates.vinNormalized = toVinNormalized(row.vin);
    updates['specifications.vin'] = row.vin;
  }
  return updates;
}

/**
 * Ejecuta el plan de importación: crea y actualiza vehículos en lotes.
 * `maxCreates` = cupo restante del plan de membresía (Infinity si ilimitado).
 */
export async function commitInventoryImport(
  tenantId: string,
  plan: ImportPlan,
  options: {
    maxCreates?: number;
    sellerId?: string;
    importPhotos?: boolean;
  } = {}
): Promise<ImportCommitResult> {
  const db = getDb();
  const result: ImportCommitResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    photosUploaded: 0,
    errors: [],
  };

  const maxCreates = options.maxCreates ?? Infinity;
  const vehiclesCol = db.collection('tenants').doc(tenantId).collection('vehicles');

  // Prefijo de stock del día + secuencia en memoria (una sola query)
  const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
  let stockSeq = 0;
  try {
    const snap = await vehiclesCol
      .where('stockNumber', '>=', `STK-${dateStr}-0000`)
      .where('stockNumber', '<=', `STK-${dateStr}-9999`)
      .get();
    for (const doc of snap.docs) {
      const sn = String(doc.data()?.stockNumber || '');
      const num = parseInt(sn.split('-')[2] || '0', 10);
      if (Number.isFinite(num) && num > stockSeq) stockSeq = num;
    }
  } catch {
    stockSeq = Number(Date.now().toString().slice(-4));
  }

  const ts = getFirestoreFieldValue().serverTimestamp();
  let batch = db.batch();
  let batchOps = 0;
  const flushBatch = async () => {
    if (batchOps > 0) {
      await batch.commit();
      batch = db.batch();
      batchOps = 0;
    }
  };

  const createdWithPhotos: { vehicleId: string; urls: string[] }[] = [];
  const statusChangedToUnavailable: string[] = [];

  for (const planRow of plan.rows) {
    try {
      if (planRow.action === 'error') {
        result.skipped++;
        continue;
      }

      if (planRow.action === 'update' && planRow.vehicleId) {
        const updates = buildUpdateFromRow(planRow);
        if (Object.keys(updates).length === 0) {
          result.skipped++;
          continue;
        }
        // Reposición de cantidad reactiva el vehículo
        if (updates.quantity != null && updates.quantity > 0 && !updates.status) {
          updates.status = 'available';
          updates.publishedOnPublicPage = true;
          updates.showSoldBadge = false;
          updates.showPublicSoldBadge = false;
          updates.deleted = false;
        }
        updates.updatedAt = ts;
        batch.update(vehiclesCol.doc(planRow.vehicleId), updates);
        batchOps++;
        result.updated++;
        if (updates.status === 'sold' || updates.status === 'hidden') {
          statusChangedToUnavailable.push(planRow.vehicleId);
        }
      } else if (planRow.action === 'create') {
        if (result.created >= maxCreates) {
          result.skipped++;
          result.errors.push({
            rowIndex: planRow.row.rowIndex,
            error: 'Límite de inventario del plan alcanzado — fila no creada',
          });
          continue;
        }
        stockSeq++;
        const stockNumber =
          planRow.row.stockNumber?.trim() || `STK-${dateStr}-${String(stockSeq).padStart(4, '0')}`;
        const docRef = vehiclesCol.doc();
        const data = buildVehicleDataFromRow(planRow, stockNumber);
        if (options.sellerId) {
          data.sellerId = options.sellerId;
          data.createdBy = options.sellerId;
        }
        batch.set(docRef, {
          tenantId,
          ...data,
          createdAt: ts,
          updatedAt: ts,
        });
        batchOps++;
        result.created++;
        if (options.importPhotos !== false && planRow.row.photoUrls?.length) {
          createdWithPhotos.push({ vehicleId: docRef.id, urls: planRow.row.photoUrls });
        }
      }

      if (batchOps >= 400) {
        await flushBatch();
      }
    } catch (error) {
      result.errors.push({
        rowIndex: planRow.row.rowIndex,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  await flushBatch();

  // Fotos por URL (después del commit de datos, para no bloquear los lotes)
  for (const { vehicleId, urls } of createdWithPhotos) {
    const uploaded = await downloadAndUploadPhotos(tenantId, vehicleId, urls);
    if (uploaded.length > 0) {
      await vehiclesCol.doc(vehicleId).update({ photos: uploaded, updatedAt: getFirestoreFieldValue().serverTimestamp() });
      result.photosUploaded += uploaded.length;
    }
  }

  // Propagar bajas a vendedores dealer-managed + sync VIN cross-tenant
  if (statusChangedToUnavailable.length > 0) {
    try {
      const { propagateListingActionToDealerSellers } = await import('./dealer-seller-propagation');
      const { syncSoldStatusByVin } = await import('./vin-sold-sync');
      for (const vehicleId of statusChangedToUnavailable) {
        const doc = await vehiclesCol.doc(vehicleId).get();
        const data = doc.data();
        if (!data) continue;
        const action = data.status === 'sold' ? 'sold' : 'hide';
        await propagateListingActionToDealerSellers(
          tenantId,
          {
            id: vehicleId,
            vin: data.vin || data.specifications?.vin,
            stockNumber: data.stockNumber || data.specifications?.stockNumber,
            make: data.make,
            model: data.model,
            year: data.year,
          },
          action
        );
        if (action === 'sold' && (data.vin || data.specifications?.vin)) {
          await syncSoldStatusByVin(
            tenantId,
            vehicleId,
            data.vin || data.specifications?.vin,
            { soldReason: 'bulk_import_sold' }
          );
        }
      }
    } catch (error) {
      console.warn('bulk-import: error propagando bajas / sync VIN:', error);
    }
  }

  // Refrescar caché público
  try {
    const { syncInventoryToWeb } = await import('./vehicles');
    await syncInventoryToWeb(tenantId);
  } catch (error) {
    console.warn('bulk-import: error sincronizando caché web:', error);
  }

  return result;
}

/** Plantilla CSV de ejemplo para descargar desde la UI. */
export function buildImportTemplateCsv(): string {
  const headers = [
    'VIN', 'Stock', 'Marca', 'Modelo', 'Año', 'Precio', 'Millas', 'Color',
    'Condicion', 'Cantidad', 'Transmision', 'Combustible', 'Descripcion', 'Fotos',
  ];
  const example = [
    '1HGCM82633A004352', 'STK-001', 'Honda', 'Accord', '2022', '24500', '31000', 'Negro',
    'usado', '1', 'automatic', 'gasoline', 'Un solo dueño',
    'https://ejemplo.com/foto1.jpg|https://ejemplo.com/foto2.jpg',
  ];
  return `${headers.join(',')}\n${example.join(',')}\n`;
}
