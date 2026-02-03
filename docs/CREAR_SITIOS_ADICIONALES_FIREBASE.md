# 🌐 Crear Sitios Adicionales en Firebase Hosting

## ⚠️ Requisito: Plan Blaze

**Importante:** Firebase Hosting permite múltiples sitios solo con el **plan Blaze (de pago)**.

- **Plan Spark (gratis):** Solo 1 sitio
- **Plan Blaze (pago):** Sitios ilimitados

## 📋 Pasos para Crear Sitios Adicionales

### 1. Verificar Plan Actual

```bash
# Ver sitios disponibles (1 sitio = Spark, múltiples = Blaze)
firebase hosting:sites:list
```

### 2. Crear Sitios (si tienes Blaze)

```bash
# Crear sitio para admin
firebase hosting:sites:create autodealers-admin

# Crear sitio para dealer
firebase hosting:sites:create autodealers-dealer

# Crear sitio para seller
firebase hosting:sites:create autodealers-seller

# Crear sitio para advertiser
firebase hosting:sites:create autodealers-advertiser
```

### 3. Configurar Targets

```bash
# Configurar targets en .firebaserc
firebase target:apply hosting admin-panel autodealers-admin
firebase target:apply hosting dealer-dashboard autodealers-dealer
firebase target:apply hosting seller-dashboard autodealers-seller
firebase target:apply hosting advertiser-dashboard autodealers-advertiser
```

### 4. Deploy Todos los Sitios

```bash
firebase deploy --only hosting
```

## 🔄 Alternativa: Vercel (Recomendado)

Si no tienes plan Blaze, puedes usar **Vercel** para los dashboards:

1. ✅ Gratis
2. ✅ Múltiples proyectos
3. ✅ Mejor para Next.js SSR
4. ✅ Deploy automático con Git

## 📝 URLs de los Sitios

Una vez creados, las URLs serán:
- `https://autodealers-admin.web.app`
- `https://autodealers-dealer.web.app`
- `https://autodealers-seller.web.app`
- `https://autodealers-advertiser.web.app`

## 💰 Costos

**Plan Blaze:**
- Pagas solo por lo que usas
- Hosting: $0.026/GB transferido
- Storage: $0.026/GB/mes
- Para sitios pequeños: ~$5-10/mes



