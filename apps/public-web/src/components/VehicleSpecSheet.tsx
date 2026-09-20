import { getPublicVehicleConditionLabel } from '@/lib/vehicle-condition-label';

type Specs = {
  transmission?: string;
  fuelType?: string;
  engine?: string;
  color?: string;
  interiorColor?: string;
  exteriorColor?: string;
  doors?: number;
  seats?: number;
  vin?: string;
  stockNumber?: string;
  mpgCity?: number;
  mpgHighway?: number;
  drivetrain?: string;
  driveType?: string;
  features?: string[];
  hasAccidents?: boolean;
};

export type VehicleSpecSource = {
  mileage?: number;
  condition?: string;
  stockNumber?: string;
  specifications?: Specs;
};

const SPEC_LABELS: Record<string, string> = {
  automatic: 'Automática',
  manual: 'Manual',
  cvt: 'CVT',
  gasoline: 'Gasolina',
  diesel: 'Diésel',
  electric: 'Eléctrico',
  hybrid: 'Híbrido',
  'plug-in-hybrid': 'Híbrido enchufable',
  awd: 'AWD',
  fwd: 'Delantera',
  rwd: 'Trasera',
  '4wd': '4x4',
};

function formatSpecValue(value: string): string {
  const key = value.trim().toLowerCase();
  return SPEC_LABELS[key] || value.charAt(0).toUpperCase() + value.slice(1);
}

function rowsFromVehicle(vehicle: VehicleSpecSource): { label: string; value: string }[] {
  const specs = vehicle.specifications || {};
  const rows: { label: string; value: string }[] = [];
  const condition = getPublicVehicleConditionLabel(vehicle);

  if (vehicle.mileage != null) {
    rows.push({ label: 'Millaje', value: `${Number(vehicle.mileage).toLocaleString()} millas` });
  }
  if (condition) rows.push({ label: 'Condición', value: condition });
  if (specs.transmission) rows.push({ label: 'Transmisión', value: formatSpecValue(specs.transmission) });
  if (specs.fuelType) rows.push({ label: 'Combustible', value: formatSpecValue(specs.fuelType) });
  if (specs.engine) rows.push({ label: 'Motor', value: specs.engine });
  const exterior = specs.exteriorColor || specs.color;
  if (exterior) rows.push({ label: 'Color exterior', value: exterior });
  if (specs.interiorColor) rows.push({ label: 'Color interior', value: specs.interiorColor });
  if (specs.drivetrain || specs.driveType) {
    rows.push({ label: 'Tracción', value: formatSpecValue(String(specs.drivetrain || specs.driveType)) });
  }
  if (specs.doors) rows.push({ label: 'Puertas', value: String(specs.doors) });
  if (specs.seats) rows.push({ label: 'Asientos', value: String(specs.seats) });
  if (specs.mpgCity || specs.mpgHighway) {
    rows.push({
      label: 'Consumo',
      value: `${specs.mpgCity ?? '—'} ciudad / ${specs.mpgHighway ?? '—'} carretera MPG`,
    });
  }
  if (specs.hasAccidents === false) {
    rows.push({ label: 'Historial', value: 'Sin accidentes reportados' });
  }
  return rows;
}

export default function VehicleSpecSheet({
  vehicle,
  compact = false,
  hideStock = false,
}: {
  vehicle: VehicleSpecSource;
  compact?: boolean;
  hideStock?: boolean;
}) {
  const rows = rowsFromVehicle(vehicle);
  const specs = vehicle.specifications || {};
  const features = Array.isArray(specs.features) ? specs.features.filter(Boolean) : [];
  const vin = specs.vin;
  const stock = hideStock ? undefined : vehicle.stockNumber || specs.stockNumber;
  const mid = Math.ceil(rows.length / 2);
  const left = rows.slice(0, mid);
  const right = rows.slice(mid);

  if (rows.length === 0 && features.length === 0 && !vin && !stock) return null;

  return (
    <section>
      <h2
        className={`font-semibold tracking-tight text-neutral-900 ${
          compact ? 'mb-3 text-lg' : 'mb-5 text-xl sm:text-2xl'
        }`}
      >
        Ficha técnica
      </h2>

      {rows.length > 0 ? (
        <div className="grid grid-cols-1 gap-x-12 md:grid-cols-2">
          {[left, right].map((column, colIdx) => (
            <dl key={colIdx} className="divide-y divide-neutral-200 border-y border-neutral-200">
              {column.map((row) => (
                <div key={row.label} className="grid grid-cols-[1fr_auto] gap-6 py-3">
                  <dt className="text-sm text-neutral-500">{row.label}</dt>
                  <dd className="text-right text-sm font-medium text-neutral-900">{row.value}</dd>
                </div>
              ))}
            </dl>
          ))}
        </div>
      ) : null}

      {features.length > 0 ? (
        <div className={rows.length > 0 ? 'mt-8' : ''}>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">
            Equipamiento
          </h3>
          <ul className="grid grid-cols-1 gap-x-10 gap-y-2 sm:grid-cols-2">
            {features.map((feature) => (
              <li key={feature} className="text-sm leading-6 text-neutral-800">
                {feature}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {(vin || stock) && (
        <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 border-t border-neutral-200 pt-4 text-xs text-neutral-500">
          {vin ? (
            <p>
              VIN <span className="ml-2 font-mono text-neutral-800">{vin}</span>
            </p>
          ) : null}
          {stock ? (
            <p>
              N.º de control <span className="ml-2 font-mono text-neutral-800">#{stock}</span>
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
