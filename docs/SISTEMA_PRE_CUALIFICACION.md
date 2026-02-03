# Sistema de Pre-Cualificación para Financiamiento

## 📋 Descripción General

El sistema de pre-cualificación permite a los clientes potenciales verificar su elegibilidad para financiamiento de vehículos **sin compromiso** y de forma **instantánea**. Esto mejora la experiencia del cliente y genera leads altamente calificados para el concesionario.

## 🎯 Objetivos

1. **Mejorar la experiencia del cliente**: Respuesta instantánea sin esperar llamadas
2. **Generar leads calificados**: Solo clientes que realmente pueden financiar
3. **Aumentar conversión**: Clientes pre-cualificados tienen mayor probabilidad de compra
4. **Automatizar el proceso**: Reducir trabajo manual del equipo de ventas
5. **Mostrar vehículos relevantes**: Filtrar inventario según presupuesto aprobado

## 🔄 Flujo del Sistema

### 1. **Formulario de Pre-Cualificación (Página Pública)**

El cliente llena un formulario con:

**Información Personal:**
- Nombre completo
- Email
- Teléfono
- Fecha de nacimiento
- Número de identificación/licencia

**Información Financiera:**
- Ingresos mensuales
- Tiempo en el trabajo actual
- Tipo de empleo (empleado/independiente/retirado)
- Gastos mensuales estimados
- Historial crediticio (excelente/bueno/regular/limitado)
- Vehículo de interés (opcional)

**Preferencias:**
- Rango de precio deseado
- Tipo de vehículo (nuevo/usado)
- Plazo de financiamiento preferido

### 2. **Procesamiento y Evaluación**

El sistema evalúa la información usando:

**Algoritmo de Puntuación:**
- **Ingresos vs Gastos**: Ratio de capacidad de pago
- **Historial Crediticio**: Peso alto en la decisión
- **Estabilidad Laboral**: Tiempo en el trabajo
- **Monto Solicitado**: Relación con ingresos

**Niveles de Cualificación:**
- ✅ **Pre-Aprobado**: Cliente califica para el monto solicitado
- ⚠️ **Pre-Aprobado Parcial**: Cliente califica para un monto menor
- ❌ **No Califica**: No cumple requisitos mínimos
- 🔄 **Revisión Manual**: Caso especial que requiere revisión

### 3. **Resultado Instantáneo**

El cliente recibe inmediatamente:

**Si Pre-Aprobado:**
- ✅ Mensaje de felicitaciones
- 💰 Monto máximo aprobado
- 📊 Tasa de interés estimada
- 📅 Plazo máximo disponible
- 🚗 Lista de vehículos que califican
- 📞 Botón para agendar cita
- 📧 Certificado de pre-cualificación por email

**Si Pre-Aprobado Parcial:**
- ⚠️ Mensaje explicando la situación
- 💰 Monto aprobado (menor al solicitado)
- 💡 Sugerencias para mejorar la cualificación
- 🚗 Vehículos que califican con el monto aprobado
- 📞 Opción para hablar con un asesor

**Si No Califica:**
- ❌ Mensaje respetuoso
- 💡 Razones principales (sin detalles sensibles)
- 📚 Recursos educativos sobre cómo mejorar crédito
- 📞 Opción para revisión en 6 meses
- 💬 Chat para consultas

### 4. **Generación Automática de Lead**

El sistema crea automáticamente un lead en el CRM con:

- **Estado**: `pre_qualified` (nuevo estado)
- **Score**: Puntuación de cualificación (0-100)
- **Monto Aprobado**: Si aplica
- **Información Completa**: Todos los datos del formulario
- **Vehículos Sugeridos**: IDs de vehículos que califican
- **Notas Automáticas**: Resumen de la evaluación
- **Asignación**: Puede asignarse automáticamente a un vendedor

### 5. **Seguimiento Automático**

