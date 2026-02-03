# Vista Previa de la Página Web Personalizada

## 🎨 Estructura de la Página

La página web pública para dealers y vendedores tiene la siguiente estructura:

---

## 1. **Header (Encabezado)**
```
┌─────────────────────────────────────────────────────┐
│  [Logo]  Nombre del Dealer/Vendedor                │
│          Tu concesionario de confianza             │
│                                    [WhatsApp] [Contactar] │
└─────────────────────────────────────────────────────┘
```
- **Color de fondo**: Usa el color primario configurado en Branding
- **Logo**: Se muestra el logo del tenant (si está configurado)
- **Nombre**: Muestra el nombre del dealer/vendedor
- **Botones de acción**: 
  - WhatsApp (verde) - Abre WhatsApp directamente
  - Contactar (blanco) - Abre formulario de contacto

---

## 2. **Sección Hero (Principal)**
```
┌─────────────────────────────────────────────────────┐
│                                                     │
│        🚗  TÍTULO PRINCIPAL (Grande)                │
│     "Encuentra el vehículo perfecto para ti"       │
│                                                     │
│              Subtítulo personalizable              │
│        "Tenemos X vehículos disponibles"           │
│                                                     │
│              [Botón CTA: Ver Inventario]           │
│                                                     │
└─────────────────────────────────────────────────────┘
```
- **Fondo degradado**: Usa los colores primario y secundario del branding
- **Título**: Personalizable desde "Configuración > Página Web"
- **Subtítulo**: Personalizable o muestra conteo automático de vehículos
- **Botón CTA**: Texto personalizable, lleva directamente al inventario

---

## 3. **Sección "Sobre Nosotros"** (Opcional)
```
┌─────────────────────────────────────────────────────┐
│          Sobre Nosotros                             │
│                                                     │
│  [Contenido personalizable desde configuración]    │
│  El texto puede incluir:                           │
│  - Historia del negocio                            │
│  - Valores                                         │
│  - Misión y visión                                 │
│  - Años de experiencia                             │
│                                                     │
└─────────────────────────────────────────────────────┘
```
- **Activación**: Se puede habilitar/deshabilitar desde configuración
- **Contenido**: Totalmente personalizable por el dealer/vendedor
- **Diseño**: Fondo blanco, texto centrado, fácil de leer

---

## 4. **Inventario de Vehículos (Grid)**
```
┌──────────┐  ┌──────────┐  ┌──────────┐
│ [Imagen] │  │ [Imagen] │  │ [Imagen] │
│          │  │          │  │          │
│ 2024     │  │ 2023     │  │ 2025     │
│ Toyota   │  │ Honda    │  │ Ford     │
│ Camry    │  │ Civic    │  │ F-150    │
│          │  │          │  │          │
│ $25,000  │  │ $22,500  │  │ $35,000  │
│ USD      │  │ USD      │  │ USD      │
│          │  │          │  │          │
│ 50,000km │  │ 30,000km │  │ 20,000km │
│ Usado    │  │ Usado    │  │ Nuevo    │
│          │  │          │  │          │
│ [Ver     │  │ [Ver     │  │ [Ver     │
│ Detalles]│  │ Detalles]│  │ Detalles]│
└──────────┘  └──────────┘  └──────────┘
```
- **Layout**: Grid responsive (1 columna móvil, 2 tablet, 3 desktop)
- **Tarjetas**: Cada vehículo muestra:
  - Foto principal
  - Año, Marca, Modelo
  - Precio en moneda configurada
  - Kilometraje
  - Condición (Nuevo/Usado)
  - Botón "Ver Detalles"
- **Hover effect**: Sombra elevada al pasar el mouse

---

## 5. **Sección de Contacto**
```
┌──────────────────────────┐  ┌──────────────────────────┐
│ Información de Contacto  │  │ Envíanos un Mensaje      │
│                          │  │                          │
│ 📞 +1 (555) 123-4567    │  │ [Botón WhatsApp Grande]  │
│                          │  │                          │
│ ✉️ info@dealer.com      │  │ [Abrir Formulario]       │
│                          │  │                          │
│ 📍 Calle Principal 123   │  │ Descripción del negocio  │
│    Ciudad, Estado        │  │ si está configurada      │
│    CP 12345              │  │                          │
│                          │  │                          │
│ 🕐 Lunes - Viernes       │  │                          │
│    9:00 AM - 6:00 PM     │  │                          │
│                          │  │                          │
│ ────────────────────────│  │                          │
│ Síguenos en:            │  │                          │
│ [📘] [📷] [🎵] [💼]    │  │                          │
│ Facebook Instagram       │  │                          │
│ TikTok LinkedIn          │  │                          │
└──────────────────────────┘  └──────────────────────────┘
```
- **Dos columnas**: Información y formulario
- **Información mostrada**:
  - Teléfono (clickeable)
  - Email (clickeable)
  - Dirección completa
  - Horarios de atención
  - Redes sociales (si están configuradas)
- **Formulario**: Modal que se abre al hacer clic
- **WhatsApp directo**: Botón verde grande para contactar por WhatsApp

---

