# Ejemplo de Uso del Sistema de Membresías

## Cómo usar el sistema de validación automática de membresías

### 1. Usar el Hook en tu Componente

```tsx
'use client';

import { useMembershipCheck } from '@/hooks/useMembershipCheck';
import UpgradeModal from '@/components/UpgradeModal';

export default function MiComponente() {
  const { 
    showUpgradeModal, 
    upgradeModalData, 
    closeUpgradeModal,
    checkAndExecute 
  } = useMembershipCheck();

  async function handlePublishSocial() {
    const result = await checkAndExecute(
      () => fetch('/api/social/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: {...}, platforms: ['facebook'] }),
      }),
      'Publicación en Redes Sociales' // Nombre de la feature
    );

    if (result) {
      // Success! La publicación se realizó
      alert('Publicado exitosamente');
    }
    // Si result es null, significa que no tiene acceso y el modal se mostrará automáticamente
  }

  return (
    <>
      <button onClick={handlePublishSocial}>
        Publicar en Redes Sociales
      </button>

      {/* Modal de Upgrade */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={closeUpgradeModal}
        reason={upgradeModalData?.reason || ''}
        featureName={upgradeModalData?.featureName}
        currentLimit={upgradeModalData?.currentLimit}
      />
    </>
  );
}
```

### 2. Validación Manual con Try/Catch

```tsx
async function handleCreateSeller() {
  try {
    const response = await fetch('/api/sellers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, phone }),
    });

    if (response.status === 403) {
      const errorData = await response.json();
      if (errorData.upgradeRequired) {
        // Mostrar modal de upgrade manualmente
        handleMembershipError(errorData);
        return;
      }
    }

    if (!response.ok) {
      throw new Error('Error al crear vendedor');
    }

    const data = await response.json();
    alert('Vendedor creado exitosamente');
  } catch (error) {
    console.error(error);
  }
}
```

### 3. Deshabilitar Botones Basado en Features

```tsx
'use client';

import { useState, useEffect } from 'react';

export default function SocialMediaButton() {
  const [features, setFeatures] = useState<any>(null);

  useEffect(() => {
    fetch('/api/membership/features')
      .then(res => res.json())
      .then(data => setFeatures(data));
  }, []);

  const canUseSocial = features?.features?.socialMediaEnabled;

  return (
    <button
      disabled={!canUseSocial}
      className={`px-4 py-2 rounded ${
        canUseSocial 
          ? 'bg-blue-600 text-white' 
          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
      }`}
    >
      {canUseSocial ? 'Publicar' : '🔒 Requiere Upgrade'}
    </button>
  );
}
```

### 4. Mostrar Progress de Límites

```tsx
import MembershipFeatures from '@/components/MembershipFeatures';

export default function SettingsPage() {
  return (
    <div>
      <h1>Configuración de Membresía</h1>
      
      {/* Componente que muestra automáticamente features y límites */}
      <MembershipFeatures />
    </div>
  );
}
```

## Respuestas del API

### Éxito (200)
```json
{
  "success": true,
  "data": { ... }
}
```

### Feature No Disponible (403)
```json
{
  "error": "Feature not available",
  "reason": "Su membresía no incluye integración con redes sociales",
  "upgradeRequired": true
}
```

### Límite Alcanzado (403)
```json
{
  "error": "Feature not available",
  "reason": "Límite de vendedores alcanzado (10)",
  "limit": 10,
  "current": 10,
  "remaining": 0,
  "upgradeRequired": true
}
```

## Features Disponibles para Validar

- `createSeller` - Crear vendedor
- `addVehicle` - Agregar vehículo
- `createCampaign` - Crear campaign
- `createPromotion` - Crear promoción
- `useSocialMedia` - Usar redes sociales
- `useAI` - Usar IA
- `viewAdvancedReports` - Ver reportes avanzados
- `useSubdomain` - Usar subdominio personalizado
- Y muchas más...

## Flujo Completo

1. Usuario hace clic en botón
2. Frontend llama al API
3. API valida membresía automáticamente
4. Si no tiene acceso:
   - API retorna 403 con info de upgrade
   - Hook captura el error
   - Modal se muestra automáticamente
   - Usuario ve planes disponibles
   - Usuario hace clic en "Actualizar Plan"
   - Redirige a Stripe Checkout
   - Completa el pago
   - Webhook actualiza membresía
   - Usuario puede usar la feature

5. Si tiene acceso:
   - Acción se ejecuta normalmente
   - Usuario ve resultado exitoso