- **Email de Confirmación**: Certificado de pre-cualificación
- **Notificación al Vendedor**: Lead nuevo pre-cualificado
- **Recordatorio**: Si no agenda cita en 48 horas
- **Actualización**: Si el cliente vuelve a calificar

## 🏗️ Arquitectura Técnica

### Modelo de Datos

```typescript
interface PreQualification {
  id: string;
  tenantId: string;
  leadId?: string; // Si se convierte en lead
  
  // Información del cliente
  contact: {
    name: string;
    email: string;
    phone: string;
    dateOfBirth: Date;
    identificationNumber: string;
  };
  
  // Información financiera
  financial: {
    monthlyIncome: number;
    monthlyExpenses: number;
    employmentType: 'employed' | 'self_employed' | 'retired' | 'unemployed';
    employmentDuration: number; // meses
    creditHistory: 'excellent' | 'good' | 'fair' | 'limited' | 'poor';
  };
  
  // Preferencias
  preferences: {
    desiredPriceRange: {
      min: number;
      max: number;
    };
    vehicleType: 'new' | 'used' | 'both';
    financingTerm: number; // meses
    interestedVehicleId?: string;
  };
  
  // Resultado de la evaluación
  result: {
    status: 'pre_approved' | 'partially_approved' | 'not_qualified' | 'manual_review';
    approvedAmount?: number;
    maxAmount?: number;
    interestRate?: number;
    score: number; // 0-100
    reasons: string[]; // Razones de la decisión
    suggestedVehicles: string[]; // IDs de vehículos
  };
  
  // Metadatos
  source: 'web' | 'mobile' | 'api';
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  expiresAt: Date; // Pre-cualificación válida por 30 días
}
```

### Algoritmo de Evaluación

```typescript
function evaluatePreQualification(data: PreQualification): EvaluationResult {
  let score = 0;
  const reasons: string[] = [];
  
  // 1. Ratio de Deuda (40 puntos)
  const debtRatio = data.financial.monthlyExpenses / data.financial.monthlyIncome;
  if (debtRatio < 0.3) {
    score += 40;
    reasons.push('Excelente capacidad de pago');
  } else if (debtRatio < 0.5) {
    score += 30;
    reasons.push('Buena capacidad de pago');
  } else if (debtRatio < 0.7) {
    score += 20;
    reasons.push('Capacidad de pago aceptable');
  } else {
    reasons.push('Ratio de deuda alto');
  }
  
  // 2. Historial Crediticio (30 puntos)
  const creditScore = {
    'excellent': 30,
    'good': 25,
    'fair': 15,
    'limited': 5,
    'poor': 0
  };
  score += creditScore[data.financial.creditHistory];
  reasons.push(`Historial crediticio: ${data.financial.creditHistory}`);
  
  // 3. Estabilidad Laboral (20 puntos)
  if (data.financial.employmentDuration >= 24) {
    score += 20;
    reasons.push('Excelente estabilidad laboral');
  } else if (data.financial.employmentDuration >= 12) {
    score += 15;
    reasons.push('Buena estabilidad laboral');
  } else if (data.financial.employmentDuration >= 6) {
    score += 10;
    reasons.push('Estabilidad laboral aceptable');
  } else {
    reasons.push('Poca estabilidad laboral');
  }
  
  // 4. Tipo de Empleo (10 puntos)
  if (data.financial.employmentType === 'employed') {
    score += 10;
  } else if (data.financial.employmentType === 'self_employed') {
    score += 5;
  }
  
  // Calcular monto aprobado
  const maxMonthlyPayment = (data.financial.monthlyIncome - data.financial.monthlyExpenses) * 0.3;
  const approvedAmount = calculateMaxLoanAmount(maxMonthlyPayment, data.preferences.financingTerm);
  
  // Determinar estado
  let status: 'pre_approved' | 'partially_approved' | 'not_qualified' | 'manual_review';
  if (score >= 70 && approvedAmount >= data.preferences.desiredPriceRange.min * 0.8) {
    status = 'pre_approved';
  } else if (score >= 50 && approvedAmount >= data.preferences.desiredPriceRange.min * 0.5) {
    status = 'partially_approved';
  } else if (score >= 30) {
    status = 'manual_review';
  } else {
    status = 'not_qualified';
  }
  
  return {
    status,
    score,
    approvedAmount,
    reasons,
    interestRate: calculateInterestRate(score, data.financial.creditHistory)
  };
}
```