## 6. **Formulario de Contacto (Modal)**
```
┌───────────────────────────────────────┐
│  Contáctanos                   [X]    │
├───────────────────────────────────────┤
│                                       │
│  Nombre: [___________________]        │
│                                       │
│  Teléfono: [___________________]      │
│                                       │
│  Email: [___________________]         │
│                                       │
│  Mensaje:                             │
│  [________________________________]  │
│  [________________________________]  │
│                                       │
│              [Cancelar] [Enviar]      │
│                                       │
└───────────────────────────────────────┘
```
- **Modal**: Se abre sobre la página
- **Campos**: Nombre, Teléfono, Email, Mensaje
- **Funcionalidad**: Crea un lead automáticamente al enviar

---

## 7. **Mapa de Ubicación** (Opcional)
```
┌─────────────────────────────────────────────────────┐
│  Ubicación                                           │
│                                                      │
│  ┌────────────────────────────────────────────┐    │
│  │                                            │    │
│  │         [Google Maps se mostrará aquí]     │    │
│  │                                            │    │
│  │     Dirección: Calle Principal 123         │    │
│  │                Ciudad, Estado              │    │
│  │                                            │    │
│  └────────────────────────────────────────────┘    │
│                                                      │
└─────────────────────────────────────────────────────┘
```
- **Activación**: Opcional desde configuración
- **Integración**: Google Maps (a implementar)
- **Ubicación**: Usa la dirección del perfil

---

## 8. **Footer (Pie de Página)**
```
┌─────────────────────────────────────────────────────┐
│  [Nombre Dealer]       Contacto        Enlaces      │
│                                                    │
│  [Descripción breve]   📞 Teléfono    Inventario   │
│  del negocio...        ✉️ Email       Sobre Nosotros│
│                        📍 Dirección   Contacto     │
│                                            │
│  ────────────────────────────────────────────────  │
│        © 2024 Nombre Dealer. Todos los derechos    │
│                    reservados.                      │
└─────────────────────────────────────────────────────┘
```
- **Tres columnas**: Información del negocio, Contacto, Enlaces rápidos
- **Copyright**: Año actual + nombre del dealer

---

## 9. **Widget de Chat** (Flotante)
```
                      ┌──────────────┐
                      │    Chat 💬   │
                      │              │
                      │  [Mensaje]   │
                      │              │
                      │  [Enviar]    │
                      └──────────────┘
```
- **Posición**: Flotante en la esquina inferior derecha
- **Funcionalidad**: Chat en tiempo real con el dealer/vendedor
- **Notificaciones**: Llegan notificaciones al dealer cuando un cliente escribe

---

## 🎨 Personalización Disponible

### Desde "Configuración > Página Web":

1. **Sección Hero**:
   - Título principal
   - Subtítulo
   - Texto del botón CTA

2. **Secciones**:
   - ✅ Sobre Nosotros (habilitar/deshabilitar)
   - ✅ Servicios (habilitar/deshabilitar)
   - ✅ Testimonios (habilitar/deshabilitar)
   - ✅ Contacto (habilitar/deshabilitar, mostrar mapa)

3. **SEO**:
   - Meta título
   - Meta descripción
   - Palabras clave

### Desde "Configuración > Perfil":
- Teléfono
- Email
- Dirección
- Horarios de atención
- Redes sociales (Facebook, Instagram, TikTok, LinkedIn)
- Descripción del negocio

### Desde "Configuración > Branding":
- Logo
- Color primario
- Color secundario
- Subdominio (para la URL pública)

---

## 📱 Diseño Responsive

- **Móvil**: 1 columna, navegación optimizada
- **Tablet**: 2 columnas en grid de vehículos
- **Desktop**: 3 columnas, layout completo

---

## 🔗 URL de la Página

La página será accesible en:
- **Desarrollo**: `http://subdominio.localhost:3000`
- **Producción**: `https://subdominio.autodealers.com`

Donde `subdominio` es el configurado en Branding.

---

## ✨ Características Especiales

1. **Chat en tiempo real**: Los clientes pueden chatear directamente desde la página
2. **WhatsApp directo**: Botón que abre WhatsApp con mensaje pre-configurado
3. **Formulario de contacto**: Crea leads automáticamente
4. **Inventario actualizado**: Se sincroniza automáticamente con el inventario del dealer/vendedor
5. **Colores personalizados**: Usa los colores del branding del tenant
6. **SEO optimizado**: Meta tags personalizables para mejor posicionamiento

---

## 🎯 Ejemplo Real

**URL**: `https://midealer.autodealers.com`

**Estructura**:
```
Header (Azul - color del dealer)
  └─ Logo + Nombre del Dealer
  └─ Botones: WhatsApp | Contactar

Hero Section (Degradado azul)
  └─ Título: "Encuentra el vehículo perfecto"
  └─ Subtítulo: "Tenemos 45 vehículos disponibles"
  └─ Botón: "Ver Inventario"

Sobre Nosotros (si está habilitado)
  └─ Título: "Sobre Nosotros"
  └─ Contenido personalizado...

Inventario (Grid 3 columnas)
  └─ 45 vehículos con fotos, precios, detalles

Contacto (2 columnas)
  └─ Izquierda: Info contacto + Redes sociales
  └─ Derecha: Botones WhatsApp + Formulario

Footer (Gris oscuro)
  └─ Info del dealer + Enlaces + Copyright

Chat Widget (Flotante)
  └─ Chat en tiempo real
```

---

Este es el diseño completo de la página web personalizada. ¿Te gustaría que ajuste algún aspecto específico o agregue alguna funcionalidad adicional?



