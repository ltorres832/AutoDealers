'use client';

// Modal avanzado para marcar vehículo como vendido con todas las funcionalidades mejoradas

import { useState, useEffect, useRef, useCallback } from 'react';
import ContractUploadManager from '@/components/ContractUploadManager';
import ContractSigningModal from '@/components/ContractSigningModal';
import ContractTemplateSelector from '@/components/ContractTemplateSelector';
import CustomerFileManager from '@/components/CustomerFileManager';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  currency: string;
  sellerCommissionType?: 'percentage' | 'fixed';
  sellerCommissionRate?: number;
  sellerCommissionFixed?: number;
  insuranceCommissionType?: 'percentage' | 'fixed';
  insuranceCommissionRate?: number;
  insuranceCommissionFixed?: number;
  accessoriesCommissionType?: 'percentage' | 'fixed';
  accessoriesCommissionRate?: number;
  accessoriesCommissionFixed?: number;
}

interface Lead {
  id: string;
  contact: {
    name: string;
    phone?: string;
    email?: string;
  };
}

interface FormData {
  // Información del comprador
  leadId: string;
  buyerFullName: string;
  buyerPhone: string;
  buyerEmail: string;
  buyerDateOfBirth: string;
  buyerSSN: string;
  buyerDriverLicense: string;
  buyerVehiclePlate: string;
  buyerStreet: string;
  buyerCity: string;
  buyerState: string;
  buyerZipCode: string;
  buyerCountry: string;
  
  // Desglose de venta
  vehiclePrice: string;
  salePrice: string;
  bonus1: string;
  bonus2: string;
  rebate: string;
  tablilla: string;
  insurance: string;
  accessories: string;
  warranty: string;
  servicePackage: string;
  other: string;
  
  // Método de pago
  paymentMethod: 'cash' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'financing' | 'lease' | 'other';
  financingDetails?: {
    lender?: string;
    downPayment?: number;
    loanTerm?: number;
    interestRate?: number;
    monthlyPayment?: number;
  };
  
  // Recordatorios post-venta
  enableReminders: boolean;
  selectedReminders: string[];
  customReminders: Array<{ type: string; date: string; notes: string }>;
  
  // Documentos
  documents: Array<{ type: string; name: string; url: string }>;
  
  // Notas y seguimiento
  notes: string;
  internalNotes: string;
  followUpDate: string;
  
  // Integración F&I
  hasFIRequest: boolean;
  fiRequestId?: string;
  
  // Trade-in
  hasTradeIn: boolean;
  tradeInDetails?: {
    make: string;
    model: string;
    year: string;
    mileage: string;
    condition: 'excellent' | 'good' | 'fair' | 'poor';
    value: string;
  };
}

