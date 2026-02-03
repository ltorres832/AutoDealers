# Sistema de Features Dinámicas

## Descripción

El sistema de features dinámicas permite al administrador crear nuevas features personalizadas que se implementan automáticamente en toda la plataforma, sin necesidad de modificar código.

## Características

### ✨ Creación desde Admin
- Crea features personalizadas desde `/admin/dynamic-features`
- Sin necesidad de modificar código
- Se sincronizan automáticamente con todas las membresías

### 🔄 Sincronización Automática
- Al crear una feature dinámica, se agrega automáticamente a todas las membresías existentes
- Los valores por defecto se aplican automáticamente
- Las nuevas membresías incluyen todas las features dinámicas activas

### 🎯 Tipos de Features Soportados

1. **Boolean (Sí/No)**
   - Para features que se activan/desactivan
   - Ejemplo: "Notificaciones push", "Modo oscuro"

2. **Number (Número)**
   - Para límites numéricos
   - Soporta min, max y unidad
   - Ejemplo: "Máx. backups", "Tamaño de archivo (MB)"

3. **String (Texto)**
   - Para valores de texto personalizados
   - Ejemplo: "Color personalizado", "Texto de bienvenida"

4. **Select (Selección)**
   - Para opciones predefinidas
   - Ejemplo: "Plan de soporte: Básico, Premium, Enterprise"

### 📂 Categorías

Las features se organizan por categorías:
- `domains` - Dominios
- `ai` - Inteligencia Artificial
- `social` - Redes Sociales
- `marketplace` - Marketplace
- `reports` - Reportes
- `api` - API
- `marketing` - Marketing
- `crm` - CRM
- `content` - Contenido
- `services` - Servicios
- `support` - Soporte
- `custom` - Personalizada

## Uso

### 1. Crear una Feature Dinámica

1. Ve a `/admin/dynamic-features`
2. Haz clic en "+ Crear Feature Dinámica"
3. Completa el formulario:
   - **Clave Única**: Identificador único (ej: `notificaciones_push`)
   - **Nombre**: Nombre para mostrar (ej: "Notificaciones Push")
   - **Descripción**: Descripción de la feature
   - **Tipo**: Boolean, Number, String o Select
   - **Categoría**: Categoría de la feature
   - **Valor por defecto**: Valor inicial (opcional)
   - **Opciones adicionales**: Según el tipo (min/max para number, opciones para select)
4. Guarda - La feature se sincroniza automáticamente

### 2. Usar en Membresías

Las features dinámicas aparecen automáticamente en:
- Modal de creación de membresías
- Página de edición de membresías
- Se pueden configurar igual que las features estándar

### 3. Validar en Código

```typescript
import { canExecuteFeatureEnhanced } from '@autodealers/core';

// Validar feature dinámica
const check = await canExecuteFeatureEnhanced(tenantId, 'mi_feature_personalizada');

if (!check.allowed) {
  return { error: check.reason };
}

// Proceder con la acción
```

## Ejemplos

### Ejemplo 1: Feature Boolean
```typescript
{
  key: 'notificaciones_push',
  name: 'Notificaciones Push',
  description: 'Permite enviar notificaciones push a los usuarios',
  type: 'boolean',
  category: 'services',
  defaultValue: false
}
```

### Ejemplo 2: Feature Number
```typescript
{
  key: 'max_backups',
  name: 'Máximo de Backups',
  description: 'Número máximo de backups que se pueden crear',
  type: 'number',
  category: 'services',
  defaultValue: 5,
  min: 0,
  max: 100,
  unit: 'backups'
}
```

### Ejemplo 3: Feature Select
```typescript
{
  key: 'plan_soporte',
  name: 'Plan de Soporte',
  description: 'Nivel de soporte incluido',
  type: 'select',
  category: 'support',
  defaultValue: 'basico',
  options: ['basico', 'premium', 'enterprise']
}
```

## Sincronización

### Al Crear una Feature
1. Se guarda en Firestore (`dynamic_features`)
2. Se agrega automáticamente a todas las membresías existentes
3. Se aplica el valor por defecto configurado
4. Las nuevas membresías la incluyen automáticamente

### Al Editar una Feature
1. Se actualiza en Firestore
2. Los cambios se reflejan en todas las membresías que la usan
3. Se mantienen los valores personalizados de cada membresía

### Al Desactivar una Feature
1. Se marca como inactiva
2. No aparece en nuevas membresías
3. Las membresías existentes mantienen su configuración

## Validación Automática

El sistema valida automáticamente:
- **Boolean**: Verifica que sea true/false
- **Number**: Verifica rango (min/max) si está configurado
- **String**: Verifica que sea texto válido
- **Select**: Verifica que el valor esté en las opciones permitidas

## Ventajas

1. **Sin Código**: No necesitas modificar código para agregar features
2. **Automático**: Se sincroniza automáticamente en toda la plataforma
3. **Flexible**: Soporta múltiples tipos de datos
4. **Escalable**: Puedes crear tantas features como necesites
5. **Validado**: El sistema valida automáticamente los valores

## Notas Importantes

- Las claves de features deben ser únicas
- Usa solo letras minúsculas, números y guiones bajos en las claves
- Las features desactivadas no aparecen en nuevas membresías
- Los valores por defecto se aplican solo a nuevas membresías
- Las features dinámicas tienen la misma prioridad que las estándar





