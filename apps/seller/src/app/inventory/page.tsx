'use client';

import { useState, useEffect } from 'react';
import { VEHICLE_TYPES, TRANSMISSION_OPTIONS, FUEL_TYPE_OPTIONS, DRIVE_TYPE_OPTIONS } from '@autodealers/inventory/client';
import AdvancedMarkAsSoldModal from '@/components/AdvancedMarkAsSoldModal';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  currency: string;
  status: string;
  photos: string[];
  publishedOnPublicPage?: boolean;
  sellerCommissionType?: 'percentage' | 'fixed';
  sellerCommissionRate?: number;
  sellerCommissionFixed?: number;
  insuranceCommissionType?: 'percentage' | 'fixed';
  insuranceCommissionRate?: number;
  insuranceCommissionFixed?: number;
  accessoriesCommissionType?: 'percentage' | 'fixed';
  accessoriesCommissionRate?: number;
  accessoriesCommissionFixed?: number;
  stockNumber?: string;
  specifications?: {
    stockNumber?: string;
    [key: string]: any;
  };
}

export default function InventoryPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMarkAsSoldModal, setShowMarkAsSoldModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
    fetchVehicles();
  }, []);

  async function fetchVehicles() {
    try {
      setLoading(true);
      const response = await fetch('/api/vehicles');
      const data = await response.json();
      const vehiclesData = data.vehicles || [];
      
      // Logging para debugging
      console.log('📋 Vehículos obtenidos:', vehiclesData.length);
      vehiclesData.forEach((vehicle: Vehicle) => {
        console.log(`🚗 ${vehicle.year} ${vehicle.make} ${vehicle.model}:`, {
          id: vehicle.id,
          photosCount: vehicle.photos?.length || 0,
          photos: vehicle.photos,
          publishedOnPublicPage: vehicle.publishedOnPublicPage,
        });
      });
      
      setVehicles(vehiclesData);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleMarkAsSold(vehicle: Vehicle) {
    setSelectedVehicle(vehicle);
    setShowMarkAsSoldModal(true);
  }

  async function togglePublishVehicle(vehicle: Vehicle) {
    try {
      const response = await fetch(`/api/vehicles/${vehicle.id}/publish`, {
        credentials: 'include', // IMPORTANTE: Incluir cookies de autenticación
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publishedOnPublicPage: !vehicle.publishedOnPublicPage,
        }),
      });

      if (response.ok) {
        fetchVehicles(); // Recargar vehículos
      } else {
        const error = await response.json();
        alert(error.error || 'Error al actualizar publicación');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar publicación');
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Inventario</h1>
          <p className="text-gray-600 mt-2">
            Gestiona los vehículos y marca como vendido cuando completes una venta
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700 font-medium"
        >
          Agregar Vehículo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.length === 0 ? (
          <div className="col-span-full text-center text-gray-500 py-8">
            No hay vehículos disponibles
          </div>
        ) : (
          vehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition"
            >
              {vehicle.photos && vehicle.photos.length > 0 && (
                <div className="relative h-48 bg-gray-200">
                  <img
                    src={vehicle.photos[0]}
                    alt={`${vehicle.make} ${vehicle.model}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-lg">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </h3>
                  {(vehicle.stockNumber || (vehicle as any).specifications?.stockNumber) && (
                    <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      #{(vehicle.stockNumber || (vehicle as any).specifications?.stockNumber)}
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold text-primary-600 mt-2">
                  {vehicle.currency} {vehicle.price.toLocaleString()}
                </p>
                <span
                  className={`inline-block mt-2 px-2 py-1 text-xs rounded ${
                    vehicle.status === 'available'
                      ? 'bg-green-100 text-green-800'
                      : vehicle.status === 'sold'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {vehicle.status === 'available' ? 'Disponible' : vehicle.status === 'sold' ? 'Vendido' : vehicle.status}
                </span>
                
                <div className="mt-4 space-y-2">
                  <button
                    onClick={() => {
                      setSelectedVehicle(vehicle);
                      setShowEditModal(true);
                    }}
                    className="w-full bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 font-medium"
                  >
                    ✏️ Editar Vehículo
                  </button>
                  {vehicle.status === 'available' && (
                    <>
                      <button
                        onClick={() => togglePublishVehicle(vehicle)}
                        className={`w-full px-4 py-2 rounded font-medium ${
                          vehicle.publishedOnPublicPage
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {vehicle.publishedOnPublicPage ? '🌐 Publicado en Página Pública' : '🌐 Publicar en Página Pública'}
                      </button>
                      <button
                        onClick={() => handleMarkAsSold(vehicle)}
                        className="w-full bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700 font-medium"
                      >
                        Marcar como Vendido
                      </button>
                    </>
                  )}
                </div>

              </div>
            </div>
          ))
        )}
      </div>

      {showCreateModal && (
        <CreateVehicleModal
          onClose={() => {
            setShowCreateModal(false);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchVehicles();
          }}
        />
      )}

      {showMarkAsSoldModal && selectedVehicle && (
        <AdvancedMarkAsSoldModal
          vehicle={selectedVehicle}
          onClose={() => {
            setShowMarkAsSoldModal(false);
            setSelectedVehicle(null);
          }}
          onSuccess={() => {
            setShowMarkAsSoldModal(false);
            setSelectedVehicle(null);
            fetchVehicles();
          }}
        />
      )}

      {showEditModal && selectedVehicle && (
        <EditVehicleModal
          vehicle={selectedVehicle}
          onClose={() => {
            setShowEditModal(false);
            setSelectedVehicle(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedVehicle(null);
            fetchVehicles();
          }}
        />
      )}
    </div>
  );
}

function MarkAsSoldModal({
  vehicle,
  onClose,
  onSuccess,
}: {
  vehicle: Vehicle;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    salePrice: vehicle.price.toString(),
    vehiclePrice: vehicle.price.toString(),
    bonus1: '0',
    bonus2: '0',
    rebate: '0',
    tablilla: '0',
    insurance: '0',
    accessories: '0',
    other: '0',
    leadId: '',
    paymentMethod: 'cash',
    notes: '',
    // Información del comprador
    buyerFullName: '',
    buyerPhone: '',
    buyerEmail: '',
    buyerStreet: '',
    buyerCity: '',
    buyerState: '',
    buyerZipCode: '',
    buyerCountry: '',
    buyerDriverLicense: '',
    buyerVehiclePlate: '',
    // Recordatorios
    enableReminders: false,
    selectedReminders: [] as string[],
  });
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    try {
      const response = await fetch('/api/leads');
      if (response.ok) {
        const data = await response.json();
        setLeads(data.leads || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  // Calcular total
  const total = parseFloat(formData.salePrice || '0') +
    parseFloat(formData.bonus1 || '0') +
    parseFloat(formData.bonus2 || '0') +
    parseFloat(formData.rebate || '0') +
    parseFloat(formData.tablilla || '0') +
    parseFloat(formData.insurance || '0') +
    parseFloat(formData.accessories || '0') +
    parseFloat(formData.other || '0');

  // Calcular comisiones
  const vehicleCommissionType = vehicle.sellerCommissionType || 'percentage';
  const vehicleCommissionRate = vehicle.sellerCommissionRate || 0;
  const vehicleCommissionFixed = vehicle.sellerCommissionFixed || 0;
  
  const insuranceCommissionType = vehicle.insuranceCommissionType || 'percentage';
  const insuranceCommissionRate = vehicle.insuranceCommissionRate || 0;
  const insuranceCommissionFixed = vehicle.insuranceCommissionFixed || 0;
  
  const accessoriesCommissionType = vehicle.accessoriesCommissionType || 'percentage';
  const accessoriesCommissionRate = vehicle.accessoriesCommissionRate || 0;
  const accessoriesCommissionFixed = vehicle.accessoriesCommissionFixed || 0;

  // Calcular comisión del vehículo
  const vehicleCommission = vehicleCommissionType === 'percentage' 
    ? (parseFloat(formData.salePrice || '0') * vehicleCommissionRate) / 100
    : vehicleCommissionFixed;

  // Calcular comisión del seguro
  const insuranceCommission = insuranceCommissionType === 'percentage'
    ? (parseFloat(formData.insurance || '0') * insuranceCommissionRate) / 100
    : (parseFloat(formData.insurance || '0') > 0 ? insuranceCommissionFixed : 0);

  // Calcular comisión de accesorios
  const accessoriesCommission = accessoriesCommissionType === 'percentage'
    ? (parseFloat(formData.accessories || '0') * accessoriesCommissionRate) / 100
    : (parseFloat(formData.accessories || '0') > 0 ? accessoriesCommissionFixed : 0);

  const totalCommission = vehicleCommission + insuranceCommission + accessoriesCommission;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Validar información del comprador
    if (!formData.buyerFullName || !formData.buyerPhone || !formData.buyerEmail) {
      alert('Por favor completa la información del comprador (nombre, teléfono y email son requeridos)');
      return;
    }

    // Validar recordatorios si están habilitados
    if (formData.enableReminders && formData.selectedReminders.length === 0) {
      alert('Si habilitas recordatorios, debes seleccionar al menos uno');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: vehicle.id,
          leadId: formData.leadId || undefined,
          salePrice: parseFloat(formData.salePrice),
          vehiclePrice: parseFloat(formData.vehiclePrice),
          bonus1: parseFloat(formData.bonus1) || 0,
          bonus2: parseFloat(formData.bonus2) || 0,
          rebate: parseFloat(formData.rebate) || 0,
          tablilla: parseFloat(formData.tablilla) || 0,
          insurance: parseFloat(formData.insurance) || 0,
          accessories: parseFloat(formData.accessories) || 0,
          other: parseFloat(formData.other) || 0,
          total: total,
          currency: vehicle.currency,
          vehicleCommissionRate: vehicleCommissionRate || undefined,
          vehicleCommission: vehicleCommission,
          insuranceCommissionRate: insuranceCommissionRate || undefined,
          insuranceCommission: insuranceCommission || 0,
          accessoriesCommissionRate: accessoriesCommissionRate || undefined,
          accessoriesCommission: accessoriesCommission || 0,
          totalCommission: totalCommission,
          paymentMethod: formData.paymentMethod,
          notes: formData.notes,
          // Información del comprador
          buyer: {
            fullName: formData.buyerFullName,
            phone: formData.buyerPhone,
            email: formData.buyerEmail,
            address: {
              street: formData.buyerStreet || undefined,
              city: formData.buyerCity || undefined,
              state: formData.buyerState || undefined,
              zipCode: formData.buyerZipCode || undefined,
              country: formData.buyerCountry || undefined,
            },
            driverLicenseNumber: formData.buyerDriverLicense || undefined,
            vehiclePlate: formData.buyerVehiclePlate || undefined,
          },
          // Recordatorios
          enableReminders: formData.enableReminders,
          selectedReminders: formData.enableReminders ? formData.selectedReminders : undefined,
        }),
      });

      if (response.ok) {
        alert('Vehículo marcado como vendido exitosamente');
        onSuccess();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al marcar como vendido');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al marcar como vendido');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">Marcar como Vendido</h2>
          <p className="text-sm text-gray-600 mt-1">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Información del Comprador */}
          <div className="border-t pt-4">
            <h3 className="font-bold mb-4">Información del Comprador</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Lead/Cliente Existente (opcional)</label>
              <select
                value={formData.leadId}
                onChange={(e) => {
                  const selectedLead = leads.find(l => l.id === e.target.value);
                  setFormData({
                    ...formData,
                    leadId: e.target.value,
                    buyerFullName: selectedLead?.contact?.name || formData.buyerFullName,
                    buyerPhone: selectedLead?.contact?.phone || formData.buyerPhone,
                    buyerEmail: selectedLead?.contact?.email || formData.buyerEmail,
                  });
                }}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Seleccionar lead existente...</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.contact?.name || 'Sin nombre'} - {lead.contact?.phone || ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">O completa los datos del comprador abajo</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Nombre Completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.buyerFullName}
                  onChange={(e) => setFormData({ ...formData, buyerFullName: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Teléfono <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.buyerPhone}
                  onChange={(e) => setFormData({ ...formData, buyerPhone: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.buyerEmail}
                  onChange={(e) => setFormData({ ...formData, buyerEmail: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Número de Licencia de Conducir</label>
                <input
                  type="text"
                  value={formData.buyerDriverLicense}
                  onChange={(e) => setFormData({ ...formData, buyerDriverLicense: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Tablilla del Vehículo</label>
                <input
                  type="text"
                  value={formData.buyerVehiclePlate}
                  onChange={(e) => setFormData({ ...formData, buyerVehiclePlate: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Dirección</label>
              <div className="grid grid-cols-2 gap-4 mb-2">
                <input
                  type="text"
                  placeholder="Calle"
                  value={formData.buyerStreet}
                  onChange={(e) => setFormData({ ...formData, buyerStreet: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Ciudad"
                  value={formData.buyerCity}
                  onChange={(e) => setFormData({ ...formData, buyerCity: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Estado/Provincia"
                  value={formData.buyerState}
                  onChange={(e) => setFormData({ ...formData, buyerState: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Código Postal"
                  value={formData.buyerZipCode}
                  onChange={(e) => setFormData({ ...formData, buyerZipCode: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="País"
                  value={formData.buyerCountry}
                  onChange={(e) => setFormData({ ...formData, buyerCountry: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
          </div>

          {/* Recordatorios */}
          <div className="border-t pt-4">
            <h3 className="font-bold mb-4">Recordatorios Post-Venta</h3>
            
            <div className="mb-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enableReminders}
                  onChange={(e) => setFormData({ ...formData, enableReminders: e.target.checked, selectedReminders: e.target.checked ? formData.selectedReminders : [] })}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="text-sm font-medium">Habilitar recordatorios para este cliente</span>
              </label>
            </div>

            {formData.enableReminders && (
              <div className="ml-6 space-y-2">
                <label className="block text-sm font-medium mb-2">Seleccionar Recordatorios:</label>
                {[
                  { value: 'oil_change_filter_3', label: 'Cambio de Aceite y Filtro (cada 3 meses)' },
                  { value: 'oil_change_filter_5', label: 'Cambio de Aceite y Filtro (cada 5 meses)' },
                  { value: 'oil_change_filter_6', label: 'Cambio de Aceite y Filtro (cada 6 meses)' },
                  { value: 'tire_rotation', label: 'Rotación de Neumáticos (cada 6 meses)' },
                ].map((reminder) => (
                  <label key={reminder.value} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.selectedReminders.includes(reminder.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            selectedReminders: [...formData.selectedReminders, reminder.value],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            selectedReminders: formData.selectedReminders.filter((r) => r !== reminder.value),
                          });
                        }
                      }}
                      className="w-4 h-4 text-primary-600"
                    />
                    <span className="text-sm">{reminder.label}</span>
                  </label>
                ))}
                {formData.selectedReminders.length === 0 && (
                  <p className="text-xs text-yellow-600">Selecciona al menos un recordatorio</p>
                )}
              </div>
            )}
          </div>

          {/* Precios y Desglose */}
          <div className="border-t pt-4">
            <h3 className="font-bold mb-4">Desglose de Venta</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Precio Base del Vehículo *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.vehiclePrice}
                  onChange={(e) => setFormData({ ...formData, vehiclePrice: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Precio Final de Venta *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.salePrice}
                  onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Bono 1</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.bonus1}
                  onChange={(e) => setFormData({ ...formData, bonus1: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Bono 2</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.bonus2}
                  onChange={(e) => setFormData({ ...formData, bonus2: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Rebate</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.rebate}
                  onChange={(e) => setFormData({ ...formData, rebate: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Tablilla</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.tablilla}
                  onChange={(e) => setFormData({ ...formData, tablilla: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Seguro</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.insurance}
                  onChange={(e) => setFormData({ ...formData, insurance: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Accesorios</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.accessories}
                  onChange={(e) => setFormData({ ...formData, accessories: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">Otros</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.other}
                  onChange={(e) => setFormData({ ...formData, other: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>

            {/* Total */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg">Total:</span>
                <span className="font-bold text-2xl text-primary-600">
                  {vehicle.currency} {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Cálculo de Comisiones */}
          <div className="border-t pt-4">
            <h3 className="font-bold mb-4">Cálculo de Comisión</h3>
            
            {vehicleCommissionRate > 0 && (
              <div className="mb-3 p-3 bg-blue-50 rounded">
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-600">Comisión Vehículo ({vehicleCommissionRate}%):</span>
                  <span className="font-medium">{vehicle.currency} {vehicleCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <p className="text-xs text-gray-500">
                  {vehicle.currency} {parseFloat(formData.salePrice || '0').toLocaleString()} × {vehicleCommissionRate}%
                </p>
              </div>
            )}

            {insuranceCommissionRate > 0 && parseFloat(formData.insurance || '0') > 0 && (
              <div className="mb-3 p-3 bg-green-50 rounded">
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-600">Comisión Seguro ({insuranceCommissionRate}%):</span>
                  <span className="font-medium">{vehicle.currency} {insuranceCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <p className="text-xs text-gray-500">
                  {vehicle.currency} {parseFloat(formData.insurance || '0').toLocaleString()} × {insuranceCommissionRate}%
                </p>
              </div>
            )}

            {accessoriesCommissionRate > 0 && parseFloat(formData.accessories || '0') > 0 && (
              <div className="mb-3 p-3 bg-purple-50 rounded">
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-600">Comisión Accesorios ({accessoriesCommissionRate}%):</span>
                  <span className="font-medium">{vehicle.currency} {accessoriesCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <p className="text-xs text-gray-500">
                  {vehicle.currency} {parseFloat(formData.accessories || '0').toLocaleString()} × {accessoriesCommissionRate}%
                </p>
              </div>
            )}

            {totalCommission > 0 && (
              <div className="mt-4 p-4 bg-primary-50 rounded-lg border-2 border-primary-200">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">Comisión Total:</span>
                  <span className="font-bold text-2xl text-primary-600">
                    {vehicle.currency} {totalCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}

            {totalCommission === 0 && (
              <p className="text-sm text-gray-500 italic">
                No hay comisiones configuradas para este vehículo. Configúralas al crear o editar el vehículo.
              </p>
            )}
          </div>

          {/* Método de pago y notas */}
          <div className="border-t pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Método de Pago</label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="cash">Efectivo</option>
                  <option value="credit_card">Tarjeta de Crédito</option>
                  <option value="debit_card">Tarjeta de Débito</option>
                  <option value="bank_transfer">Transferencia Bancaria</option>
                  <option value="financing">Financiamiento</option>
                  <option value="other">Otro</option>
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Notas</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full border rounded px-3 py-2"
                rows={3}
                placeholder="Notas adicionales sobre la venta..."
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Marcar como Vendido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateVehicleModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    bodyType: '' as string,
    year: new Date().getFullYear(),
    price: '',
    currency: 'USD',
    condition: 'used' as const,
    description: '',
    mileage: '',
    sellerCommissionType: 'percentage' as 'percentage' | 'fixed',
    sellerCommissionRate: '',
    sellerCommissionFixed: '',
    insuranceCommissionType: 'percentage' as 'percentage' | 'fixed',
    insuranceCommissionRate: '',
    insuranceCommissionFixed: '',
    accessoriesCommissionType: 'percentage' as 'percentage' | 'fixed',
    accessoriesCommissionRate: '',
    accessoriesCommissionFixed: '',
    // Features & Specs
    vin: '',
    stockNumber: '',
    transmission: '',
    fuelType: '',
    engine: '',
    exteriorColor: '',
    interiorColor: '',
    doors: '',
    seats: '',
    mpgCity: '',
    mpgHighway: '',
    driveType: '',
    hasAccidents: false,
    premiumFeatures: '',
    publishedOnPublicPage: true, // Por defecto publicar en página pública
  });
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  const [showSpecs, setShowSpecs] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // PRIMERO: Crear el vehículo sin fotos para obtener el vehicleId
      const createResponse = await fetch('/api/vehicles', {
        method: 'POST',
        credentials: 'include', // IMPORTANTE: Incluir cookies de autenticación
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          make: formData.make,
          model: formData.model,
          bodyType: formData.bodyType && formData.bodyType.trim() !== '' ? formData.bodyType.trim() : undefined,
          year: formData.year,
          price: parseFloat(formData.price),
          currency: formData.currency,
          condition: formData.condition,
          description: formData.description,
          mileage: formData.mileage ? parseInt(formData.mileage) : undefined,
          photos: [], // Inicialmente vacío
          videos: [], // Inicialmente vacío
          specifications: (() => {
            const specs: any = {};
            if (formData.vin) specs.vin = formData.vin;
            if (formData.stockNumber) specs.stockNumber = formData.stockNumber;
            if (formData.transmission) specs.transmission = formData.transmission;
            if (formData.fuelType) specs.fuelType = formData.fuelType;
            if (formData.engine) specs.engine = formData.engine;
            if (formData.driveType) specs.driveType = formData.driveType;
            if (formData.exteriorColor) {
              specs.exteriorColor = formData.exteriorColor;
              specs.color = formData.exteriorColor; // Compatibilidad con página pública
            }
            if (formData.interiorColor) specs.interiorColor = formData.interiorColor;
            if (formData.doors) specs.doors = parseInt(formData.doors);
            if (formData.seats) specs.seats = parseInt(formData.seats);
            if (formData.mpgCity) specs.mpgCity = parseInt(formData.mpgCity);
            if (formData.mpgHighway) specs.mpgHighway = parseInt(formData.mpgHighway);
            if (formData.hasAccidents !== undefined) specs.hasAccidents = formData.hasAccidents;
            if (formData.premiumFeatures) specs.premiumFeatures = formData.premiumFeatures.split(',').map((f: string) => f.trim()).filter((f: string) => f);
            return Object.keys(specs).length > 0 ? specs : {};
          })(),
          vin: formData.vin || undefined,
          stockNumber: formData.stockNumber || undefined,
          status: 'available',
          sellerCommissionType: formData.sellerCommissionType,
          sellerCommissionRate: formData.sellerCommissionType === 'percentage' && formData.sellerCommissionRate ? parseFloat(formData.sellerCommissionRate) : undefined,
          sellerCommissionFixed: formData.sellerCommissionType === 'fixed' && formData.sellerCommissionFixed ? parseFloat(formData.sellerCommissionFixed) : undefined,
          insuranceCommissionType: formData.insuranceCommissionType,
          insuranceCommissionRate: formData.insuranceCommissionType === 'percentage' && formData.insuranceCommissionRate ? parseFloat(formData.insuranceCommissionRate) : undefined,
          insuranceCommissionFixed: formData.insuranceCommissionType === 'fixed' && formData.insuranceCommissionFixed ? parseFloat(formData.insuranceCommissionFixed) : undefined,
          accessoriesCommissionType: formData.accessoriesCommissionType,
          accessoriesCommissionRate: formData.accessoriesCommissionType === 'percentage' && formData.accessoriesCommissionRate ? parseFloat(formData.accessoriesCommissionRate) : undefined,
          accessoriesCommissionFixed: formData.accessoriesCommissionType === 'fixed' && formData.accessoriesCommissionFixed ? parseFloat(formData.accessoriesCommissionFixed) : undefined,
          publishedOnPublicPage: formData.publishedOnPublicPage, // Publicar en página pública
        }),
      });

      console.log('📥 Respuesta de creación:', {
        ok: createResponse.ok,
        status: createResponse.status,
        statusText: createResponse.statusText,
      });

      if (!createResponse.ok) {
        const error = await createResponse.json();
        console.error('❌ Error al crear vehículo:', {
          status: createResponse.status,
          error: error,
        });
        throw new Error(error.error || error.details || 'Error al crear vehículo');
      }

      const createData = await createResponse.json();
      const vehicleId = createData.vehicle?.id;

      if (!vehicleId) {
        throw new Error('No se recibió el ID del vehículo creado');
      }

      // SEGUNDO: Subir fotos con el vehicleId real
      console.log('📤 Subiendo fotos...', { vehicleId, photoCount: photos.length });
      const photoUrls: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        console.log(`📷 Subiendo foto ${i + 1}/${photos.length}:`, photo.name);
        
        const formDataPhoto = new FormData();
        formDataPhoto.append('file', photo);
        formDataPhoto.append('type', 'vehicle');
        formDataPhoto.append('vehicleId', vehicleId);
        
        console.log(`📤 CLIENTE: Enviando foto ${i + 1} con:`, {
          vehicleId,
          vehicleIdType: typeof vehicleId,
          fileName: photo.name,
          fileSize: photo.size,
          formDataKeys: Array.from(formDataPhoto.keys()),
          vehicleIdInFormData: formDataPhoto.get('vehicleId'),
        });

        try {
          // Obtener token fresco de Firebase (fuerza renovación si está expirado)
          const { refreshAuthToken } = await import('@/lib/token-refresh');
          let token: string | null = null;
          
          try {
            // Intentar refrescar el token primero (fuerza renovación)
            token = await refreshAuthToken();
          } catch (error) {
            console.error('Error refrescando token:', error);
          }
          
          // Si no se pudo refrescar, intentar obtener uno nuevo
          if (!token) {
            const { auth } = await import('@/lib/firebase-client');
            if (auth?.currentUser) {
              try {
                token = await auth.currentUser.getIdToken(true); // true = forzar renovación
              } catch (error) {
                console.error('Error obteniendo token:', error);
              }
            }
          }
          
          if (!token) {
            console.error('❌ ERROR: No hay token de autenticación disponible!');
            alert('❌ Error: Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
            window.location.href = '/login';
            return;
          }
          
          console.log(`📤 Subiendo foto ${i + 1}/${photos.length}...`, {
            fileName: photo.name,
            fileSize: photo.size,
            fileType: photo.type,
            hasToken: !!token,
            tokenLength: token.length,
          });
          
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            credentials: 'include', // Incluir cookies
            headers: {
              'Authorization': `Bearer ${token}`, // Agregar token en header también
            },
            body: formDataPhoto,
          });
          
          console.log(`📥 Respuesta de upload foto ${i + 1}:`, {
            ok: uploadResponse.ok,
            status: uploadResponse.status,
            statusText: uploadResponse.statusText,
          });

          if (uploadResponse.ok) {
            let uploadData;
            try {
              const text = await uploadResponse.text();
              if (!text) {
                throw new Error('Respuesta vacía del servidor');
              }
              uploadData = JSON.parse(text);
            } catch (parseError: any) {
              console.error(`❌ Error parseando respuesta de foto ${i + 1}:`, parseError);
              alert(`Error procesando respuesta del servidor para foto ${i + 1}: ${parseError.message}`);
              continue;
            }
            
            if (uploadData.url) {
              console.log(`✅ Foto ${i + 1} subida:`, uploadData.url);
              photoUrls.push(uploadData.url);
            } else {
              console.error(`❌ Foto ${i + 1} subida pero sin URL:`, uploadData);
              alert(`Error: La foto ${i + 1} se subió pero no se recibió la URL. Revisa la consola del servidor.`);
            }
          } else {
            let errorData;
            try {
              const errorText = await uploadResponse.text();
              if (errorText) {
                errorData = JSON.parse(errorText);
              } else {
                errorData = { error: `Error ${uploadResponse.status}: ${uploadResponse.statusText}` };
              }
            } catch (parseError) {
              errorData = { error: `Error ${uploadResponse.status}: ${uploadResponse.statusText}` };
            }
            
            console.error(`❌ Error subiendo foto ${i + 1}:`, {
              status: uploadResponse.status,
              statusText: uploadResponse.statusText,
              error: errorData,
            });
            alert(`Error subiendo foto ${i + 1}: ${errorData.error || errorData.details || 'Error desconocido'}`);
          }
        } catch (error: any) {
          console.error(`❌ Error subiendo foto ${i + 1}:`, {
            error: error.message,
            stack: error.stack,
          });
          alert(`Error subiendo foto ${i + 1}: ${error.message}`);
        }
      }

      // SEGUNDO: Subir videos con el vehicleId real
      console.log('📤 Subiendo videos...', { vehicleId, videoCount: videos.length });
      const videoUrls: string[] = [];
      for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        console.log(`🎥 Subiendo video ${i + 1}/${videos.length}:`, video.name);
        
        const formDataVideo = new FormData();
        formDataVideo.append('file', video);
        formDataVideo.append('type', 'vehicle');
        formDataVideo.append('vehicleId', vehicleId);
        
        console.log(`📤 CLIENTE: Enviando video ${i + 1} con:`, {
          vehicleId,
          vehicleIdType: typeof vehicleId,
          fileName: video.name,
          fileSize: video.size,
          formDataKeys: Array.from(formDataVideo.keys()),
          vehicleIdInFormData: formDataVideo.get('vehicleId'),
        });

        try {
          // Obtener token fresco de Firebase (fuerza renovación si está expirado)
          const { refreshAuthToken } = await import('@/lib/token-refresh');
          let token: string | null = null;
          
          try {
            // Intentar refrescar el token primero (fuerza renovación)
            token = await refreshAuthToken();
          } catch (error) {
            console.error('Error refrescando token:', error);
          }
          
          // Si no se pudo refrescar, intentar obtener uno nuevo
          if (!token) {
            const { auth } = await import('@/lib/firebase-client');
            if (auth?.currentUser) {
              try {
                token = await auth.currentUser.getIdToken(true); // true = forzar renovación
              } catch (error) {
                console.error('Error obteniendo token:', error);
              }
            }
          }
          
          if (!token) {
            console.error('❌ ERROR: No hay token de autenticación disponible!');
            alert('❌ Error: Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
            window.location.href = '/login';
            setLoading(false);
            return;
          }
          
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            credentials: 'include', // Incluir cookies
            headers: {
              'Authorization': `Bearer ${token}`, // Agregar token en header también
            },
            body: formDataVideo,
          });

          if (uploadResponse.ok) {
            let uploadData;
            try {
              const text = await uploadResponse.text();
              if (!text) {
                throw new Error('Respuesta vacía del servidor');
              }
              uploadData = JSON.parse(text);
            } catch (parseError: any) {
              console.error(`❌ Error parseando respuesta de video ${i + 1}:`, parseError);
              alert(`Error procesando respuesta del servidor para video ${i + 1}: ${parseError.message}`);
              continue;
            }
            
            if (uploadData.url) {
              console.log(`✅ Video ${i + 1} subido:`, uploadData.url);
              videoUrls.push(uploadData.url);
            } else {
              console.error(`❌ Video ${i + 1} subido pero sin URL:`, uploadData);
              alert(`Error: El video ${i + 1} se subió pero no se recibió la URL. Revisa la consola del servidor.`);
            }
          } else {
            let errorData;
            try {
              const errorText = await uploadResponse.text();
              if (errorText) {
                errorData = JSON.parse(errorText);
              } else {
                errorData = { error: `Error ${uploadResponse.status}: ${uploadResponse.statusText}` };
              }
            } catch (parseError) {
              errorData = { error: `Error ${uploadResponse.status}: ${uploadResponse.statusText}` };
            }
            
            console.error(`❌ Error subiendo video ${i + 1}:`, {
              status: uploadResponse.status,
              statusText: uploadResponse.statusText,
              error: errorData,
            });
            alert(`Error subiendo video ${i + 1}: ${errorData.error || errorData.details || 'Error desconocido'}`);
          }
        } catch (error: any) {
          console.error(`❌ Error subiendo video ${i + 1}:`, {
            error: error.message,
            stack: error.stack,
          });
          alert(`Error subiendo video ${i + 1}: ${error.message}`);
        }
      }

      console.log('📊 URLs obtenidas:', { photoUrls, videoUrls });

      // TERCERO: Actualizar el vehículo con las URLs de las fotos y videos
      console.log('📊 Resumen de subida:', {
        vehicleId,
        photosSubidas: photoUrls.length,
        videosSubidos: videoUrls.length,
        photoUrls,
        videoUrls,
      });

      // SIEMPRE actualizar el vehículo, incluso si no hay fotos
      // Esto asegura que el vehículo se guarde correctamente
      console.log('🔄 Actualizando vehículo...', { 
        vehicleId, 
        photoUrlsCount: photoUrls.length, 
        videoUrlsCount: videoUrls.length,
        photoUrls,
        videoUrls,
      });
      
      try {
        // Obtener el stockNumber del vehículo creado para preservarlo
        const vehicleStockNumber = createData.vehicle?.stockNumber || createData.vehicle?.specifications?.stockNumber;
        
        const updateBody: any = {};
        
        // Solo incluir fotos/videos si hay alguna
        if (photoUrls.length > 0) {
          updateBody.photos = photoUrls;
        }
        if (videoUrls.length > 0) {
          updateBody.videos = videoUrls;
        }
        
        // Si no hay fotos ni videos, al menos asegurar que el array esté vacío
        if (photoUrls.length === 0 && videoUrls.length === 0) {
          updateBody.photos = [];
          updateBody.videos = [];
        }
        
        // CRÍTICO: Preservar el stockNumber si existe
        if (vehicleStockNumber) {
          updateBody.stockNumber = vehicleStockNumber;
          // También asegurar que esté en specifications
          updateBody.specifications = {
            ...(createData.vehicle?.specifications || {}),
            stockNumber: vehicleStockNumber,
          };
          console.log('📦 Preservando stockNumber en actualización:', vehicleStockNumber);
        }
        
        console.log('📤 Enviando actualización:', {
          ...updateBody,
          photoUrlsCount: photoUrls.length,
          videoUrlsCount: videoUrls.length,
          stockNumber: vehicleStockNumber,
        });
        
        // Obtener token fresco de Firebase (fuerza renovación si está expirado)
        const { refreshAuthToken } = await import('@/lib/token-refresh');
        let token: string | null = null;
        
        try {
          // Intentar refrescar el token primero (fuerza renovación)
          token = await refreshAuthToken();
        } catch (error) {
          console.error('Error refrescando token:', error);
        }
        
        // Si no se pudo refrescar, intentar obtener uno nuevo
        if (!token) {
          const { auth } = await import('@/lib/firebase-client');
          if (auth?.currentUser) {
            try {
              token = await auth.currentUser.getIdToken(true); // true = forzar renovación
            } catch (error) {
              console.error('Error obteniendo token:', error);
            }
          }
        }
        
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const updateResponse = await fetch(`/api/vehicles/${vehicleId}`, {
          method: 'PUT',
          credentials: 'include',
          headers,
          body: JSON.stringify(updateBody),
        });

        console.log('📥 Respuesta de actualización:', {
          ok: updateResponse.ok,
          status: updateResponse.status,
          statusText: updateResponse.statusText,
        });

        if (updateResponse.ok) {
          const updateData = await updateResponse.json();
          console.log('✅ Vehículo actualizado con fotos/videos:', {
            vehicle: updateData.vehicle,
            photosEnRespuesta: updateData.vehicle?.photos?.length || 0,
            videosEnRespuesta: updateData.vehicle?.videos?.length || 0,
            photosArray: updateData.vehicle?.photos,
          });
          
          // Verificar que las fotos se guardaron correctamente
          if (photoUrls.length > 0 && (!updateData.vehicle?.photos || updateData.vehicle.photos.length === 0)) {
            console.error('❌ ERROR CRÍTICO: Las fotos NO se guardaron!', {
              esperadas: photoUrls.length,
              recibidas: 0,
              photoUrlsEsperadas: photoUrls,
              vehicleData: updateData.vehicle,
            });
            alert(`❌ ERROR: Las fotos NO se guardaron en Firestore. Esperadas: ${photoUrls.length}, Guardadas: 0. Revisa la consola del servidor.`);
          } else if (photoUrls.length > 0 && updateData.vehicle.photos.length !== photoUrls.length) {
            console.error('❌ ERROR: Las fotos no coinciden!', {
              esperadas: photoUrls.length,
              recibidas: updateData.vehicle.photos.length,
              photoUrlsEsperadas: photoUrls,
              photoUrlsRecibidas: updateData.vehicle.photos,
            });
            alert(`⚠️ Advertencia: Solo se guardaron ${updateData.vehicle.photos.length} de ${photoUrls.length} fotos.`);
          } else if (photoUrls.length > 0) {
            console.log('✅ Todas las fotos se guardaron correctamente');
          }
        } else {
          const errorText = await updateResponse.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: errorText };
          }
          console.error('❌ Error al actualizar vehículo:', {
            status: updateResponse.status,
            statusText: updateResponse.statusText,
            error: errorData,
            bodySent: updateBody,
          });
          alert(`❌ Error al actualizar fotos/videos: ${errorData.error || errorData.details || 'Error desconocido'}. Revisa la consola del servidor.`);
        }
      } catch (error: any) {
        console.error('❌ Error al actualizar vehículo:', {
          error: error.message,
          stack: error.stack,
        });
        alert(`Error al actualizar fotos/videos del vehículo: ${error.message}`);
      }

      alert('Vehículo creado exitosamente');
      onSuccess();
    } catch (error: any) {
      console.error('Error:', error);
      alert(error.message || 'Error al crear vehículo');
    } finally {
      setLoading(false);
    }
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setPhotos(Array.from(e.target.files));
    }
  }

  function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setVideos(Array.from(e.target.files));
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Agregar Vehículo</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Información Básica */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4 pb-2 border-b">Información Básica</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">Marca *</label>
                <input
                  type="text"
                  value={formData.make}
                  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Modelo *</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Tipo de Vehículo *</label>
              <select
                value={formData.bodyType}
                onChange={(e) => {
                  const selectedValue = e.target.value;
                  console.log('🔄 Tipo de vehículo seleccionado:', {
                    value: selectedValue,
                    type: typeof selectedValue,
                    isEmpty: selectedValue === '',
                    trimmed: selectedValue.trim(),
                  });
                  setFormData({ ...formData, bodyType: selectedValue });
                }}
                className="w-full border rounded px-3 py-2"
                required
              >
                <option value="">Seleccionar tipo...</option>
                {VEHICLE_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name} - {type.description}
                  </option>
                ))}
              </select>
              {formData.bodyType && (
                <p className="text-xs text-gray-500 mt-1">
                  Seleccionado: <strong>{formData.bodyType}</strong>
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Año</label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Precio</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Moneda</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="MXN">MXN</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Condición</label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value as any })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="new">Nuevo</option>
                <option value="used">Usado</option>
                <option value="certified">Certificado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Kilometraje</label>
              <input
                type="number"
                value={formData.mileage}
                onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Descripción</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border rounded px-3 py-2"
              rows={4}
              required
            />
          </div>

          {/* Features & Specs */}
          <div className="mb-6 border-t pt-6">
            <div className="mb-4 pb-2 border-b">
              <h3 className="text-lg font-semibold">Features & Specs (Opcional)</h3>
              <p className="text-sm text-gray-600 mt-1">
                Información detallada y completa del vehículo para una mejor descripción y búsqueda
              </p>
            </div>
            
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      VIN
                    </label>
                    <input
                      type="text"
                      value={formData.vin}
                      onChange={(e) =>
                        setFormData({ ...formData, vin: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                      placeholder="Ej: 1FTEW1EP9MFA17916"
                      maxLength={17}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Número de Control (Stock #)
                      <span className="text-xs text-gray-500 block mt-1">
                        Se genera automáticamente si está vacío
                      </span>
                    </label>
                    <input
                      type="text"
                      value={formData.stockNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, stockNumber: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                      placeholder="Se generará automáticamente (ej: STK-20260103-0001)"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Transmisión
                    </label>
                    <select
                      value={formData.transmission}
                      onChange={(e) =>
                        setFormData({ ...formData, transmission: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="">Seleccionar...</option>
                      {TRANSMISSION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Tipo de Combustible
                    </label>
                    <select
                      value={formData.fuelType}
                      onChange={(e) =>
                        setFormData({ ...formData, fuelType: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="">Seleccionar...</option>
                      {FUEL_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Motor
                    </label>
                    <input
                      type="text"
                      value={formData.engine}
                      onChange={(e) =>
                        setFormData({ ...formData, engine: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                      placeholder="Ej: 1.6L turbocharged GDI 4-Cyl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Tracción
                    </label>
                    <select
                      value={formData.driveType}
                      onChange={(e) =>
                        setFormData({ ...formData, driveType: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="">Seleccionar...</option>
                      {DRIVE_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Color Exterior
                    </label>
                    <input
                      type="text"
                      value={formData.exteriorColor}
                      onChange={(e) =>
                        setFormData({ ...formData, exteriorColor: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                      placeholder="Ej: Terracotta Orange"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Color Interior
                    </label>
                    <input
                      type="text"
                      value={formData.interiorColor}
                      onChange={(e) =>
                        setFormData({ ...formData, interiorColor: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                      placeholder="Ej: Grey"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Puertas
                    </label>
                    <input
                      type="number"
                      min="2"
                      max="6"
                      value={formData.doors}
                      onChange={(e) =>
                        setFormData({ ...formData, doors: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                      placeholder="Ej: 4"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Asientos
                    </label>
                    <input
                      type="number"
                      min="2"
                      max="15"
                      value={formData.seats}
                      onChange={(e) =>
                        setFormData({ ...formData, seats: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                      placeholder="Ej: 5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      MPG Ciudad
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.mpgCity}
                      onChange={(e) =>
                        setFormData({ ...formData, mpgCity: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                      placeholder="Ej: 35"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      MPG Carretera
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.mpgHighway}
                      onChange={(e) =>
                        setFormData({ ...formData, mpgHighway: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                      placeholder="Ej: 34"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.hasAccidents}
                      onChange={(e) =>
                        setFormData({ ...formData, hasAccidents: e.target.checked })
                      }
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <span className="text-sm font-medium">
                      ¿Tiene accidentes o daños reportados?
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Características Premium
                    <span className="text-xs text-gray-500 block mt-1">
                      Separa múltiples características con comas
                    </span>
                  </label>
                  <textarea
                    value={formData.premiumFeatures}
                    onChange={(e) =>
                      setFormData({ ...formData, premiumFeatures: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                    rows={3}
                    placeholder="Ej: Heated seats, Head-up display, Bose® Premium Audio"
                  />
                </div>
            </div>
          </div>

          {/* Multimedia */}
          <div className="mb-6 border-t pt-6">
            <h3 className="text-lg font-semibold mb-4 pb-2 border-b">Multimedia</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Fotos *</label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handlePhotoChange}
                className="w-full border rounded px-3 py-2"
                required
              />
              {photos.length > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  {photos.length} foto(s) seleccionada(s)
                </p>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Videos (opcional)</label>
              <input
                type="file"
                multiple
                accept="video/*"
                onChange={handleVideoChange}
                className="w-full border rounded px-3 py-2"
              />
              {videos.length > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  {videos.length} video(s) seleccionado(s)
                </p>
              )}
            </div>
          </div>

          {/* Publicación en página pública */}
          <div className="border-t pt-4 mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.publishedOnPublicPage}
                onChange={(e) => setFormData({ ...formData, publishedOnPublicPage: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm font-medium">🌐 Publicar en Página Pública</span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              Si está marcado, el vehículo aparecerá inmediatamente en la página pública para que los clientes lo vean.
            </p>
          </div>

          {/* Comisiones (Opcional para vendedores) */}
          <div className="border-t pt-4 mb-4">
            <h3 className="font-bold mb-4">Comisiones del Vendedor (Opcional)</h3>
            
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium mb-2">Comisión Vehículo</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Tipo</label>
                  <select
                    value={formData.sellerCommissionType}
                    onChange={(e) => setFormData({ ...formData, sellerCommissionType: e.target.value as 'percentage' | 'fixed' })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="percentage">Porcentaje (%)</option>
                    <option value="fixed">Monto Fijo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    {formData.sellerCommissionType === 'percentage' ? 'Porcentaje (%)' : 'Monto Fijo'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.sellerCommissionType === 'percentage' ? formData.sellerCommissionRate : formData.sellerCommissionFixed}
                    onChange={(e) => setFormData({
                      ...formData,
                      [formData.sellerCommissionType === 'percentage' ? 'sellerCommissionRate' : 'sellerCommissionFixed']: e.target.value
                    })}
                    className="w-full border rounded px-3 py-2"
                    placeholder={formData.sellerCommissionType === 'percentage' ? 'Ej: 5' : 'Ej: 500'}
                  />
                </div>
              </div>
            </div>

            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium mb-2">Comisión Seguro (Opcional)</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Tipo</label>
                  <select
                    value={formData.insuranceCommissionType}
                    onChange={(e) => setFormData({ ...formData, insuranceCommissionType: e.target.value as 'percentage' | 'fixed' })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="percentage">Porcentaje (%)</option>
                    <option value="fixed">Monto Fijo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    {formData.insuranceCommissionType === 'percentage' ? 'Porcentaje (%)' : 'Monto Fijo'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.insuranceCommissionType === 'percentage' ? formData.insuranceCommissionRate : formData.insuranceCommissionFixed}
                    onChange={(e) => setFormData({
                      ...formData,
                      [formData.insuranceCommissionType === 'percentage' ? 'insuranceCommissionRate' : 'insuranceCommissionFixed']: e.target.value
                    })}
                    className="w-full border rounded px-3 py-2"
                    placeholder={formData.insuranceCommissionType === 'percentage' ? 'Ej: 10' : 'Ej: 200'}
                  />
                </div>
              </div>
            </div>

            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium mb-2">Comisión Accesorios (Opcional)</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Tipo</label>
                  <select
                    value={formData.accessoriesCommissionType}
                    onChange={(e) => setFormData({ ...formData, accessoriesCommissionType: e.target.value as 'percentage' | 'fixed' })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="percentage">Porcentaje (%)</option>
                    <option value="fixed">Monto Fijo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    {formData.accessoriesCommissionType === 'percentage' ? 'Porcentaje (%)' : 'Monto Fijo'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.accessoriesCommissionType === 'percentage' ? formData.accessoriesCommissionRate : formData.accessoriesCommissionFixed}
                    onChange={(e) => setFormData({
                      ...formData,
                      [formData.accessoriesCommissionType === 'percentage' ? 'accessoriesCommissionRate' : 'accessoriesCommissionFixed']: e.target.value
                    })}
                    className="w-full border rounded px-3 py-2"
                    placeholder={formData.accessoriesCommissionType === 'percentage' ? 'Ej: 15' : 'Ej: 300'}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditVehicleModal({ vehicle, onClose, onSuccess }: { vehicle: Vehicle; onClose: () => void; onSuccess: () => void }) {
  const specs = (vehicle as any).specifications || {};
  // Obtener stockNumber del nivel superior o de specifications
  const vehicleStockNumber = (vehicle as any).stockNumber || specs.stockNumber || '';
  
  const [formData, setFormData] = useState({
    make: vehicle.make,
    model: vehicle.model,
    bodyType: (vehicle as any).bodyType || '',
    year: vehicle.year,
    price: vehicle.price.toString(),
    currency: vehicle.currency,
    condition: vehicle.status === 'available' ? 'used' as const : 'used' as const,
    description: (vehicle as any).description || '',
    mileage: (vehicle as any).mileage?.toString() || '',
    sellerCommissionType: (vehicle.sellerCommissionType || 'percentage') as 'percentage' | 'fixed',
    sellerCommissionRate: vehicle.sellerCommissionRate?.toString() || '',
    sellerCommissionFixed: vehicle.sellerCommissionFixed?.toString() || '',
    insuranceCommissionType: (vehicle.insuranceCommissionType || 'percentage') as 'percentage' | 'fixed',
    insuranceCommissionRate: vehicle.insuranceCommissionRate?.toString() || '',
    insuranceCommissionFixed: vehicle.insuranceCommissionFixed?.toString() || '',
    accessoriesCommissionType: (vehicle.accessoriesCommissionType || 'percentage') as 'percentage' | 'fixed',
    accessoriesCommissionRate: vehicle.accessoriesCommissionRate?.toString() || '',
    accessoriesCommissionFixed: vehicle.accessoriesCommissionFixed?.toString() || '',
    // Features & Specs
    vin: specs.vin || '',
    stockNumber: vehicleStockNumber,
    transmission: specs.transmission || '',
    fuelType: specs.fuelType || '',
    engine: specs.engine || '',
    exteriorColor: specs.exteriorColor || specs.color || '',
    interiorColor: specs.interiorColor || '',
    doors: specs.doors?.toString() || '',
    seats: specs.seats?.toString() || '',
    mpgCity: specs.mpgCity?.toString() || '',
    mpgHighway: specs.mpgHighway?.toString() || '',
    driveType: specs.driveType || '',
    hasAccidents: specs.hasAccidents === true,
    premiumFeatures: specs.premiumFeatures ? (Array.isArray(specs.premiumFeatures) ? specs.premiumFeatures.join(', ') : specs.premiumFeatures) : '',
    publishedOnPublicPage: (vehicle as any).publishedOnPublicPage !== undefined ? (vehicle as any).publishedOnPublicPage : true,
  });
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>(vehicle.photos || []);
  const [existingVideos, setExistingVideos] = useState<string[]>((vehicle as any).videos || []);
  const [showSpecs, setShowSpecs] = useState(true); // Mostrar por defecto para que sea visible

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const photoUrls: string[] = [...existingPhotos];
      const videoUrls: string[] = [...existingVideos];

      // Obtener token fresco antes de subir fotos
      const { refreshAuthToken } = await import('@/lib/token-refresh');
      let token: string | null = null;
      
      try {
        token = await refreshAuthToken();
      } catch (error) {
        console.error('Error refrescando token:', error);
        const { auth } = await import('@/lib/firebase-client');
        if (auth?.currentUser) {
          try {
            token = await auth.currentUser.getIdToken(true); // true = forzar renovación
          } catch (e) {
            console.error('Error obteniendo token:', e);
          }
        }
      }

      // Subir nuevas fotos
      for (const photo of photos) {
        const formDataPhoto = new FormData();
        formDataPhoto.append('file', photo);
        formDataPhoto.append('type', 'vehicle');
        formDataPhoto.append('vehicleId', vehicle.id); // ✅ AGREGAR vehicleId
        
        console.log(`📤 CLIENTE (EDIT): Enviando foto con:`, {
          vehicleId: vehicle.id,
          vehicleIdType: typeof vehicle.id,
          fileName: photo.name,
          formDataKeys: Array.from(formDataPhoto.keys()),
          vehicleIdInFormData: formDataPhoto.get('vehicleId'),
        });

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          credentials: 'include', // IMPORTANTE: Incluir cookies de autenticación
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          body: formDataPhoto,
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          photoUrls.push(uploadData.url);
        }
      }

      // Subir nuevos videos
      for (const video of videos) {
        const formDataVideo = new FormData();
        formDataVideo.append('file', video);
        formDataVideo.append('type', 'vehicle');
        formDataVideo.append('vehicleId', vehicle.id); // ✅ AGREGAR vehicleId
        
        console.log(`📤 CLIENTE (EDIT): Enviando video con:`, {
          vehicleId: vehicle.id,
          vehicleIdType: typeof vehicle.id,
          fileName: video.name,
          formDataKeys: Array.from(formDataVideo.keys()),
          vehicleIdInFormData: formDataVideo.get('vehicleId'),
        });

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          credentials: 'include', // IMPORTANTE: Incluir cookies de autenticación
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          body: formDataVideo,
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          videoUrls.push(uploadData.url);
        }
      }

      // Obtener token fresco antes de actualizar
      if (!token) {
        try {
          token = await refreshAuthToken();
        } catch (error) {
          console.error('Error refrescando token:', error);
        }
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/vehicles/${vehicle.id}`, {
        credentials: 'include', // IMPORTANTE: Incluir cookies de autenticación
        method: 'PUT',
        headers,
        body: JSON.stringify({
          make: formData.make,
          model: formData.model,
          bodyType: formData.bodyType && formData.bodyType.trim() !== '' ? formData.bodyType.trim() : undefined,
          year: formData.year,
          price: parseFloat(formData.price),
          currency: formData.currency,
          condition: formData.condition,
          description: formData.description,
          mileage: formData.mileage ? parseInt(formData.mileage) : undefined,
          photos: photoUrls,
          videos: videoUrls,
          specifications: {
            vin: formData.vin || undefined,
            // NO enviar stockNumber - se generará automáticamente en el servidor
            transmission: formData.transmission || undefined,
            fuelType: formData.fuelType || undefined,
            engine: formData.engine || undefined,
            exteriorColor: formData.exteriorColor || undefined,
            color: formData.exteriorColor || undefined, // Compatibilidad con página pública
            interiorColor: formData.interiorColor || undefined,
            doors: formData.doors ? parseInt(formData.doors) : undefined,
            seats: formData.seats ? parseInt(formData.seats) : undefined,
            mpgCity: formData.mpgCity ? parseInt(formData.mpgCity) : undefined,
            mpgHighway: formData.mpgHighway ? parseInt(formData.mpgHighway) : undefined,
            driveType: formData.driveType || undefined,
            hasAccidents: formData.hasAccidents,
            premiumFeatures: formData.premiumFeatures ? formData.premiumFeatures.split(',').map((f: string) => f.trim()).filter((f: string) => f) : undefined,
          },
          publishedOnPublicPage: formData.publishedOnPublicPage,
          sellerCommissionType: formData.sellerCommissionType,
          sellerCommissionRate: formData.sellerCommissionType === 'percentage' && formData.sellerCommissionRate ? parseFloat(formData.sellerCommissionRate) : undefined,
          sellerCommissionFixed: formData.sellerCommissionType === 'fixed' && formData.sellerCommissionFixed ? parseFloat(formData.sellerCommissionFixed) : undefined,
          insuranceCommissionType: formData.insuranceCommissionType,
          insuranceCommissionRate: formData.insuranceCommissionType === 'percentage' && formData.insuranceCommissionRate ? parseFloat(formData.insuranceCommissionRate) : undefined,
          insuranceCommissionFixed: formData.insuranceCommissionType === 'fixed' && formData.insuranceCommissionFixed ? parseFloat(formData.insuranceCommissionFixed) : undefined,
          accessoriesCommissionType: formData.accessoriesCommissionType,
          accessoriesCommissionRate: formData.accessoriesCommissionType === 'percentage' && formData.accessoriesCommissionRate ? parseFloat(formData.accessoriesCommissionRate) : undefined,
          accessoriesCommissionFixed: formData.accessoriesCommissionType === 'fixed' && formData.accessoriesCommissionFixed ? parseFloat(formData.accessoriesCommissionFixed) : undefined,
        }),
      });

      if (response.ok) {
        alert('Vehículo actualizado exitosamente');
        onSuccess();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al actualizar vehículo');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar vehículo');
    } finally {
      setLoading(false);
    }
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setPhotos(Array.from(e.target.files));
    }
  }

  function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setVideos(Array.from(e.target.files));
    }
  }

  function removeExistingPhoto(index: number) {
    setExistingPhotos(existingPhotos.filter((_, i) => i !== index));
  }

  function removeExistingVideo(index: number) {
    setExistingVideos(existingVideos.filter((_, i) => i !== index));
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Editar Vehículo</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Información Básica */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4 pb-2 border-b">Información Básica</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">Marca *</label>
                <input
                  type="text"
                  value={formData.make}
                  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Modelo *</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Tipo de Vehículo *</label>
              <select
                value={formData.bodyType}
                onChange={(e) => {
                  const selectedValue = e.target.value;
                  console.log('🔄 Tipo de vehículo seleccionado:', {
                    value: selectedValue,
                    type: typeof selectedValue,
                    isEmpty: selectedValue === '',
                    trimmed: selectedValue.trim(),
                  });
                  setFormData({ ...formData, bodyType: selectedValue });
                }}
                className="w-full border rounded px-3 py-2"
                required
              >
                <option value="">Seleccionar tipo...</option>
                {VEHICLE_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name} - {type.description}
                  </option>
                ))}
              </select>
              {formData.bodyType && (
                <p className="text-xs text-gray-500 mt-1">
                  Seleccionado: <strong>{formData.bodyType}</strong>
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Año</label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Precio</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Moneda</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="MXN">MXN</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Condición</label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value as any })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="new">Nuevo</option>
                <option value="used">Usado</option>
                <option value="certified">Certificado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Kilometraje</label>
              <input
                type="number"
                value={formData.mileage}
                onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Descripción</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border rounded px-3 py-2"
              rows={4}
              required
            />
          </div>

          {/* Features & Specs */}
          <div className="mb-6 border-t pt-6">
            <div className="mb-4 pb-2 border-b">
              <h3 className="text-lg font-semibold">Features & Specs (Opcional)</h3>
              <p className="text-sm text-gray-600 mt-1">
                Información detallada y completa del vehículo para una mejor descripción y búsqueda
              </p>
            </div>
            
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      VIN
                    </label>
                    <input
                      type="text"
                      value={formData.vin}
                      onChange={(e) =>
                        setFormData({ ...formData, vin: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                      placeholder="Ej: 1FTEW1EP9MFA17916"
                      maxLength={17}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Número de Control (Stock #)
                      <span className="text-xs text-gray-500 block mt-1">
                        Se genera automáticamente si está vacío
                      </span>
                    </label>
                    <input
                      type="text"
                      value={formData.stockNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, stockNumber: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                      placeholder="Se generará automáticamente (ej: STK-20260103-0001)"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Transmisión
                    </label>
                    <select
                      value={formData.transmission}
                      onChange={(e) =>
                        setFormData({ ...formData, transmission: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="">Seleccionar...</option>
                      {TRANSMISSION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Tipo de Combustible
                    </label>
                    <select
                      value={formData.fuelType}
                      onChange={(e) =>
                        setFormData({ ...formData, fuelType: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="">Seleccionar...</option>
                      {FUEL_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Motor
                    </label>
                    <input
                      type="text"
                      value={formData.engine}
                      onChange={(e) =>
                        setFormData({ ...formData, engine: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                      placeholder="Ej: 1.6L turbocharged GDI 4-Cyl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Tracción
                    </label>
                    <select
                      value={formData.driveType}
                      onChange={(e) =>
                        setFormData({ ...formData, driveType: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="">Seleccionar...</option>
                      {DRIVE_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Color Exterior
                    </label>
                    <input
                      type="text"
                      value={formData.exteriorColor}
                      onChange={(e) =>
                        setFormData({ ...formData, exteriorColor: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                      placeholder="Ej: Terracotta Orange"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Color Interior
                    </label>
                    <input
                      type="text"
                      value={formData.interiorColor}
                      onChange={(e) =>
                        setFormData({ ...formData, interiorColor: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                      placeholder="Ej: Grey"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Puertas
                    </label>
                    <input
                      type="number"
                      min="2"
                      max="6"
                      value={formData.doors}
                      onChange={(e) =>
                        setFormData({ ...formData, doors: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                      placeholder="Ej: 4"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Asientos
                    </label>
                    <input
                      type="number"
                      min="2"
                      max="15"
                      value={formData.seats}
                      onChange={(e) =>
                        setFormData({ ...formData, seats: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                      placeholder="Ej: 5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      MPG Ciudad
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.mpgCity}
                      onChange={(e) =>
                        setFormData({ ...formData, mpgCity: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                      placeholder="Ej: 35"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      MPG Carretera
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.mpgHighway}
                      onChange={(e) =>
                        setFormData({ ...formData, mpgHighway: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                      placeholder="Ej: 34"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.hasAccidents}
                      onChange={(e) =>
                        setFormData({ ...formData, hasAccidents: e.target.checked })
                      }
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <span className="text-sm font-medium">
                      ¿Tiene accidentes o daños reportados?
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Características Premium
                    <span className="text-xs text-gray-500 block mt-1">
                      Separa múltiples características con comas
                    </span>
                  </label>
                  <textarea
                    value={formData.premiumFeatures}
                    onChange={(e) =>
                      setFormData({ ...formData, premiumFeatures: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                    rows={3}
                    placeholder="Ej: Heated seats, Head-up display, Bose® Premium Audio"
                  />
                </div>
            </div>
          </div>

          {/* Multimedia */}
          <div className="mb-6 border-t pt-6">
            <h3 className="text-lg font-semibold mb-4 pb-2 border-b">Multimedia</h3>
            <div>
              <label className="block text-sm font-medium mb-2">Fotos Existentes</label>
            {existingPhotos.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 mb-2">
                {existingPhotos.map((photo, index) => (
                  <div key={index} className="relative">
                    <img src={photo} alt={`Foto ${index + 1}`} className="w-full h-24 object-cover rounded" />
                    <button
                      type="button"
                      onClick={() => removeExistingPhoto(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-2">No hay fotos existentes</p>
            )}
            <label className="block text-sm font-medium mb-2 mt-4">Agregar Nuevas Fotos</label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handlePhotoChange}
              className="w-full border rounded px-3 py-2"
            />
            {photos.length > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                {photos.length} foto(s) nueva(s) seleccionada(s)
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Videos Existentes</label>
            {existingVideos.length > 0 ? (
              <div className="space-y-2 mb-2">
                {existingVideos.map((video, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span className="text-sm text-gray-700">Video {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeExistingVideo(index)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-2">No hay videos existentes</p>
            )}
            <label className="block text-sm font-medium mb-2 mt-4">Agregar Nuevos Videos</label>
            <input
              type="file"
              multiple
              accept="video/*"
              onChange={handleVideoChange}
              className="w-full border rounded px-3 py-2"
            />
            {videos.length > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                {videos.length} video(s) nuevo(s) seleccionado(s)
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Formatos soportados: MP4, MOV, AVI, WebM
            </p>
            </div>
          </div>

          {/* Publicación en página pública */}
          <div className="border-t pt-4 mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.publishedOnPublicPage}
                onChange={(e) =>
                  setFormData({ ...formData, publishedOnPublicPage: e.target.checked })
                }
                className="w-4 h-4 text-primary-600 rounded"
              />
              <span className="text-sm font-medium">
                Publicar en página pública
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              Si está marcado, el vehículo será visible en la página pública
            </p>
          </div>

          {/* Comisiones del Vendedor (Opcional) */}
          <div className="border-t pt-4">
            <h3 className="font-bold mb-4">Comisiones del Vendedor (Opcional)</h3>
            
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium mb-2">Comisión Vehículo</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Tipo</label>
                  <select
                    value={formData.sellerCommissionType}
                    onChange={(e) => setFormData({ ...formData, sellerCommissionType: e.target.value as 'percentage' | 'fixed' })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="percentage">Porcentaje (%)</option>
                    <option value="fixed">Monto Fijo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    {formData.sellerCommissionType === 'percentage' ? 'Porcentaje (%)' : 'Monto Fijo'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.sellerCommissionType === 'percentage' ? formData.sellerCommissionRate : formData.sellerCommissionFixed}
                    onChange={(e) => setFormData({
                      ...formData,
                      [formData.sellerCommissionType === 'percentage' ? 'sellerCommissionRate' : 'sellerCommissionFixed']: e.target.value
                    })}
                    className="w-full border rounded px-3 py-2"
                    placeholder={formData.sellerCommissionType === 'percentage' ? 'Ej: 5' : 'Ej: 500'}
                  />
                </div>
              </div>
            </div>

            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium mb-2">Comisión Seguro (Opcional)</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Tipo</label>
                  <select
                    value={formData.insuranceCommissionType}
                    onChange={(e) => setFormData({ ...formData, insuranceCommissionType: e.target.value as 'percentage' | 'fixed' })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="percentage">Porcentaje (%)</option>
                    <option value="fixed">Monto Fijo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    {formData.insuranceCommissionType === 'percentage' ? 'Porcentaje (%)' : 'Monto Fijo'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.insuranceCommissionType === 'percentage' ? formData.insuranceCommissionRate : formData.insuranceCommissionFixed}
                    onChange={(e) => setFormData({
                      ...formData,
                      [formData.insuranceCommissionType === 'percentage' ? 'insuranceCommissionRate' : 'insuranceCommissionFixed']: e.target.value
                    })}
                    className="w-full border rounded px-3 py-2"
                    placeholder={formData.insuranceCommissionType === 'percentage' ? 'Ej: 10' : 'Ej: 200'}
                  />
                </div>
              </div>
            </div>

            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium mb-2">Comisión Accesorios (Opcional)</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Tipo</label>
                  <select
                    value={formData.accessoriesCommissionType}
                    onChange={(e) => setFormData({ ...formData, accessoriesCommissionType: e.target.value as 'percentage' | 'fixed' })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="percentage">Porcentaje (%)</option>
                    <option value="fixed">Monto Fijo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    {formData.accessoriesCommissionType === 'percentage' ? 'Porcentaje (%)' : 'Monto Fijo'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.accessoriesCommissionType === 'percentage' ? formData.accessoriesCommissionRate : formData.accessoriesCommissionFixed}
                    onChange={(e) => setFormData({
                      ...formData,
                      [formData.accessoriesCommissionType === 'percentage' ? 'accessoriesCommissionRate' : 'accessoriesCommissionFixed']: e.target.value
                    })}
                    className="w-full border rounded px-3 py-2"
                    placeholder={formData.accessoriesCommissionType === 'percentage' ? 'Ej: 15' : 'Ej: 300'}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