interface AdvancedMarkAsSoldModalProps {
  vehicle: Vehicle;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdvancedMarkAsSoldModal({
  vehicle,
  onClose,
  onSuccess,
}: AdvancedMarkAsSoldModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    leadId: '',
    buyerFullName: '',
    buyerPhone: '',
    buyerEmail: '',
    buyerDateOfBirth: '',
    buyerSSN: '',
    buyerDriverLicense: '',
    buyerVehiclePlate: '',
    buyerStreet: '',
    buyerCity: '',
    buyerState: '',
    buyerZipCode: '',
    buyerCountry: 'US',
    vehiclePrice: vehicle.price.toString(),
    salePrice: vehicle.price.toString(),
    bonus1: '0',
    bonus2: '0',
    rebate: '0',
    tablilla: '0',
    insurance: '0',
    accessories: '0',
    warranty: '0',
    servicePackage: '0',
    other: '0',
    paymentMethod: 'cash',
    enableReminders: true,
    selectedReminders: [],
    customReminders: [],
    documents: [],
    notes: '',
    internalNotes: '',
    followUpDate: '',
    hasFIRequest: false,
    hasTradeIn: false,
  });

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  
  // Estado para contratos
  const [contracts, setContracts] = useState<any[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [showContractUpload, setShowContractUpload] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedContractForSign, setSelectedContractForSign] = useState<any>(null);
  const [showSigningModal, setShowSigningModal] = useState(false);

  const totalSteps = 6; // Agregado paso de contratos

  useEffect(() => {
    fetchLeads();
  }, []);

  // Cargar contratos cuando hay un leadId o saleId
  useEffect(() => {
    if (formData.leadId) {
      fetchContracts();
    }
  }, [formData.leadId]);

  // Auto-guardado cada 30 segundos
  useEffect(() => {
    autoSaveTimer.current = setTimeout(() => {
      handleAutoSave();
    }, 30000);
    
    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [formData]);

  const fetchLeads = async () => {
    try {
      const response = await fetch('/api/leads');
      if (response.ok) {
        const data = await response.json();
        setLeads(data.leads || []);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  };

  const handleAutoSave = async () => {
    // Guardar borrador en localStorage
    localStorage.setItem(`sale_draft_${vehicle.id}`, JSON.stringify(formData));
  };

  const loadDraft = () => {
    const draft = localStorage.getItem(`sale_draft_${vehicle.id}`);
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setFormData(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Error loading draft:', error);
      }
    }
  };

  useEffect(() => {
    loadDraft();
  }, []);

  const filteredLeads = leads.filter(lead =>
    lead.contact.name.toLowerCase().includes(leadSearchQuery.toLowerCase()) ||
    lead.contact.phone?.includes(leadSearchQuery) ||
    lead.contact.email?.toLowerCase().includes(leadSearchQuery.toLowerCase())
  );

  const fetchContracts = async () => {
    if (!formData.leadId) return;
    
    setLoadingContracts(true);
    try {
      const response = await fetch(`/api/contracts?leadId=${formData.leadId}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setContracts(data.contracts || []);
      }
    } catch (error) {
      console.error('Error fetching contracts:', error);
    } finally {
      setLoadingContracts(false);
    }
  };

  const handleContractUploaded = async (contractId: string) => {
    await fetchContracts();
    setShowContractUpload(false);
  };

  const handleTemplateSelected = async (templateId: string, fieldValues: Record<string, any>) => {
    try {
      const response = await fetch('/api/contracts/generate-from-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          templateId,
          fieldValues,
          saleId: undefined, // Se asignará después de crear la venta
          leadId: formData.leadId,
          vehicleId: vehicle.id,
        }),
      });

      if (response.ok) {
        await fetchContracts();
        setShowTemplateSelector(false);
        alert('Contrato generado exitosamente');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Error al generar contrato');
      }
    } catch (error: any) {
      console.error('Error generating contract:', error);
      alert(error.message || 'Error al generar contrato');
      throw error;
    }
  };

  const handleSignInPerson = (contract: any) => {
    setSelectedContractForSign(contract);
    setShowSigningModal(true);
  };

  const handleContractSigned = async () => {
    await fetchContracts();
    setShowSigningModal(false);
    setSelectedContractForSign(null);
  };

  const handleSendForSignature = async (contract: any) => {
    const email = formData.buyerEmail || prompt('Email del firmante:');
    const name = formData.buyerFullName || prompt('Nombre del firmante:');
    
    if (!email || !name) {
      alert('Se requiere email y nombre del firmante');
      return;
    }

    try {
      const response = await fetch(`/api/contracts/${contract.id}/send-for-signature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          signerEmail: email,
          signerName: name,
          signerPhone: formData.buyerPhone,
        }),
      });

      if (response.ok) {
        alert('Contrato enviado para firma. El cliente recibirá un email con el enlace.');
        await fetchContracts();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al enviar contrato');
      }
    } catch (error) {
      console.error('Error sending contract:', error);
      alert('Error al enviar contrato');
    }
  };

  const handleLeadSelect = (lead: Lead) => {
    setFormData(prev => ({
      ...prev,
      leadId: lead.id,
      buyerFullName: lead.contact.name,
      buyerPhone: lead.contact.phone || '',
      buyerEmail: lead.contact.email || '',
    }));
    setShowLeadDropdown(false);
    setLeadSearchQuery('');
  };

  // Calcular totales
  const calculateSubtotal = () => {
    return parseFloat(formData.salePrice || '0') +
      parseFloat(formData.bonus1 || '0') +
      parseFloat(formData.bonus2 || '0') +
      parseFloat(formData.rebate || '0') +
      parseFloat(formData.tablilla || '0') +
      parseFloat(formData.insurance || '0') +
      parseFloat(formData.accessories || '0') +
      parseFloat(formData.warranty || '0') +
      parseFloat(formData.servicePackage || '0') +
      parseFloat(formData.other || '0');
  };

  const subtotal = calculateSubtotal();
  const tradeInValue = formData.hasTradeIn ? parseFloat(formData.tradeInDetails?.value || '0') : 0;
  const total = subtotal - tradeInValue;

  // Calcular comisiones
  const calculateCommissions = () => {
    const vehicleCommissionType = vehicle.sellerCommissionType || 'percentage';
    const vehicleCommissionRate = vehicle.sellerCommissionRate || 0;
    const vehicleCommissionFixed = vehicle.sellerCommissionFixed || 0;
    
    const insuranceCommissionType = vehicle.insuranceCommissionType || 'percentage';
    const insuranceCommissionRate = vehicle.insuranceCommissionRate || 0;
    const insuranceCommissionFixed = vehicle.insuranceCommissionFixed || 0;
    
    const accessoriesCommissionType = vehicle.accessoriesCommissionType || 'percentage';
    const accessoriesCommissionRate = vehicle.accessoriesCommissionRate || 0;
    const accessoriesCommissionFixed = vehicle.accessoriesCommissionFixed || 0;

    const vehicleCommission = vehicleCommissionType === 'percentage' 
      ? (parseFloat(formData.salePrice || '0') * vehicleCommissionRate) / 100
      : vehicleCommissionFixed;

    const insuranceCommission = insuranceCommissionType === 'percentage'
      ? (parseFloat(formData.insurance || '0') * insuranceCommissionRate) / 100
      : (parseFloat(formData.insurance || '0') > 0 ? insuranceCommissionFixed : 0);

    const accessoriesCommission = accessoriesCommissionType === 'percentage'
      ? (parseFloat(formData.accessories || '0') * accessoriesCommissionRate) / 100
      : (parseFloat(formData.accessories || '0') > 0 ? accessoriesCommissionFixed : 0);

    const warrantyCommission = parseFloat(formData.warranty || '0') * 0.1; // 10% por defecto
    const servicePackageCommission = parseFloat(formData.servicePackage || '0') * 0.1; // 10% por defecto

    const totalCommission = vehicleCommission + insuranceCommission + accessoriesCommission + warrantyCommission + servicePackageCommission;

    return {
      vehicleCommission,
      insuranceCommission,
      accessoriesCommission,
      warrantyCommission,
      servicePackageCommission,
      totalCommission,
    };
  };

  const commissions = calculateCommissions();

  const validateStep = (step: number): boolean => {
    const stepErrors: Record<string, string> = {};
    
    switch (step) {
      case 1:
        if (!formData.buyerFullName) stepErrors.buyerFullName = 'Requerido';
        if (!formData.buyerPhone) stepErrors.buyerPhone = 'Requerido';
        if (!formData.buyerEmail) stepErrors.buyerEmail = 'Requerido';
        if (formData.buyerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.buyerEmail)) {
          stepErrors.buyerEmail = 'Email inválido';
        }
        break;
      case 2:
        if (!formData.vehiclePrice || parseFloat(formData.vehiclePrice) <= 0) {
          stepErrors.vehiclePrice = 'Debe ser mayor a 0';
        }
        if (!formData.salePrice || parseFloat(formData.salePrice) <= 0) {
          stepErrors.salePrice = 'Debe ser mayor a 0';
        }
        break;
    }
    
    setErrors(prev => ({ ...prev, ...stepErrors }));
    return Object.keys(stepErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
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
          warranty: parseFloat(formData.warranty) || 0,
          servicePackage: parseFloat(formData.servicePackage) || 0,
          other: parseFloat(formData.other) || 0,
          tradeInValue: tradeInValue,
          total: total,
          currency: vehicle.currency,
          vehicleCommission: commissions.vehicleCommission,
          insuranceCommission: commissions.insuranceCommission,
          accessoriesCommission: commissions.accessoriesCommission,
          warrantyCommission: commissions.warrantyCommission,
          servicePackageCommission: commissions.servicePackageCommission,
          totalCommission: commissions.totalCommission,
          paymentMethod: formData.paymentMethod,
          financingDetails: formData.paymentMethod === 'financing' ? formData.financingDetails : undefined,
          notes: formData.notes,
          internalNotes: formData.internalNotes,
          buyer: {
            fullName: formData.buyerFullName,
            phone: formData.buyerPhone,
            email: formData.buyerEmail,
            dateOfBirth: formData.buyerDateOfBirth || undefined,
            ssn: formData.buyerSSN || undefined,
            driverLicenseNumber: formData.buyerDriverLicense || undefined,
            vehiclePlate: formData.buyerVehiclePlate || undefined,
            address: {
              street: formData.buyerStreet || undefined,
              city: formData.buyerCity || undefined,
              state: formData.buyerState || undefined,
              zipCode: formData.buyerZipCode || undefined,
              country: formData.buyerCountry || undefined,
            },
          },
          tradeInDetails: formData.hasTradeIn ? formData.tradeInDetails : undefined,
          enableReminders: formData.enableReminders,
          selectedReminders: formData.enableReminders ? formData.selectedReminders : undefined,
          customReminders: formData.customReminders.length > 0 ? formData.customReminders : undefined,
          documents: formData.documents.length > 0 ? formData.documents : undefined,
          followUpDate: formData.followUpDate || undefined,
          fiRequestId: formData.fiRequestId || undefined,
        }),
      });

      if (response.ok) {
        // Limpiar borrador
        localStorage.removeItem(`sale_draft_${vehicle.id}`);
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
  };

  const renderStepIndicator = () => (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center flex-1">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <div key={index} className="flex items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  index + 1 < currentStep
                    ? 'bg-green-500 text-white'
                    : index + 1 === currentStep
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {index + 1 < currentStep ? '✓' : index + 1}
              </div>
              {index < totalSteps - 1 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    index + 1 < currentStep ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="text-xs text-gray-500 text-center">
        {currentStep === 1 && 'Información del Comprador'}
        {currentStep === 2 && 'Desglose de Venta'}
        {currentStep === 3 && 'Método de Pago'}
        {currentStep === 4 && 'Recordatorios Post-Venta'}
        {currentStep === 5 && 'Notas y Seguimiento'}
        {currentStep === 6 && 'Contratos y Documentos'}
      </div>
      <div className="text-xs text-gray-400 text-center mt-1">
        Paso {currentStep} de {totalSteps}
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-900">Información del Comprador</h3>
      
      {/* Búsqueda de Lead */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Buscar Lead/Cliente Existente
        </label>
        <input
          type="text"
          value={leadSearchQuery}
          onChange={(e) => {
            setLeadSearchQuery(e.target.value);
            setShowLeadDropdown(true);
          }}
          onFocus={() => setShowLeadDropdown(true)}
          placeholder="Buscar por nombre, teléfono o email..."
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        
        {showLeadDropdown && filteredLeads.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {filteredLeads.map((lead) => (
              <div
                key={lead.id}
                onClick={() => handleLeadSelect(lead)}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-0"
              >
                <div className="font-medium">{lead.contact.name}</div>
                <div className="text-sm text-gray-600">
                  {lead.contact.phone} {lead.contact.email && `• ${lead.contact.email}`}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {formData.leadId && (
          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
            ✓ Lead seleccionado: {formData.buyerFullName}
          </div>
        )}
      </div>

      <div className="border-t pt-4">
        <p className="text-sm text-gray-600 mb-4">O completa los datos del comprador:</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre Completo * {errors.buyerFullName && <span className="text-red-500 text-xs">({errors.buyerFullName})</span>}
            </label>
            <input
              type="text"
              required
              value={formData.buyerFullName}
              onChange={(e) => setFormData(prev => ({ ...prev, buyerFullName: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                errors.buyerFullName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono * {errors.buyerPhone && <span className="text-red-500 text-xs">({errors.buyerPhone})</span>}
            </label>
            <input
              type="tel"
              required
              value={formData.buyerPhone}
              onChange={(e) => setFormData(prev => ({ ...prev, buyerPhone: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                errors.buyerPhone ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email * {errors.buyerEmail && <span className="text-red-500 text-xs">({errors.buyerEmail})</span>}
            </label>
            <input
              type="email"
              required
              value={formData.buyerEmail}
              onChange={(e) => setFormData(prev => ({ ...prev, buyerEmail: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                errors.buyerEmail ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Nacimiento
            </label>
            <input
              type="date"
              value={formData.buyerDateOfBirth}
              onChange={(e) => setFormData(prev => ({ ...prev, buyerDateOfBirth: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SSN
            </label>
            <input
              type="text"
              value={formData.buyerSSN}
              onChange={(e) => setFormData(prev => ({ ...prev, buyerSSN: e.target.value }))}
              placeholder="XXX-XX-XXXX"
              maxLength={11}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número de Licencia de Conducir
            </label>
            <input
              type="text"
              value={formData.buyerDriverLicense}
              onChange={(e) => setFormData(prev => ({ ...prev, buyerDriverLicense: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tablilla del Vehículo
            </label>
            <input
              type="text"
              value={formData.buyerVehiclePlate}
              onChange={(e) => setFormData(prev => ({ ...prev, buyerVehiclePlate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Dirección</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="Calle"
                value={formData.buyerStreet}
                onChange={(e) => setFormData(prev => ({ ...prev, buyerStreet: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <input
              type="text"
              placeholder="Ciudad"
              value={formData.buyerCity}
              onChange={(e) => setFormData(prev => ({ ...prev, buyerCity: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Estado/Provincia"
              value={formData.buyerState}
              onChange={(e) => setFormData(prev => ({ ...prev, buyerState: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Código Postal"
              value={formData.buyerZipCode}
              onChange={(e) => setFormData(prev => ({ ...prev, buyerZipCode: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="País"
              value={formData.buyerCountry}
              onChange={(e) => setFormData(prev => ({ ...prev, buyerCountry: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-900">Desglose de Venta</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Precio Base del Vehículo * {errors.vehiclePrice && <span className="text-red-500 text-xs">({errors.vehiclePrice})</span>}
          </label>
          <input
            type="number"
            step="0.01"
            required
            value={formData.vehiclePrice}
            onChange={(e) => setFormData(prev => ({ ...prev, vehiclePrice: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              errors.vehiclePrice ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Precio Final de Venta * {errors.salePrice && <span className="text-red-500 text-xs">({errors.salePrice})</span>}
          </label>
          <input
            type="number"
            step="0.01"
            required
            value={formData.salePrice}
            onChange={(e) => setFormData(prev => ({ ...prev, salePrice: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              errors.salePrice ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bono 1</label>
          <input
            type="number"
            step="0.01"
            value={formData.bonus1}
            onChange={(e) => setFormData(prev => ({ ...prev, bonus1: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bono 2</label>
          <input
            type="number"
            step="0.01"
            value={formData.bonus2}
            onChange={(e) => setFormData(prev => ({ ...prev, bonus2: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rebate</label>
          <input
            type="number"
            step="0.01"
            value={formData.rebate}
            onChange={(e) => setFormData(prev => ({ ...prev, rebate: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tablilla</label>
          <input
            type="number"
            step="0.01"
            value={formData.tablilla}
            onChange={(e) => setFormData(prev => ({ ...prev, tablilla: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Seguro</label>
          <input
            type="number"
            step="0.01"
            value={formData.insurance}
            onChange={(e) => setFormData(prev => ({ ...prev, insurance: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Accesorios</label>
          <input
            type="number"
            step="0.01"
            value={formData.accessories}
            onChange={(e) => setFormData(prev => ({ ...prev, accessories: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Garantía Extendida</label>
          <input
            type="number"
            step="0.01"
            value={formData.warranty}
            onChange={(e) => setFormData(prev => ({ ...prev, warranty: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Paquete de Servicio</label>
          <input
            type="number"
            step="0.01"
            value={formData.servicePackage}
            onChange={(e) => setFormData(prev => ({ ...prev, servicePackage: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Otros</label>
          <input
            type="number"
            step="0.01"
            value={formData.other}
            onChange={(e) => setFormData(prev => ({ ...prev, other: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Trade-In */}
      <div className="border-t pt-4">
        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            id="hasTradeIn"
            checked={formData.hasTradeIn}
            onChange={(e) => setFormData(prev => ({ ...prev, hasTradeIn: e.target.checked }))}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="hasTradeIn" className="ml-2 text-sm font-medium text-gray-700">
            Tiene Trade-In
          </label>
        </div>
        
        {formData.hasTradeIn && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
              <input
                type="text"
                value={formData.tradeInDetails?.make || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  tradeInDetails: { ...prev.tradeInDetails, make: e.target.value } as any,
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
              <input
                type="text"
                value={formData.tradeInDetails?.model || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  tradeInDetails: { ...prev.tradeInDetails, model: e.target.value } as any,
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
              <input
                type="text"
                value={formData.tradeInDetails?.year || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  tradeInDetails: { ...prev.tradeInDetails, year: e.target.value } as any,
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Millaje</label>
              <input
                type="text"
                value={formData.tradeInDetails?.mileage || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  tradeInDetails: { ...prev.tradeInDetails, mileage: e.target.value } as any,
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Condición</label>
              <select
                value={formData.tradeInDetails?.condition || 'good'}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  tradeInDetails: { ...prev.tradeInDetails, condition: e.target.value as any } as any,
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="excellent">Excelente</option>
                <option value="good">Bueno</option>
                <option value="fair">Regular</option>
                <option value="poor">Pobre</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor Estimado</label>
              <input
                type="number"
                step="0.01"
                value={formData.tradeInDetails?.value || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  tradeInDetails: { ...prev.tradeInDetails, value: e.target.value } as any,
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Totales */}
      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal:</span>
          <span className="font-medium">{vehicle.currency} {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        {formData.hasTradeIn && tradeInValue > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Trade-In:</span>
            <span className="font-medium text-green-600">-{vehicle.currency} {tradeInValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        )}
        <div className="flex justify-between items-center pt-2 border-t">
          <span className="font-bold text-lg">Total:</span>
          <span className="font-bold text-2xl text-blue-600">
            {vehicle.currency} {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Comisiones */}
      <div className="border-t pt-4">
        <h4 className="font-semibold text-gray-900 mb-3">Cálculo de Comisión</h4>
        
        {commissions.vehicleCommission > 0 && (
          <div className="mb-2 p-2 bg-blue-50 rounded text-sm">
            <div className="flex justify-between">
              <span>Comisión Vehículo:</span>
              <span className="font-medium">{vehicle.currency} {commissions.vehicleCommission.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        )}
        
        {commissions.insuranceCommission > 0 && (
          <div className="mb-2 p-2 bg-green-50 rounded text-sm">
            <div className="flex justify-between">
              <span>Comisión Seguro:</span>
              <span className="font-medium">{vehicle.currency} {commissions.insuranceCommission.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        )}
        
        {commissions.accessoriesCommission > 0 && (
          <div className="mb-2 p-2 bg-purple-50 rounded text-sm">
            <div className="flex justify-between">
              <span>Comisión Accesorios:</span>
              <span className="font-medium">{vehicle.currency} {commissions.accessoriesCommission.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        )}
        
        {commissions.warrantyCommission > 0 && (
          <div className="mb-2 p-2 bg-yellow-50 rounded text-sm">
            <div className="flex justify-between">
              <span>Comisión Garantía:</span>
              <span className="font-medium">{vehicle.currency} {commissions.warrantyCommission.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        )}
        
        {commissions.servicePackageCommission > 0 && (
          <div className="mb-2 p-2 bg-indigo-50 rounded text-sm">
            <div className="flex justify-between">
              <span>Comisión Paquete Servicio:</span>
              <span className="font-medium">{vehicle.currency} {commissions.servicePackageCommission.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        )}
        
        {commissions.totalCommission > 0 && (
          <div className="mt-3 p-3 bg-blue-100 rounded-lg border-2 border-blue-300">
            <div className="flex justify-between items-center">
              <span className="font-bold text-lg">Comisión Total:</span>
              <span className="font-bold text-xl text-blue-600">
                {vehicle.currency} {commissions.totalCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}
        
        {commissions.totalCommission === 0 && (
          <p className="text-sm text-gray-500 italic">
            No hay comisiones configuradas para este vehículo. Configúralas al crear o editar el vehículo.
          </p>
        )}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-900">Método de Pago</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Método de Pago *</label>
        <select
          value={formData.paymentMethod}
          onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="cash">Efectivo</option>
          <option value="credit_card">Tarjeta de Crédito</option>
          <option value="debit_card">Tarjeta de Débito</option>
          <option value="bank_transfer">Transferencia Bancaria</option>
          <option value="financing">Financiamiento</option>
          <option value="lease">Leasing</option>
          <option value="other">Otro</option>
        </select>
      </div>

      {formData.paymentMethod === 'financing' && (
        <div className="border-t pt-4 space-y-4">
          <h4 className="font-semibold text-gray-900">Detalles de Financiamiento</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prestamista</label>
              <input
                type="text"
                value={formData.financingDetails?.lender || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  financingDetails: { ...prev.financingDetails, lender: e.target.value } as any,
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pronto Pago</label>
              <input
                type="number"
                step="0.01"
                value={formData.financingDetails?.downPayment || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  financingDetails: { ...prev.financingDetails, downPayment: parseFloat(e.target.value) || 0 } as any,
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plazo (meses)</label>
              <input
                type="number"
                value={formData.financingDetails?.loanTerm || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  financingDetails: { ...prev.financingDetails, loanTerm: parseInt(e.target.value) || 0 } as any,
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tasa de Interés (%)</label>
              <input
                type="number"
                step="0.01"
                value={formData.financingDetails?.interestRate || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  financingDetails: { ...prev.financingDetails, interestRate: parseFloat(e.target.value) || 0 } as any,
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pago Mensual</label>
              <input
                type="number"
                step="0.01"
                value={formData.financingDetails?.monthlyPayment || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  financingDetails: { ...prev.financingDetails, monthlyPayment: parseFloat(e.target.value) || 0 } as any,
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Integración F&I */}
      <div className="border-t pt-4">
        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            id="hasFIRequest"
            checked={formData.hasFIRequest}
            onChange={(e) => setFormData(prev => ({ ...prev, hasFIRequest: e.target.checked }))}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="hasFIRequest" className="ml-2 text-sm font-medium text-gray-700">
            Esta venta tiene una solicitud F&I asociada
          </label>
        </div>
        
        {formData.hasFIRequest && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ID de Solicitud F&I</label>
            <input
              type="text"
              value={formData.fiRequestId || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, fiRequestId: e.target.value }))}
              placeholder="ID de la solicitud F&I"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-900">Recordatorios Post-Venta</h3>
      
      <div className="flex items-center mb-4">
        <input
          type="checkbox"
          id="enableReminders"
          checked={formData.enableReminders}
          onChange={(e) => setFormData(prev => ({ ...prev, enableReminders: e.target.checked }))}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="enableReminders" className="ml-2 text-sm font-medium text-gray-700">
          Habilitar recordatorios para este cliente
        </label>
      </div>

      {formData.enableReminders && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Recordatorios Predefinidos</label>
            <div className="space-y-2">
              {[
                { value: 'oil_change_filter_3', label: 'Cambio de Aceite y Filtro (cada 3 meses)' },
                { value: 'oil_change_filter_5', label: 'Cambio de Aceite y Filtro (cada 5 meses)' },
                { value: 'oil_change_filter_6', label: 'Cambio de Aceite y Filtro (cada 6 meses)' },
                { value: 'tire_rotation', label: 'Rotación de Neumáticos (cada 6 meses)' },
                { value: 'inspection', label: 'Inspección Anual' },
                { value: 'warranty_renewal', label: 'Renovación de Garantía' },
                { value: 'insurance_renewal', label: 'Renovación de Seguro' },
              ].map((reminder) => (
                <label key={reminder.value} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.selectedReminders.includes(reminder.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData(prev => ({
                          ...prev,
                          selectedReminders: [...prev.selectedReminders, reminder.value],
                        }));
                      } else {
                        setFormData(prev => ({
                          ...prev,
                          selectedReminders: prev.selectedReminders.filter(r => r !== reminder.value),
                        }));
                      }
                    }}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm">{reminder.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Recordatorios Personalizados</label>
            {formData.customReminders.map((reminder, index) => (
              <div key={index} className="mb-3 p-3 bg-gray-50 rounded">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Tipo de recordatorio"
                    value={reminder.type}
                    onChange={(e) => {
                      const updated = [...formData.customReminders];
                      updated[index].type = e.target.value;
                      setFormData(prev => ({ ...prev, customReminders: updated }));
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="date"
                    value={reminder.date}
                    onChange={(e) => {
                      const updated = [...formData.customReminders];
                      updated[index].date = e.target.value;
                      setFormData(prev => ({ ...prev, customReminders: updated }));
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Notas"
                      value={reminder.notes}
                      onChange={(e) => {
                        const updated = [...formData.customReminders];
                        updated[index].notes = e.target.value;
                        setFormData(prev => ({ ...prev, customReminders: updated }));
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          customReminders: prev.customReminders.filter((_, i) => i !== index),
                        }));
                      }}
                      className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  customReminders: [...prev.customReminders, { type: '', date: '', notes: '' }],
                }));
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
            >
              + Agregar Recordatorio Personalizado
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-900">Notas y Seguimiento</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Notas Públicas</label>
        <textarea
          rows={4}
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Notas adicionales sobre la venta..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Notas Internas</label>
        <textarea
          rows={4}
          value={formData.internalNotes}
          onChange={(e) => setFormData(prev => ({ ...prev, internalNotes: e.target.value }))}
          placeholder="Notas internas (solo visibles para el equipo)..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Seguimiento</label>
        <input
          type="date"
          value={formData.followUpDate}
          onChange={(e) => setFormData(prev => ({ ...prev, followUpDate: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );

  const renderStep6 = () => {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900">📄 Contratos y Documentos</h3>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setShowTemplateSelector(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
            >
              📋 Usar Plantilla
            </button>
            <button
              type="button"
              onClick={() => setShowContractUpload(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              + Subir Contrato
            </button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 text-sm">
            <strong>💡 Tip:</strong> Sube y gestiona todos los contratos relacionados con esta venta aquí. 
            Los contratos pueden ser firmados en persona o enviados al cliente para firma digital remota.
          </p>
        </div>

        {showTemplateSelector && (
          <div className="bg-white border-2 border-green-200 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-semibold text-gray-900">Seleccionar y Llenar Plantilla</h4>
              <button
                type="button"
                onClick={() => setShowTemplateSelector(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <ContractTemplateSelector
              saleId={undefined}
              leadId={formData.leadId}
              vehicleId={vehicle.id}
              buyerInfo={{
                name: formData.buyerFullName,
                email: formData.buyerEmail,
                phone: formData.buyerPhone,
                address: formData.buyerStreet ? `${formData.buyerStreet}, ${formData.buyerCity}, ${formData.buyerState}` : undefined,
              }}
              onTemplateSelected={handleTemplateSelected}
            />
          </div>
        )}

        {showContractUpload && (
          <div className="bg-white border-2 border-blue-200 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-semibold text-gray-900">Subir Nuevo Contrato</h4>
              <button
                type="button"
                onClick={() => setShowContractUpload(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <ContractUploadManager
              leadId={formData.leadId}
              vehicleId={vehicle.id}
              onContractCreated={handleContractUploaded}
            />
          </div>
        )}

        {loadingContracts ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : contracts.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <div className="text-4xl mb-4">📄</div>
            <p className="text-gray-500 mb-4">No hay contratos aún</p>
            <button
              type="button"
              onClick={() => setShowContractUpload(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Subir Primer Contrato
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {contracts.map((contract) => {
              const signedCount = contract.signatures?.filter((s: any) => s.status === 'signed').length || 0;
              const totalSignatures = contract.signatures?.length || 0;
              const isFullySigned = contract.status === 'fully_signed' || contract.status === 'completed';
              
              return (
                <div
                  key={contract.id}
                  className={`border-2 rounded-lg p-4 ${
                    isFullySigned ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{contract.name}</h4>
                      <p className="text-sm text-gray-600 capitalize">{contract.type}</p>
                      <div className="mt-2 flex items-center space-x-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          contract.status === 'fully_signed' || contract.status === 'completed'
                            ? 'bg-green-200 text-green-800'
                            : contract.status === 'partially_signed'
                            ? 'bg-yellow-200 text-yellow-800'
                            : contract.status === 'pending_signatures'
                            ? 'bg-blue-200 text-blue-800'
                            : 'bg-gray-200 text-gray-800'
                        }`}>
                          {contract.status === 'fully_signed' || contract.status === 'completed'
                            ? '✓ Completamente Firmado'
                            : contract.status === 'partially_signed'
                            ? 'Parcialmente Firmado'
                            : contract.status === 'pending_signatures'
                            ? 'Pendiente Firmas'
                            : 'Borrador'}
                        </span>
                        <span className="text-gray-600">
                          Firmas: {signedCount} / {totalSignatures}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <a
                        href={contract.originalDocumentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
                      >
                        Ver
                      </a>
                      {!isFullySigned && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSignInPerson(contract)}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                          >
                            Firmar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSendForSignature(contract)}
                            className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm"
                          >
                            Enviar
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {contract.signatures && contract.signatures.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-700 mb-2">Estado de Firmas:</p>
                      <div className="space-y-1">
                        {contract.signatures.map((sig: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">{sig.signerName}</span>
                            <span className={`px-2 py-0.5 rounded ${
                              sig.status === 'signed'
                                ? 'bg-green-100 text-green-700'
                                : sig.status === 'sent' || sig.status === 'viewed'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {sig.status === 'signed'
                                ? '✓ Firmado'
                                : sig.status === 'sent'
                                ? 'Enviado'
                                : sig.status === 'viewed'
                                ? 'Visto'
                                : 'Pendiente'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {showSigningModal && selectedContractForSign && (
          <ContractSigningModal
            contract={selectedContractForSign}
            signer={{
              name: formData.buyerFullName || 'Usuario',
              email: formData.buyerEmail,
              phone: formData.buyerPhone,
              role: 'seller',
            }}
            onSign={async (signatureData: string) => {
              const response = await fetch(`/api/contracts/${selectedContractForSign.id}/sign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  signatureData,
                  signatureType: 'in_person',
                }),
              });

              if (response.ok) {
                await handleContractSigned();
              } else {
                throw new Error('Error al firmar contrato');
              }
            }}
            onClose={() => {
              setShowSigningModal(false);
              setSelectedContractForSign(null);
            }}
          />
        )}

        {/* Archivo del Cliente - Documentos Finales */}
        {formData.leadId && (
          <div className="mt-6 pt-6 border-t-2 border-gray-300">
            <CustomerFileManager
              customerId={formData.leadId}
              saleId={undefined} // Se asignará después de crear la venta
              vehicleId={vehicle.id}
              onDocumentUploaded={async () => {
                // Los documentos se actualizan automáticamente en tiempo real
              }}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[95vh] overflow-y-auto my-8">
        <div className="sticky top-0 bg-white border-b p-6 z-10">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Marcar como Vendido</h2>
              <p className="text-sm text-gray-600 mt-1">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
          {renderStepIndicator()}
        </div>
        
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="p-6">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && renderStep5()}
          {currentStep === 6 && renderStep6()}
          
          <div className="flex justify-between items-center pt-6 border-t mt-6">
            <div>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  ← Anterior
                </button>
              )}
            </div>
            
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={loading}
              >
                Cancelar
              </button>
              
              {currentStep < totalSteps ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Siguiente →
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : '✓ Marcar como Vendido'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

