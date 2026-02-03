# Guía de Despliegue

## Prerrequisitos

- Node.js 18+
- Firebase CLI instalado
- Cuentas configuradas:
  - Firebase
  - Stripe
  - Meta (Facebook/WhatsApp)
  - OpenAI o Anthropic
  - SendGrid/Resend (email)
  - Twilio (SMS)

## Configuración Inicial

### 1. Firebase

```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Inicializar proyecto
firebase init

# Seleccionar:
# - Firestore
# - Storage
# - Hosting (opcional)
```

### 2. Variables de Entorno

Crear archivo `.env` en la raíz con todas las variables necesarias (ver `.env.example`).

### 3. Desplegar Reglas

```bash
# Desplegar reglas de Firestore
firebase deploy --only firestore:rules

# Desplegar índices
firebase deploy --only firestore:indexes

# Desplegar reglas de Storage
firebase deploy --only storage
```

## Build y Despliegue

### Desarrollo Local

```bash
# Instalar dependencias
npm install

# Desarrollo
npm run dev
```

### Producción

#### Opción 1: Vercel (Recomendado)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Desplegar
vercel

# Configurar variables de entorno en Vercel Dashboard
```

#### Opción 2: Firebase Hosting

```bash
# Build
npm run build

# Desplegar
firebase deploy --only hosting
```

#### Opción 3: Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Configuración de Dominios

### Subdominios Dinámicos

1. Configurar DNS wildcard:
   ```
   *.autodealers.com CNAME your-server.com
   ```

2. Configurar en servidor web (Nginx):
   ```nginx
   server {
       server_name *.autodealers.com;
       # ... configuración
   }
   ```

## Monitoreo

### Logs

- Firebase Console → Logs
- Vercel Analytics
- Sentry para errores

### Métricas

- Firebase Performance Monitoring
- Google Analytics
- Custom dashboards

## Seguridad

### Checklist Pre-Despliegue

- [ ] Variables de entorno configuradas
- [ ] Reglas de Firestore desplegadas
- [ ] Reglas de Storage desplegadas
- [ ] HTTPS habilitado
- [ ] CORS configurado
- [ ] Rate limiting activo
- [ ] Webhooks verificados
- [ ] Backups configurados

## Escalabilidad

### Firebase

- Firestore escala automáticamente
- Configurar índices según uso
- Monitorear cuotas

### Servidor

- Usar CDN para assets estáticos
- Implementar caché (Redis)
- Load balancing si es necesario

## Backup y Recuperación

### Firestore

```bash
# Exportar datos
gcloud firestore export gs://[BUCKET_NAME]

# Importar datos
gcloud firestore import gs://[BUCKET_NAME]
```

### Base de Datos

- Backups automáticos de Firebase
- Exportar regularmente
- Probar restauración

## Troubleshooting

### Errores Comunes

1. **Firebase Auth: Invalid token**
   - Verificar que el token no haya expirado
   - Verificar configuración de Firebase

2. **Stripe webhook: Invalid signature**
   - Verificar `STRIPE_WEBHOOK_SECRET`
   - Verificar que el payload no se modifique

3. **WhatsApp API: Rate limit**
   - Implementar retry con backoff
   - Monitorear uso

## Actualizaciones

### Proceso de Actualización

1. Desplegar a staging
2. Probar funcionalidades críticas
3. Desplegar a producción
4. Monitorear errores
5. Rollback si es necesario

### Versionado

- Usar semantic versioning
- Tag releases en Git
- Documentar cambios





