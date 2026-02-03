# TAMAÑOS EXACTOS DE ESPACIOS PUBLICITARIOS Y PROMOCIONES

## 📐 ESPECIFICACIONES COMPLETAS DE DIMENSIONES

### 🎯 1. HERO BANNER (Banner Principal)
**Ubicación:** Parte superior de la página principal (Hero Section)

#### Imagen:
- **Dimensiones:** `1920 x 600 píxeles`
- **Aspect Ratio:** `16:5`
- **Tamaño máximo de archivo:** `5 MB`
- **Formatos permitidos:** `JPG, JPEG, PNG, WEBP`

#### Video (Opcional):
- **Dimensiones:** `1920 x 600 píxeles`
- **Aspect Ratio:** `16:5`
- **Tamaño máximo de archivo:** `50 MB`
- **Duración máxima:** `30 segundos`
- **Formatos permitidos:** `MP4, WEBM`

---

### 📱 2. SIDEBAR BANNER (Banner Lateral)
**Ubicación:** Barra lateral derecha de la página

#### Imagen:
- **Dimensiones:** `300 x 250 píxeles`
- **Aspect Ratio:** `6:5`
- **Tamaño máximo de archivo:** `2 MB`
- **Formatos permitidos:** `JPG, JPEG, PNG, WEBP`

#### Video (Opcional):
- **Dimensiones:** `300 x 250 píxeles`
- **Aspect Ratio:** `6:5`
- **Tamaño máximo de archivo:** `10 MB`
- **Duración máxima:** `15 segundos`
- **Formatos permitidos:** `MP4, WEBM`

---

### 🎨 3. SPONSORS SECTION (Sección de Patrocinadores)
**Ubicación:** Sección dedicada a patrocinadores

#### Imagen:
- **Dimensiones:** `400 x 300 píxeles`
- **Aspect Ratio:** `4:3`
- **Tamaño máximo de archivo:** `3 MB`
- **Formatos permitidos:** `JPG, JPEG, PNG, WEBP`

#### Video (Opcional):
- **Dimensiones:** `400 x 300 píxeles`
- **Aspect Ratio:** `4:3`
- **Tamaño máximo de archivo:** `20 MB`
- **Duración máxima:** `30 segundos`
- **Formatos permitidos:** `MP4, WEBM`

---

### 📄 4. BETWEEN CONTENT BANNER (Banner Entre Contenido)
**Ubicación:** Entre secciones de contenido (tipo Leaderboard)

#### Imagen:
- **Dimensiones:** `728 x 90 píxeles`
- **Aspect Ratio:** `728:90` (Formato Leaderboard estándar)
- **Tamaño máximo de archivo:** `2 MB`
- **Formatos permitidos:** `JPG, JPEG, PNG, WEBP`

#### Video (Opcional):
- **Dimensiones:** `728 x 90 píxeles`
- **Aspect Ratio:** `728:90`
- **Tamaño máximo de archivo:** `10 MB`
- **Duración máxima:** `15 segundos`
- **Formatos permitidos:** `MP4, WEBM`

---

## 📊 RESUMEN DE DIMENSIONES

| Espacio | Ancho (px) | Alto (px) | Aspect Ratio | Tamaño Máx. Imagen | Tamaño Máx. Video | Duración Máx. Video |
|---------|------------|-----------|--------------|-------------------|-------------------|---------------------|
| **Hero Banner** | 1920 | 600 | 16:5 | 5 MB | 50 MB | 30s |
| **Sidebar Banner** | 300 | 250 | 6:5 | 2 MB | 10 MB | 15s |
| **Sponsors Section** | 400 | 300 | 4:3 | 3 MB | 20 MB | 30s |
| **Between Content** | 728 | 90 | 728:90 | 2 MB | 10 MB | 15s |

---

## 🎯 PLANES DE ANUNCIANTES Y ESPACIOS DISPONIBLES

### 📦 Plan Starter ($99/mes)
- ✅ **1 banner** en sección patrocinadores (400x300px)
- ✅ 10,000 impresiones/mes
- ✅ Dashboard básico
- ✅ Soporte por email

### 💼 Plan Professional ($299/mes)
- ✅ **2 banners:**
  - Sección patrocinadores (400x300px)
  - Sidebar (300x250px)
- ✅ 50,000 impresiones/mes
- ✅ Dashboard avanzado
- ✅ Soporte prioritario
- ✅ Targeting básico
- ✅ Métricas en tiempo real

### ⭐ Plan Premium ($599/mes)
- ✅ **Banner en Hero** (1920x600px) - rotación
- ✅ Impresiones ilimitadas
- ✅ Targeting avanzado
- ✅ A/B testing
- ✅ Métricas avanzadas
- ✅ Soporte 24/7

---

## 📋 PROMOCIONES

### Promociones Pagadas (Dealers/Sellers)
Las promociones pueden incluir imágenes, pero **no tienen dimensiones específicas definidas** en el código actual. Se recomienda usar:

- **Imagen de promoción recomendada:** `800 x 600 píxeles` (Aspect Ratio 4:3)
- **Tamaño máximo:** `2 MB`
- **Formatos:** `JPG, PNG, WEBP`

### Promociones Gratuitas (Feature: `freePromotionsOnLanding`)
- Mismas especificaciones que promociones pagadas
- Disponible solo para membresías con esta feature habilitada

---

## 🔍 VALIDACIONES AUTOMÁTICAS

El sistema valida automáticamente:
1. ✅ **Formato de archivo** (extensión)
2. ✅ **Tamaño de archivo** (en bytes)
3. ✅ **Dimensiones** (ancho x alto) - validación en cliente
4. ✅ **Aspect Ratio** (proporción)

---

## 📝 NOTAS IMPORTANTES

1. **Responsive Design:** Los banners se adaptan automáticamente a diferentes tamaños de pantalla manteniendo el aspect ratio.

2. **Optimización:** Se recomienda optimizar las imágenes antes de subirlas para mejorar el rendimiento.

3. **Formatos Recomendados:**
   - **WEBP:** Mejor compresión y calidad
   - **PNG:** Para imágenes con transparencia
   - **JPG:** Para fotografías

4. **Videos:** Solo disponibles para Hero Banner, Sidebar, Sponsors Section y Between Content.

5. **Rotación:** Los banners en Hero pueden rotar automáticamente cada 5 segundos si hay múltiples banners activos.

---

## 🛠️ ARCHIVO DE CONFIGURACIÓN

Las especificaciones están definidas en:
```
packages/core/src/advertiser-specs.ts
```

Función para obtener descripción de especificaciones:
```typescript
getSpecsDescription(placement: 'hero' | 'sidebar' | 'sponsors_section' | 'between_content')
```

---

## ✅ CHECKLIST PARA SUBIR CONTENIDO

Antes de subir un banner o promoción, verifica:

- [ ] Dimensiones exactas según el espacio elegido
- [ ] Aspect ratio correcto
- [ ] Tamaño de archivo dentro del límite
- [ ] Formato de archivo permitido
- [ ] Si es video: duración dentro del límite
- [ ] Imagen optimizada para web
- [ ] Contenido apropiado y legible

---

**Última actualización:** Basado en código actual del sistema
**Archivo fuente:** `packages/core/src/advertiser-specs.ts`



