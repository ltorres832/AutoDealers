import type { TradeInVehicleProfile } from './finance-insurance';

function str(v: unknown, max: number): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t ? t.slice(0, max) : undefined;
}

function num(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    const n = Number(String(v).replace(/,/g, ''));
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function int(v: unknown, min?: number, max?: number): number | undefined {
  const n = num(v);
  if (n === undefined) return undefined;
  const i = Math.floor(n);
  if (min !== undefined && i < min) return undefined;
  if (max !== undefined && i > max) return undefined;
  return i;
}

const TITLE = new Set(['clean', 'salvage', 'rebuilt', 'unknown']);

/**
 * Normaliza el trade-in enviado desde formularios / API antes de guardarlo en un lead.
 */
export function sanitizeLeadTradeIn(raw: unknown): TradeInVehicleProfile | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const out: TradeInVehicleProfile = {};

  const make = str(o.make, 80);
  const model = str(o.model, 80);
  if (make) out.make = make;
  if (model) out.model = model;

  const year = int(o.year, 1900, 2105);
  if (year !== undefined) out.year = year;

  const trim = str(o.trim, 120);
  if (trim) out.trim = trim;

  const vin = str(o.vin, 32)?.toUpperCase();
  if (vin) out.vin = vin;

  const mileage = int(o.mileage, 0, 9_999_999);
  if (mileage !== undefined) out.mileage = mileage;

  const stockNumber = str(o.stockNumber, 80);
  if (stockNumber) out.stockNumber = stockNumber;

  const color = str(o.color, 60);
  if (color) out.color = color;

  const interiorColor = str(o.interiorColor, 60);
  if (interiorColor) out.interiorColor = interiorColor;

  const transmission = str(o.transmission, 80);
  if (transmission) out.transmission = transmission;

  const fuelType = str(o.fuelType, 60);
  if (fuelType) out.fuelType = fuelType;

  const engine = str(o.engine, 120);
  if (engine) out.engine = engine;

  const bodyType = str(o.bodyType, 60);
  if (bodyType) out.bodyType = bodyType;

  const condition = str(o.condition, 80);
  if (condition) out.condition = condition;

  const ev = num(o.estimatedValue);
  if (ev !== undefined && ev >= 0 && ev < 1e10) out.estimatedValue = Math.round(ev * 100) / 100;

  const pb = num(o.payoffBalance);
  if (pb !== undefined && pb >= 0 && pb < 1e10) out.payoffBalance = Math.round(pb * 100) / 100;

  const lienholder = str(o.lienholder, 200);
  if (lienholder) out.lienholder = lienholder;

  const ts = typeof o.titleStatus === 'string' ? o.titleStatus : '';
  if (TITLE.has(ts)) out.titleStatus = ts as TradeInVehicleProfile['titleStatus'];

  const accidentHistory = str(o.accidentHistory, 2000);
  if (accidentHistory) out.accidentHistory = accidentHistory;

  if (o.serviceRecords === true) out.serviceRecords = true;

  const notes = str(o.notes, 5000);
  if (notes) out.notes = notes;

  const linkedVehicleId = str(o.linkedVehicleId, 120);
  if (linkedVehicleId) out.linkedVehicleId = linkedVehicleId;

  if (Object.keys(out).length === 0) return undefined;
  return out;
}
