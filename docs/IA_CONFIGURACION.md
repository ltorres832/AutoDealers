# Configuración de Inteligencia Artificial

Este documento explica cómo configurar y utilizar las funcionalidades de IA en la plataforma AutoDealers.

## Funcionalidades de IA Implementadas

### 1. Clasificación Automática de Leads
- **Descripción**: Analiza automáticamente los nuevos leads y los clasifica por prioridad (alta/media/baja), sentimiento e intención de compra.
- **Ejecución**: Automática cuando se ejecuta el scheduler (cada 15 minutos por defecto).
- **Endpoint**: `/api/ai/classify-lead` (POST) - Para clasificación manual

### 2. Respuestas Automáticas con IA
- **Descripción**: Genera respuestas automáticas inteligentes para mensajes de clientes.
- **Disponible en**: Página de Mensajería (botón "IA" junto al campo de mensaje).
- **Endpoint**: `/api/ai/generate-response` (POST)

### 3. Generación de Contenido
- **Descripción**: Genera contenido automático para publicaciones en redes sociales y emails.
- **Endpoint**: `/api/ai/generate-content` (POST)

### 4. Envío Automático de Promociones
- **Descripción**: Envía automáticamente promociones activas a leads y clientes.
- **Ejecución**: Automática cuando se ejecuta el scheduler (cada 15 minutos por defecto).

### 5. Recordatorios Automáticos
- **Descripción**: Envía recordatorios de citas (24 horas y 1 hora antes) y recordatorios post-venta.
- **Ejecución**: Automática cuando se ejecuta el scheduler.

### 6. Campañas de Seguimiento
- **Descripción**: Ejecuta campañas automáticas de seguimiento a clientes sin compra.
- **Ejecución**: Automática cuando se ejecuta el scheduler.

## Configuración Requerida

### 1. OpenAI API Key

Agrega la siguiente variable de entorno en tu archivo `.env.local` o `.env`:

```bash
OPENAI_API_KEY=sk-tu-api-key-aqui
```

**Importante**: 
- Obtén tu API key desde https://platform.openai.com/api-keys
- Mantén la clave segura y no la compartas públicamente

### 2. Scheduler Secret (Opcional, para ejecución externa)

Si planeas ejecutar el scheduler mediante un cron job externo, configura:

```bash
SCHEDULER_SECRET=tu-secret-seguro-aqui
```

## Ejecución del Scheduler

### Opción 1: Ejecución Automática Interna

El scheduler puede iniciarse automáticamente cuando la aplicación arranca. Para habilitarlo, agrega en el código de inicialización de la aplicación:

```typescript
import { startSchedulerService } from '@autodealers/core';

// Iniciar scheduler con ejecución cada 15 minutos
startSchedulerService(15);
```

### Opción 2: Ejecución mediante Cron Job Externo

Si prefieres usar un cron job externo (recomendado para producción), configura un cron job que llame al endpoint:

```bash
# Ejecutar cada 15 minutos
*/15 * * * * curl -X POST https://tu-dominio.com/api/scheduler \
  -H "Authorization: Bearer tu-scheduler-secret" \
  -H "Content-Type: application/json"
```

**Nota**: Asegúrate de configurar `SCHEDULER_SECRET` en las variables de entorno.

### Opción 3: Ejecución Manual

Puedes ejecutar el scheduler manualmente haciendo una petición POST al endpoint:

```bash
curl -X POST https://tu-dominio.com/api/scheduler \
  -H "Authorization: Bearer tu-scheduler-secret" \
  -H "Content-Type: application/json"
```

## Uso de las Funcionalidades

### Generar Respuesta con IA

En la página de Mensajería:

1. Selecciona una conversación
2. Haz clic en el botón "IA" (botón morado con ícono de rayo)
3. La IA generará una respuesta basada en el último mensaje del cliente
4. Revisa la respuesta generada (especialmente si tiene baja confianza)
5. Edita si es necesario y envía

### Clasificar Lead Manualmente

Puedes clasificar un lead manualmente haciendo una petición POST:

```javascript
const response = await fetch('/api/ai/classify-lead', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    leadId: 'id-del-lead'
  })
});
```

### Generar Contenido para Redes Sociales

```javascript
const response = await fetch('/api/ai/generate-content', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'post',
    context: {
      make: 'Toyota',
      model: 'Camry',
      year: 2024,
      price: 30000,
      platform: 'facebook',
      keyFeatures: ['GPS', 'Bluetooth', 'Cámara de reversa']
    }
  })
});
```

## Configuración de Promociones Automáticas

Para que las promociones se envíen automáticamente:

1. Crea una promoción
2. Activa "Envío automático a leads" o "Envío automático a clientes"
3. El sistema detectará automáticamente estas configuraciones y enviará las promociones cuando el scheduler se ejecute

## Monitoreo y Logs

Los logs del scheduler y las operaciones de IA se registran en la consola del servidor. Revisa los logs para:

- Errores de API de OpenAI
- Leads clasificados automáticamente
- Promociones enviadas
- Recordatorios enviados

## Limitaciones

- **Límite de API de OpenAI**: El sistema está configurado para procesar hasta 10 leads por ejecución para evitar exceder límites de API.
- **Costo**: Las llamadas a la API de OpenAI tienen un costo. Monitorea tu uso en https://platform.openai.com/usage
- **Latencia**: Las respuestas de IA pueden tardar varios segundos dependiendo de la carga de OpenAI.

## Solución de Problemas

### Error: "OpenAI API Key no configurada"
- Verifica que `OPENAI_API_KEY` esté configurada en las variables de entorno
- Reinicia el servidor después de agregar la variable

### Error: "Unauthorized" al ejecutar scheduler
- Verifica que `SCHEDULER_SECRET` esté configurado correctamente
- Asegúrate de enviar el header `Authorization: Bearer tu-secret` en la petición

### La IA no genera respuestas
- Verifica que tu API key de OpenAI sea válida
- Revisa los logs del servidor para errores específicos
- Verifica que tengas créditos disponibles en tu cuenta de OpenAI

## Soporte

Para problemas o preguntas sobre la configuración de IA, consulta:
- Documentación de OpenAI: https://platform.openai.com/docs
- Logs del servidor
- Estado del scheduler: `GET /api/scheduler`



