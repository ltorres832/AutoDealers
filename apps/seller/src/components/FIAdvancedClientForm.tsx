'use client';

// Formulario avanzado de Cliente F&I con validación en tiempo real, autocompletado y guía paso a paso

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface FormData {
  // Paso 1: Información Personal
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  ssn: string;
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed' | '';
  dependents: number;
  
  // Paso 2: Dirección
  address: string;
  city: string;
  state: string;
  zipCode: string;
  housingType: 'rent' | 'own' | 'family' | '';
  monthlyHousingPayment: number;
  yearsAtAddress: number;
  
  // Paso 3: Información Laboral
  employmentStatus: 'employed' | 'self_employed' | 'unemployed' | 'retired' | '';
  employer: string;
  position: string;
  monthlyIncome: number;
  timeAtJob: number; // Meses
  previousEmployer?: string;
  previousTimeAtJob?: number;
  
  // Paso 4: Vehículo
  vehicleId?: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  vehiclePrice: number;
  downPayment: number;
  hasTradeIn: boolean;
  tradeInMake: string;
  tradeInModel: string;
  tradeInYear: string;
  tradeInValue: number;
  
  // Paso 5: Información Adicional
  identificationType: 'drivers_license' | 'passport' | 'id_card' | '';
  identificationNumber: string;
  notes: string;
}

interface ValidationErrors {
  [key: string]: string;
}

interface AutoCompleteSuggestion {
  field: string;
  value: string;
  confidence: number;
}

