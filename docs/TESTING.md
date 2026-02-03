# Guía de Testing

## Estrategia de Testing

### Unit Tests
- Funciones puras
- Utilidades
- Helpers

### Integration Tests
- Servicios
- Módulos
- Integraciones externas (mocks)

### E2E Tests
- Flujos completos
- APIs
- UI crítica

## Configuración

### Jest

```json
{
  "preset": "ts-jest",
  "testEnvironment": "node",
  "moduleNameMapper": {
    "^@autodealers/(.*)$": "<rootDir>/../../packages/$1/src"
  }
}
```

## Ejemplos de Tests

### Test de Servicio

```typescript
import { createLead } from '@autodealers/crm';

describe('CRM Service', () => {
  it('should create a lead', async () => {
    const lead = await createLead(
      'tenant-123',
      'whatsapp',
      {
        name: 'John Doe',
        phone: '+1234567890',
        preferredChannel: 'whatsapp',
      }
    );

    expect(lead.id).toBeDefined();
    expect(lead.status).toBe('new');
  });
});
```

### Test de Integración

```typescript
import { WhatsAppService } from '@autodealers/messaging';

describe('WhatsApp Integration', () => {
  it('should send a message', async () => {
    const service = new WhatsAppService('token', 'phone-id');
    const response = await service.sendMessage({
      tenantId: 'tenant-123',
      channel: 'whatsapp',
      direction: 'outbound',
      from: 'sender',
      to: 'recipient',
      content: 'Test message',
    });

    expect(response.status).toBe('sent');
  });
});
```

## Coverage

Objetivo: >80% de cobertura

```bash
npm run test:coverage
```

## CI/CD

Tests se ejecutan automáticamente en:
- Pull requests
- Commits a main
- Pre-deploy





