// Tipos de vehículos sincronizados entre formularios y página pública

import { VehicleBodyType } from './types';

export interface VehicleTypeOption {
  id: VehicleBodyType;
  name: string;
  description: string;
}

export const VEHICLE_TYPES: VehicleTypeOption[] = [
  {
    id: 'suv',
    name: 'SUV',
    description: 'Vehículos utilitarios deportivos',
  },
  {
    id: 'sedan',
    name: 'Sedán',
    description: 'Elegancia y comodidad',
  },
  {
    id: 'pickup-truck',
    name: 'Pickup Truck',
    description: 'Potencia y versatilidad',
  },
  {
    id: 'coupe',
    name: 'Cupé',
    description: 'Estilo deportivo',
  },
  {
    id: 'hatchback',
    name: 'Hatchback',
    description: 'Compacto y eficiente',
  },
  {
    id: 'wagon',
    name: 'Wagon',
    description: 'Espacio y funcionalidad',
  },
  {
    id: 'convertible',
    name: 'Convertible',
    description: 'Aire libre y estilo',
  },
  {
    id: 'minivan',
    name: 'Minivan',
    description: 'Ideal para familias',
  },
  {
    id: 'van',
    name: 'Van',
    description: 'Carga y transporte',
  },
  {
    id: 'luxury',
    name: 'Lujo',
    description: 'Experiencia premium',
  },
  {
    id: 'crossover',
    name: 'Crossover',
    description: 'Lo mejor de ambos mundos',
  },
  {
    id: 'electric',
    name: 'Eléctricos',
    description: 'Tecnología sostenible',
  },
  {
    id: 'hybrid',
    name: 'Híbridos',
    description: 'Eficiencia avanzada',
  },
  {
    id: 'plug-in-hybrid',
    name: 'Plug-in Híbrido',
    description: 'Flexibilidad energética',
  },
];

export const TRANSMISSION_OPTIONS = [
  { value: 'automatic', label: 'Automática' },
  { value: 'manual', label: 'Manual' },
  { value: 'cvt', label: 'CVT (Transmisión Variable Continua)' },
];

export const FUEL_TYPE_OPTIONS = [
  { value: 'gasoline', label: 'Gasolina' },
  { value: 'diesel', label: 'Diésel' },
  { value: 'electric', label: 'Eléctrico' },
  { value: 'hybrid', label: 'Híbrido' },
  { value: 'plug-in-hybrid', label: 'Plug-in Híbrido' },
];

export const DRIVE_TYPE_OPTIONS = [
  { value: 'fwd', label: 'Tracción Delantera (FWD)' },
  { value: 'rwd', label: 'Tracción Trasera (RWD)' },
  { value: 'awd', label: 'Tracción en las Cuatro Ruedas (AWD)' },
  { value: '4wd', label: 'Tracción en las Cuatro Ruedas (4WD)' },
];