## 📍 Integración con el Sistema Existente

### 1. **CRM Integration**

- Cada pre-cualificación genera un lead automáticamente
- Estado especial: `pre_qualified`
- Score visible en el dashboard del lead
- Filtros para ver solo leads pre-cualificados

### 2. **Inventario Integration**

- Filtrar vehículos por monto aprobado
- Mostrar solo vehículos que el cliente puede financiar
- Destacar vehículos sugeridos

### 3. **Appointments Integration**

- Botón directo para agendar cita desde el resultado
- Pre-llenar información del cliente
- Asignar automáticamente a vendedor disponible

### 4. **Notifications**

- Email al cliente con certificado
- Notificación al vendedor asignado
- Recordatorio si no agenda cita

## 🎨 UI/UX Design

### Página de Pre-Cualificación

1. **Hero Section**: 
   - "¿Calificas para financiamiento? Descúbrelo en 2 minutos"
   - Beneficios: Sin compromiso, Respuesta instantánea, 100% gratuito

2. **Formulario Multi-Paso**:
   - Paso 1: Información Personal
   - Paso 2: Información Financiera
   - Paso 3: Preferencias
   - Indicador de progreso visible

3. **Resultado**:
   - Animación de carga (2-3 segundos)
   - Resultado visual claro (checkmark, warning, X)
   - Información destacada
   - Call-to-action prominente

### Dashboard del Vendedor

- Sección especial para "Leads Pre-Cualificados"
- Score visible
- Monto aprobado destacado
- Botón rápido para contactar

## 🔒 Seguridad y Privacidad

1. **Datos Sensibles**: 
   - Encriptación en tránsito y reposo
   - No almacenar números de identificación completos
   - Cumplimiento con GDPR/LOPD

2. **Validación**:
   - Verificación de email
   - Validación de teléfono
   - Rate limiting para prevenir abuso

3. **Privacidad**:
   - Aviso de privacidad claro
   - Opción de no compartir datos
   - Eliminación automática después de 90 días

## 📊 Analytics y Reportes

- Tasa de pre-cualificación exitosa
- Conversión de pre-cualificados a ventas
- Tiempo promedio de respuesta
- Vehículos más solicitados
- Razones más comunes de rechazo

## 🚀 Fases de Implementación

### Fase 1: MVP (Mínimo Viable)
- Formulario básico
- Algoritmo simple de evaluación
- Generación de lead
- Resultado básico

### Fase 2: Mejoras
- Integración con inventario
- Email automático
- Dashboard mejorado

### Fase 3: Avanzado
- Integración con APIs de crédito reales
- Machine Learning para mejor precisión
- A/B testing de formularios

## 💡 Beneficios para el Negocio

1. **Más Leads Calificados**: Solo clientes que pueden financiar
2. **Mejor Experiencia**: Cliente sabe antes de visitar
3. **Ahorro de Tiempo**: Vendedores se enfocan en leads calificados
4. **Mayor Conversión**: Pre-cualificados compran más
5. **Competitividad**: Diferenciador en el mercado

## ❓ Preguntas Frecuentes

**¿Es realmente sin compromiso?**
Sí, es solo una evaluación preliminar. El financiamiento final requiere aprobación del banco.

**¿Cuánto tiempo es válida la pre-cualificación?**
30 días desde la fecha de emisión.

**¿Puedo mejorar mi cualificación?**
Sí, puedes volver a aplicar después de mejorar tu situación crediticia.

**¿Qué pasa con mi información?**
Se mantiene confidencial y solo se usa para el proceso de financiamiento.