export default function FIAdvancedClientForm({ 
  initialData, 
  onSave, 
  onComplete 
}: { 
  initialData?: Partial<FormData>;
  onSave?: (data: FormData) => void;
  onComplete?: (data: FormData) => void;
}) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    dateOfBirth: initialData?.dateOfBirth || '',
    ssn: initialData?.ssn || '',
    maritalStatus: initialData?.maritalStatus || '',
    dependents: initialData?.dependents || 0,
    address: initialData?.address || '',
    city: initialData?.city || '',
    state: initialData?.state || '',
    zipCode: initialData?.zipCode || '',
    housingType: initialData?.housingType || '',
    monthlyHousingPayment: initialData?.monthlyHousingPayment || 0,
    yearsAtAddress: initialData?.yearsAtAddress || 0,
    employmentStatus: initialData?.employmentStatus || '',
    employer: initialData?.employer || '',
    position: initialData?.position || '',
    monthlyIncome: initialData?.monthlyIncome || 0,
    timeAtJob: initialData?.timeAtJob || 0,
    vehicleMake: initialData?.vehicleMake || '',
    vehicleModel: initialData?.vehicleModel || '',
    vehicleYear: initialData?.vehicleYear || '',
    vehiclePrice: initialData?.vehiclePrice || 0,
    downPayment: initialData?.downPayment || 0,
    hasTradeIn: initialData?.hasTradeIn || false,
    tradeInMake: initialData?.tradeInMake || '',
    tradeInModel: initialData?.tradeInModel || '',
    tradeInYear: initialData?.tradeInYear || '',
    tradeInValue: initialData?.tradeInValue || 0,
    identificationType: initialData?.identificationType || '',
    identificationNumber: initialData?.identificationNumber || '',
    notes: initialData?.notes || '',
  });
  
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoCompleteSuggestions, setAutoCompleteSuggestions] = useState<AutoCompleteSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<string | null>(null);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const [completionPercentage, setCompletionPercentage] = useState(0);

  const totalSteps = 5;

  // Calcular porcentaje de completitud
  useEffect(() => {
    const requiredFields = [
      'firstName', 'lastName', 'phone', 'email', 'dateOfBirth',
      'address', 'city', 'state', 'zipCode',
      'employmentStatus', 'monthlyIncome',
      'vehicleMake', 'vehicleModel', 'vehicleYear', 'vehiclePrice', 'downPayment'
    ];
    
    const completedFields = requiredFields.filter(field => {
      const value = (formData as any)[field];
      return value !== '' && value !== 0 && value !== undefined && value !== null;
    }).length;
    
    setCompletionPercentage(Math.round((completedFields / requiredFields.length) * 100));
  }, [formData]);

  // Auto-guardado cada 30 segundos
  useEffect(() => {
    if (onSave && Object.keys(formData).length > 0) {
      autoSaveTimer.current = setTimeout(() => {
        onSave(formData);
      }, 30000);
    }
    
    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [formData, onSave]);

  // Autocompletado inteligente
  useEffect(() => {
    const fetchSuggestions = async (field: string, value: string) => {
      if (value.length < 2) {
        setAutoCompleteSuggestions([]);
        return;
      }

      try {
        // Buscar en clientes previos del mismo tenant
        const response = await fetch(`/api/fi/clients/autocomplete?field=${field}&value=${value}`, {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          setAutoCompleteSuggestions(data.suggestions || []);
        }
      } catch (error) {
        console.error('Error fetching autocomplete:', error);
      }
    };

    if (showSuggestions) {
      const value = (formData as any)[showSuggestions] || '';
      fetchSuggestions(showSuggestions, value);
    }
  }, [showSuggestions, formData]);

  // Validación en tiempo real
  const validateField = (field: string, value: any): string | null => {
    switch (field) {
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return 'Email inválido';
        }
        return null;
      case 'phone':
        if (value && !/^[\d\s\-\+\(\)]+$/.test(value)) {
          return 'Teléfono inválido';
        }
        return null;
      case 'ssn':
        if (value && !/^\d{3}-?\d{2}-?\d{4}$/.test(value)) {
          return 'SSN inválido (formato: XXX-XX-XXXX)';
        }
        return null;
      case 'zipCode':
        if (value && !/^\d{5}(-\d{4})?$/.test(value)) {
          return 'Código postal inválido';
        }
        return null;
      case 'monthlyIncome':
        if (value && (isNaN(value) || value < 0)) {
          return 'Ingreso debe ser un número positivo';
        }
        return null;
      case 'vehiclePrice':
        if (value && (isNaN(value) || value < 0)) {
          return 'Precio debe ser un número positivo';
        }
        return null;
      case 'downPayment':
        if (value && formData.vehiclePrice && value > formData.vehiclePrice) {
          return 'El pronto pago no puede ser mayor al precio del vehículo';
        }
        return null;
      default:
        return null;
    }
  };

  const handleFieldChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Validación en tiempo real
    const error = validateField(field, value);
    if (error) {
      setErrors(prev => ({ ...prev, [field]: error }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateStep = (step: number): boolean => {
    const stepErrors: ValidationErrors = {};
    
    switch (step) {
      case 1:
        if (!formData.firstName) stepErrors.firstName = 'Requerido';
        if (!formData.lastName) stepErrors.lastName = 'Requerido';
        if (!formData.phone) stepErrors.phone = 'Requerido';
        if (!formData.email) stepErrors.email = 'Requerido';
        if (!formData.dateOfBirth) stepErrors.dateOfBirth = 'Requerido';
        break;
      case 2:
        if (!formData.address) stepErrors.address = 'Requerido';
        if (!formData.city) stepErrors.city = 'Requerido';
        if (!formData.state) stepErrors.state = 'Requerido';
        if (!formData.zipCode) stepErrors.zipCode = 'Requerido';
        break;
      case 3:
        if (!formData.employmentStatus) stepErrors.employmentStatus = 'Requerido';
        if (!formData.monthlyIncome || formData.monthlyIncome <= 0) {
          stepErrors.monthlyIncome = 'Requerido y debe ser mayor a 0';
        }
        break;
      case 4:
        if (!formData.vehicleMake) stepErrors.vehicleMake = 'Requerido';
        if (!formData.vehicleModel) stepErrors.vehicleModel = 'Requerido';
        if (!formData.vehicleYear) stepErrors.vehicleYear = 'Requerido';
        if (!formData.vehiclePrice || formData.vehiclePrice <= 0) {
          stepErrors.vehiclePrice = 'Requerido y debe ser mayor a 0';
        }
        if (!formData.downPayment) stepErrors.downPayment = 'Requerido';
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

  const handleSave = async () => {
    setSaving(true);
    try {
      if (onSave) {
        await onSave(formData);
      }
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      return;
    }

    setLoading(true);
    try {
      if (onComplete) {
        await onComplete(formData);
      }
    } catch (error) {
      console.error('Error submitting:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <div key={index} className="flex items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
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
        <div className="ml-4 text-sm text-gray-600">
          {completionPercentage}% completado
        </div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${completionPercentage}%` }}
        />
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Información Personal</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre * {errors.firstName && <span className="text-red-500 text-xs">({errors.firstName})</span>}
          </label>
          <input
            type="text"
            required
            value={formData.firstName}
            onChange={(e) => {
              handleFieldChange('firstName', e.target.value);
              setShowSuggestions('firstName');
            }}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              errors.firstName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="Juan"
          />
          {showSuggestions === 'firstName' && autoCompleteSuggestions.length > 0 && (
            <div className="mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-10">
              {autoCompleteSuggestions.map((suggestion, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    handleFieldChange('firstName', suggestion.value);
                    setShowSuggestions(null);
                  }}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                >
                  {suggestion.value}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Apellido * {errors.lastName && <span className="text-red-500 text-xs">({errors.lastName})</span>}
          </label>
          <input
            type="text"
            required
            value={formData.lastName}
            onChange={(e) => {
              handleFieldChange('lastName', e.target.value);
              setShowSuggestions('lastName');
            }}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              errors.lastName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="Pérez"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Teléfono * {errors.phone && <span className="text-red-500 text-xs">({errors.phone})</span>}
          </label>
          <input
            type="tel"
            required
            value={formData.phone}
            onChange={(e) => handleFieldChange('phone', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              errors.phone ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="+1 (555) 123-4567"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email * {errors.email && <span className="text-red-500 text-xs">({errors.email})</span>}
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => handleFieldChange('email', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="juan@example.com"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha de Nacimiento * {errors.dateOfBirth && <span className="text-red-500 text-xs">({errors.dateOfBirth})</span>}
          </label>
          <input
            type="date"
            required
            value={formData.dateOfBirth}
            onChange={(e) => handleFieldChange('dateOfBirth', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              errors.dateOfBirth ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            SSN {errors.ssn && <span className="text-red-500 text-xs">({errors.ssn})</span>}
          </label>
          <input
            type="text"
            value={formData.ssn}
            onChange={(e) => handleFieldChange('ssn', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              errors.ssn ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="XXX-XX-XXXX"
            maxLength={11}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estado Civil *
          </label>
          <select
            value={formData.maritalStatus}
            onChange={(e) => handleFieldChange('maritalStatus', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccionar...</option>
            <option value="single">Soltero</option>
            <option value="married">Casado</option>
            <option value="divorced">Divorciado</option>
            <option value="widowed">Viudo</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Dependientes
          </label>
          <input
            type="number"
            min="0"
            value={formData.dependents}
            onChange={(e) => handleFieldChange('dependents', parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Dirección</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Dirección * {errors.address && <span className="text-red-500 text-xs">({errors.address})</span>}
          </label>
          <input
            type="text"
            required
            value={formData.address}
            onChange={(e) => {
              handleFieldChange('address', e.target.value);
              setShowSuggestions('address');
            }}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              errors.address ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="123 Main St"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ciudad * {errors.city && <span className="text-red-500 text-xs">({errors.city})</span>}
          </label>
          <input
            type="text"
            required
            value={formData.city}
            onChange={(e) => handleFieldChange('city', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              errors.city ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estado * {errors.state && <span className="text-red-500 text-xs">({errors.state})</span>}
          </label>
          <input
            type="text"
            required
            value={formData.state}
            onChange={(e) => handleFieldChange('state', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              errors.state ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="CA"
            maxLength={2}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Código Postal * {errors.zipCode && <span className="text-red-500 text-xs">({errors.zipCode})</span>}
          </label>
          <input
            type="text"
            required
            value={formData.zipCode}
            onChange={(e) => handleFieldChange('zipCode', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              errors.zipCode ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="12345"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de Vivienda *
          </label>
          <select
            value={formData.housingType}
            onChange={(e) => handleFieldChange('housingType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccionar...</option>
            <option value="rent">Renta</option>
            <option value="own">Propia</option>
            <option value="family">Con familia</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pago Mensual de Vivienda
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={formData.monthlyHousingPayment}
            onChange={(e) => handleFieldChange('monthlyHousingPayment', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Años en esta Dirección
          </label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={formData.yearsAtAddress}
            onChange={(e) => handleFieldChange('yearsAtAddress', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Información Laboral</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estado Laboral * {errors.employmentStatus && <span className="text-red-500 text-xs">({errors.employmentStatus})</span>}
          </label>
          <select
            value={formData.employmentStatus}
            onChange={(e) => handleFieldChange('employmentStatus', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              errors.employmentStatus ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
          >
            <option value="">Seleccionar...</option>
            <option value="employed">Empleado</option>
            <option value="self_employed">Autoempleado</option>
            <option value="unemployed">Desempleado</option>
            <option value="retired">Retirado</option>
          </select>
        </div>
        
        {formData.employmentStatus === 'employed' || formData.employmentStatus === 'self_employed' ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Empleador
              </label>
              <input
                type="text"
                value={formData.employer}
                onChange={(e) => {
                  handleFieldChange('employer', e.target.value);
                  setShowSuggestions('employer');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Posición
              </label>
              <input
                type="text"
                value={formData.position}
                onChange={(e) => handleFieldChange('position', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ingreso Mensual * {errors.monthlyIncome && <span className="text-red-500 text-xs">({errors.monthlyIncome})</span>}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={formData.monthlyIncome}
                onChange={(e) => handleFieldChange('monthlyIncome', parseFloat(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  errors.monthlyIncome ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                }`}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tiempo en el Empleo (meses)
              </label>
              <input
                type="number"
                min="0"
                value={formData.timeAtJob}
                onChange={(e) => handleFieldChange('timeAtJob', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Vehículo</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Marca * {errors.vehicleMake && <span className="text-red-500 text-xs">({errors.vehicleMake})</span>}
          </label>
          <input
            type="text"
            required
            value={formData.vehicleMake}
            onChange={(e) => {
              handleFieldChange('vehicleMake', e.target.value);
              setShowSuggestions('vehicleMake');
            }}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              errors.vehicleMake ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="Toyota"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Modelo * {errors.vehicleModel && <span className="text-red-500 text-xs">({errors.vehicleModel})</span>}
          </label>
          <input
            type="text"
            required
            value={formData.vehicleModel}
            onChange={(e) => handleFieldChange('vehicleModel', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              errors.vehicleModel ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="Camry"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Año * {errors.vehicleYear && <span className="text-red-500 text-xs">({errors.vehicleYear})</span>}
          </label>
          <input
            type="number"
            required
            min="1900"
            max={new Date().getFullYear() + 1}
            value={formData.vehicleYear}
            onChange={(e) => handleFieldChange('vehicleYear', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              errors.vehicleYear ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="2024"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Precio del Vehículo * {errors.vehiclePrice && <span className="text-red-500 text-xs">({errors.vehiclePrice})</span>}
          </label>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={formData.vehiclePrice}
            onChange={(e) => handleFieldChange('vehiclePrice', parseFloat(e.target.value) || 0)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              errors.vehiclePrice ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pronto Pago (Down Payment) * {errors.downPayment && <span className="text-red-500 text-xs">({errors.downPayment})</span>}
          </label>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={formData.downPayment}
            onChange={(e) => handleFieldChange('downPayment', parseFloat(e.target.value) || 0)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              errors.downPayment ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          {formData.vehiclePrice > 0 && formData.downPayment > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              {((formData.downPayment / formData.vehiclePrice) * 100).toFixed(1)}% del precio
            </p>
          )}
        </div>
        
        <div className="md:col-span-2">
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="hasTradeIn"
              checked={formData.hasTradeIn}
              onChange={(e) => handleFieldChange('hasTradeIn', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="hasTradeIn" className="ml-2 text-sm font-medium text-gray-700">
              Tiene Trade-In
            </label>
          </div>
          
          {formData.hasTradeIn && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Marca Trade-In
                </label>
                <input
                  type="text"
                  value={formData.tradeInMake}
                  onChange={(e) => handleFieldChange('tradeInMake', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Modelo Trade-In
                </label>
                <input
                  type="text"
                  value={formData.tradeInModel}
                  onChange={(e) => handleFieldChange('tradeInModel', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Año Trade-In
                </label>
                <input
                  type="number"
                  min="1900"
                  max={new Date().getFullYear()}
                  value={formData.tradeInYear}
                  onChange={(e) => handleFieldChange('tradeInYear', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor Estimado Trade-In
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.tradeInValue}
                  onChange={(e) => handleFieldChange('tradeInValue', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Información Adicional</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de Identificación
          </label>
          <select
            value={formData.identificationType}
            onChange={(e) => handleFieldChange('identificationType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccionar...</option>
            <option value="drivers_license">Licencia de Conducir</option>
            <option value="passport">Pasaporte</option>
            <option value="id_card">Cédula de Identidad</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Número de Identificación
          </label>
          <input
            type="text"
            value={formData.identificationNumber}
            onChange={(e) => handleFieldChange('identificationNumber', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notas Adicionales
          </label>
          <textarea
            rows={4}
            value={formData.notes}
            onChange={(e) => handleFieldChange('notes', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Información adicional sobre el cliente..."
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white shadow-lg rounded-lg p-8">
        {renderStepIndicator()}
        
        <div className="mb-8">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && renderStep5()}
        </div>
        
        <div className="flex justify-between items-center pt-6 border-t">
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
            {onSave && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : '💾 Guardar Borrador'}
              </button>
            )}
            
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
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Procesando...' : '✓ Completar'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


