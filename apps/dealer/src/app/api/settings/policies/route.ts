import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export const dynamic = 'force-dynamic';

// Tipos de políticas disponibles
export type PolicyType = 
  | 'privacy' 
  | 'terms' 
  | 'cookies' 
  | 'returns' 
  | 'warranty';

export interface Policy {
  type: PolicyType;
  title: string;
  content: string;
  enabled: boolean;
  lastUpdated?: Date;
}

export interface PoliciesSettings {
  privacy: Policy;
  terms: Policy;
  cookies: Policy;
  returns: Policy;
  warranty: Policy;
}

// Contenido por defecto para cada política
const DEFAULT_POLICIES: PoliciesSettings = {
  privacy: {
    type: 'privacy',
    title: 'Política de Privacidad',
    content: `# Política de Privacidad

## 1. Información que Recopilamos

Recopilamos información que usted nos proporciona directamente, incluyendo:

- **Información de contacto:** Nombre, dirección de correo electrónico, número de teléfono
- **Información de vehículos:** Preferencias, historial de búsqueda, vehículos de interés
- **Información de transacciones:** Detalles de compras, métodos de pago
- **Información de comunicación:** Mensajes, consultas, comentarios

## 2. Cómo Utilizamos su Información

Utilizamos la información recopilada para:

- Procesar y completar sus transacciones
- Comunicarnos con usted sobre productos, servicios y ofertas
- Mejorar nuestros servicios y experiencia del usuario
- Cumplir con obligaciones legales y regulatorias
- Prevenir fraudes y proteger la seguridad

## 3. Compartir Información

No vendemos su información personal. Podemos compartir información con:

- **Proveedores de servicios:** Empresas que nos ayudan a operar nuestro negocio
- **Autoridades legales:** Cuando sea requerido por ley
- **Socios comerciales:** Con su consentimiento explícito

## 4. Seguridad de los Datos

Implementamos medidas de seguridad técnicas y organizativas para proteger su información personal contra acceso no autorizado, alteración, divulgación o destrucción.

## 5. Sus Derechos

Usted tiene derecho a:

- Acceder a su información personal
- Corregir información inexacta
- Solicitar la eliminación de sus datos
- Oponerse al procesamiento de sus datos
- Portabilidad de datos

## 6. Cookies y Tecnologías Similares

Utilizamos cookies y tecnologías similares para mejorar su experiencia. Puede gestionar sus preferencias de cookies en la configuración de su navegador.

## 7. Cambios a esta Política

Nos reservamos el derecho de actualizar esta política de privacidad. Le notificaremos sobre cambios significativos.

## 8. Contacto

Para preguntas sobre esta política de privacidad, contáctenos en:

- Email: [su-email@ejemplo.com]
- Teléfono: [su-teléfono]
- Dirección: [su-dirección]

**Última actualización:** ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    enabled: true,
    lastUpdated: new Date(),
  },
  terms: {
    type: 'terms',
    title: 'Términos y Condiciones',
    content: `# Términos y Condiciones

## 1. Aceptación de los Términos

Al acceder y utilizar este sitio web y nuestros servicios, usted acepta estar sujeto a estos términos y condiciones. Si no está de acuerdo con alguna parte de estos términos, no debe utilizar nuestros servicios.

## 2. Descripción del Servicio

Ofrecemos servicios de venta de vehículos, incluyendo:

- Catálogo de vehículos disponibles
- Información detallada sobre vehículos
- Proceso de compra y financiamiento
- Servicios post-venta

## 3. Precios y Disponibilidad

- Todos los precios están sujetos a cambios sin previo aviso
- La disponibilidad de vehículos puede variar
- Los precios no incluyen impuestos, tarifas de registro o costos adicionales a menos que se indique lo contrario
- Nos reservamos el derecho de rechazar cualquier transacción

## 4. Proceso de Compra

### 4.1 Reserva y Depósito

- Se puede requerir un depósito para reservar un vehículo
- Los depósitos son reembolsables según nuestras políticas de devolución
- El depósito se aplicará al precio final del vehículo

### 4.2 Inspección

- Recomendamos encarecidamente una inspección independiente antes de la compra
- Proporcionamos informes de historial del vehículo cuando están disponibles

### 4.3 Financiamiento

- Ofrecemos opciones de financiamiento a través de socios aprobados
- La aprobación del financiamiento está sujeta a verificación crediticia
- Las tasas y términos pueden variar según el perfil crediticio

## 5. Garantías y Representaciones

- Todos los vehículos se venden "tal cual" a menos que se especifique una garantía por escrito
- Proporcionamos información precisa sobre el estado y la historia del vehículo según nuestro conocimiento
- No garantizamos el rendimiento futuro del vehículo

## 6. Limitación de Responsabilidad

En la medida máxima permitida por la ley:

- No seremos responsables por daños indirectos, incidentales o consecuentes
- Nuestra responsabilidad total no excederá el precio de compra del vehículo
- No garantizamos la disponibilidad continua o ininterrumpida de nuestros servicios

## 7. Propiedad Intelectual

Todo el contenido de este sitio web, incluyendo textos, gráficos, logotipos, imágenes y software, es propiedad de [Nombre de la Empresa] y está protegido por leyes de derechos de autor.

## 8. Enlaces a Terceros

Nuestro sitio web puede contener enlaces a sitios web de terceros. No somos responsables del contenido o las prácticas de privacidad de estos sitios.

## 9. Modificaciones de los Términos

Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios entrarán en vigor inmediatamente después de su publicación.

## 10. Ley Aplicable

Estos términos se rigen por las leyes de [País/Estado] y cualquier disputa se resolverá en los tribunales competentes de [Ciudad, País].

## 11. Contacto

Para preguntas sobre estos términos, contáctenos en:

- Email: [su-email@ejemplo.com]
- Teléfono: [su-teléfono]
- Dirección: [su-dirección]

**Última actualización:** ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    enabled: true,
    lastUpdated: new Date(),
  },
  cookies: {
    type: 'cookies',
    title: 'Política de Cookies',
    content: `# Política de Cookies

## 1. ¿Qué son las Cookies?

Las cookies son pequeños archivos de texto que se almacenan en su dispositivo cuando visita un sitio web. Nos ayudan a proporcionarle una mejor experiencia de navegación y nos permiten mejorar nuestros servicios.

## 2. Tipos de Cookies que Utilizamos

### 2.1 Cookies Esenciales

Estas cookies son necesarias para el funcionamiento del sitio web y no se pueden desactivar:

- **Cookies de sesión:** Mantienen su sesión activa mientras navega
- **Cookies de seguridad:** Protegen contra actividades fraudulentas
- **Cookies de autenticación:** Gestionan su acceso al sitio

### 2.2 Cookies de Funcionalidad

Mejoran la funcionalidad del sitio web:

- **Preferencias del usuario:** Recuerdan sus configuraciones
- **Idioma:** Guardan su preferencia de idioma
- **Región:** Almacenan su ubicación para personalizar contenido

### 2.3 Cookies Analíticas

Nos ayudan a entender cómo los visitantes interactúan con nuestro sitio:

- **Google Analytics:** Recopila información sobre el uso del sitio
- **Análisis de comportamiento:** Entiende cómo navegan los usuarios
- **Métricas de rendimiento:** Mide la efectividad de nuestras páginas

### 2.4 Cookies de Marketing

Se utilizan para mostrar anuncios relevantes:

- **Publicidad dirigida:** Muestra anuncios basados en sus intereses
- **Remarketing:** Le muestra nuestros productos en otros sitios web
- **Redes sociales:** Permite compartir contenido en redes sociales

## 3. Cookies de Terceros

Algunas cookies son establecidas por servicios de terceros que aparecen en nuestras páginas:

- **Google Analytics:** Para análisis de tráfico web
- **Facebook Pixel:** Para publicidad y análisis
- **Stripe:** Para procesamiento de pagos seguros

## 4. Gestión de Cookies

Puede controlar y gestionar las cookies de varias maneras:

### 4.1 Configuración del Navegador

La mayoría de los navegadores le permiten:

- Ver qué cookies tiene instaladas
- Eliminar todas o algunas cookies
- Bloquear cookies de sitios específicos
- Bloquear cookies de terceros
- Eliminar cookies cuando cierra el navegador

### 4.2 Configuración en Nuestro Sitio

Puede gestionar sus preferencias de cookies a través de nuestro panel de configuración de cookies, accesible desde el pie de página.

## 5. Cookies que Utilizamos Específicamente

| Cookie | Propósito | Duración |
|--------|-----------|----------|
| session_id | Mantener la sesión del usuario | Sesión |
| user_preferences | Guardar preferencias del usuario | 1 año |
| analytics_id | Identificar visitantes únicos | 2 años |
| marketing_consent | Recordar consentimiento de marketing | 1 año |

## 6. Impacto de Desactivar Cookies

Si desactiva las cookies, algunas funcionalidades del sitio pueden no estar disponibles:

- No podrá iniciar sesión en su cuenta
- No podremos recordar sus preferencias
- Algunas características personalizadas no funcionarán
- El rendimiento del sitio puede verse afectado

## 7. Cookies en Dispositivos Móviles

En dispositivos móviles, puede gestionar las cookies a través de la configuración del navegador móvil o mediante aplicaciones de gestión de privacidad.

## 8. Actualizaciones de esta Política

Podemos actualizar esta política de cookies periódicamente. Le recomendamos revisar esta página regularmente para estar informado sobre cómo utilizamos las cookies.

## 9. Más Información

Para obtener más información sobre cookies y cómo gestionarlas, visite:

- [www.allaboutcookies.org](https://www.allaboutcookies.org)
- [www.youronlinechoices.com](https://www.youronlinechoices.com)

## 10. Contacto

Si tiene preguntas sobre nuestra política de cookies, contáctenos en:

- Email: [su-email@ejemplo.com]
- Teléfono: [su-teléfono]

**Última actualización:** ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    enabled: true,
    lastUpdated: new Date(),
  },
  returns: {
    type: 'returns',
    title: 'Política de Devoluciones y Reembolsos',
    content: `# Política de Devoluciones y Reembolsos

## 1. Política General

Entendemos que a veces puede necesitar devolver un vehículo. Esta política describe los términos y condiciones para devoluciones y reembolsos.

## 2. Período de Devolución

### 2.1 Período de Garantía

Ofrecemos un período de devolución de **7 días** desde la fecha de compra, sujeto a las siguientes condiciones:

- El vehículo debe estar en las mismas condiciones que al momento de la compra
- No debe exceder 500 kilómetros desde la compra
- Debe incluir todos los documentos y accesorios originales
- No debe tener daños adicionales

### 2.2 Excepciones

No se aceptan devoluciones para:

- Vehículos con más de 500 kilómetros
- Vehículos con daños causados por el comprador
- Vehículos modificados o alterados
- Vehículos comprados en subasta o liquidación

## 3. Proceso de Devolución

### 3.1 Solicitud de Devolución

Para iniciar una devolución:

1. **Contacte con nosotros** dentro de los 7 días de la compra
2. **Proporcione información:** Número de factura, razón de devolución
3. **Programe inspección:** Coordinaremos una inspección del vehículo
4. **Aprobación:** Revisaremos su solicitud y le notificaremos

### 3.2 Inspección

- El vehículo será inspeccionado por nuestro equipo técnico
- Verificaremos el estado, kilometraje y accesorios
- La inspección debe completarse dentro de 48 horas de la solicitud

### 3.3 Aprobación o Rechazo

- Si se aprueba: Procederemos con el reembolso
- Si se rechaza: Le explicaremos las razones y opciones disponibles

## 4. Reembolsos

### 4.1 Método de Reembolso

- Los reembolsos se procesarán al método de pago original
- El tiempo de procesamiento es de 5-10 días hábiles
- Se deducirán las tarifas de procesamiento si aplican

### 4.2 Monto del Reembolso

El reembolso incluirá:

- ✅ Precio de compra completo
- ✅ Impuestos pagados
- ✅ Tarifas de registro (si no se completó el registro)

No incluirá:

- ❌ Costos de financiamiento ya incurridos
- ❌ Seguros ya activados
- ❌ Tarifas de transferencia
- ❌ Costos de inspección adicionales

## 5. Intercambios

### 5.1 Política de Intercambio

Ofrecemos intercambios dentro de los 7 días de compra:

- Puede intercambiar por otro vehículo de igual o mayor valor
- La diferencia de precio se ajustará según corresponda
- Se aplicarán las mismas condiciones de inspección

### 5.2 Proceso de Intercambio

1. Seleccione el vehículo de reemplazo
2. Coordinaremos la inspección de ambos vehículos
3. Ajustaremos el precio según la diferencia
4. Completaremos la documentación

## 6. Vehículos Financiados

### 6.1 Devoluciones con Financiamiento

Si el vehículo fue financiado:

- El préstamo debe estar en buen estado
- Coordinaremos con la institución financiera
- El reembolso se aplicará al préstamo primero
- Cualquier excedente se reembolsará al comprador

### 6.2 Cancelación de Financiamiento

- Las tarifas de cancelación temprana pueden aplicar
- El comprador es responsable de estos costos
- Proporcionaremos asistencia en el proceso

## 7. Vehículos con Garantía Extendida

Si compró una garantía extendida:

- La garantía puede ser reembolsable según los términos
- Contacte con el proveedor de garantía directamente
- Proporcionaremos la documentación necesaria

## 8. Condiciones Especiales

### 8.1 Vehículos Nuevos

- Los vehículos nuevos pueden tener políticas diferentes
- Consulte con su asesor de ventas para detalles específicos

### 8.2 Vehículos Usados

- Se aplican todas las condiciones estándar
- El estado del vehículo es crítico para la aprobación

## 9. Contacto para Devoluciones

Para iniciar una devolución o hacer preguntas:

- **Email:** [devoluciones@ejemplo.com]
- **Teléfono:** [número de teléfono]
- **Horario:** Lunes a Viernes, 9:00 AM - 6:00 PM

## 10. Resolución de Disputas

Si no está satisfecho con nuestra decisión:

- Puede solicitar una revisión por parte de la gerencia
- Ofrecemos mediación para resolver disputas
- Puede contactar a las autoridades de protección al consumidor

## 11. Cambios a esta Política

Nos reservamos el derecho de actualizar esta política. Los cambios se aplicarán a compras futuras.

**Última actualización:** ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    enabled: true,
    lastUpdated: new Date(),
  },
  warranty: {
    type: 'warranty',
    title: 'Política de Garantías',
    content: `# Política de Garantías

## 1. Garantía Básica del Concesionario

Todos los vehículos vendidos incluyen nuestra garantía básica del concesionario, que cubre defectos de fabricación y problemas mecánicos importantes.

## 2. Cobertura de Garantía

### 2.1 Vehículos Nuevos

Los vehículos nuevos incluyen:

- **Garantía del fabricante:** Según los términos del fabricante (típicamente 3 años o 36,000 millas)
- **Garantía de powertrain:** Cubre motor, transmisión y componentes principales
- **Garantía contra óxido:** Cubre perforaciones por óxido
- **Garantía de emisiones:** Cumple con estándares ambientales

### 2.2 Vehículos Usados

Los vehículos usados certificados incluyen:

- **Garantía limitada de 90 días o 3,000 millas:** Cubre componentes principales
- **Inspección completa:** Vehículo inspeccionado y certificado
- **Historial verificado:** Reporte de historial del vehículo incluido

## 3. Componentes Cubiertos

### 3.1 Componentes Principales

La garantía cubre:

- ✅ Motor y componentes relacionados
- ✅ Transmisión y sistema de transmisión
- ✅ Sistema de dirección
- ✅ Sistema de frenos
- ✅ Sistema eléctrico principal
- ✅ Sistema de suspensión
- ✅ Sistema de aire acondicionado

### 3.2 Componentes No Cubiertos

La garantía NO cubre:

- ❌ Desgaste normal de neumáticos y pastillas de freno
- ❌ Batería (cubierta por garantía separada del fabricante)
- ❌ Daños por accidente o abuso
- ❌ Modificaciones no autorizadas
- ❌ Mantenimiento de rutina (aceite, filtros, etc.)
- ❌ Daños causados por negligencia

## 4. Duración de la Garantía

### 4.1 Períodos de Cobertura

- **Vehículos nuevos:** Según garantía del fabricante (típicamente 3-5 años)
- **Vehículos usados certificados:** 90 días o 3,000 millas, lo que ocurra primero
- **Vehículos usados estándar:** 30 días o 1,000 millas

### 4.2 Transferibilidad

- Las garantías del fabricante son transferibles a nuevos propietarios
- Nuestras garantías del concesionario pueden tener restricciones de transferencia
- Consulte los términos específicos de su garantía

## 5. Proceso de Reclamación

### 5.1 Cómo Presentar una Reclamación

1. **Contacte con nosotros inmediatamente** cuando note un problema
2. **No conduzca el vehículo** si hay un problema de seguridad
3. **Documente el problema:** Fotos, descripción detallada
4. **Traiga el vehículo** a nuestro centro de servicio autorizado
5. **Proporcione documentación:** Factura de compra, registros de mantenimiento

### 5.2 Evaluación

- Nuestro equipo técnico evaluará el problema
- Determinará si está cubierto por la garantía
- Proporcionará un estimado de reparación si aplica

### 5.3 Reparación

- Las reparaciones se realizarán en nuestro centro de servicio
- Utilizamos piezas originales o equivalentes aprobadas
- El trabajo está garantizado por 12 meses o 12,000 millas

## 6. Mantenimiento Requerido

### 6.1 Mantenimiento Regular

Para mantener la garantía válida, debe:

- Realizar mantenimiento según el programa del fabricante
- Usar fluidos y piezas aprobadas
- Mantener registros de mantenimiento
- Realizar inspecciones según se requiera

### 6.2 Registros de Mantenimiento

- Guarde todos los recibos de mantenimiento
- Documente todas las reparaciones
- Mantenga un registro de kilometraje

## 7. Garantías Extendidas

### 7.1 Opciones Disponibles

Ofrecemos garantías extendidas que cubren:

- **Garantía extendida básica:** Extiende cobertura por tiempo adicional
- **Garantía premium:** Cobertura completa de componentes
- **Garantía de powertrain extendida:** Cobertura extendida de motor y transmisión

### 7.2 Beneficios

- Cobertura más allá de la garantía estándar
- Tranquilidad y protección adicional
- Opciones de pago flexibles
- Transferible a nuevos propietarios (según plan)

## 8. Excepciones y Limitaciones

### 8.1 Excepciones Comunes

La garantía no cubre:

- Daños por accidente, colisión o abuso
- Modificaciones no autorizadas
- Uso comercial o de alquiler
- Daños por desastres naturales
- Corrosión por condiciones ambientales extremas

### 8.2 Limitaciones de Responsabilidad

- Nuestra responsabilidad se limita a la reparación o reemplazo de componentes defectuosos
- No somos responsables por daños indirectos o consecuentes
- La garantía no afecta sus derechos legales como consumidor

## 9. Servicio de Garantía

### 9.1 Centros de Servicio

Aceptamos reclamaciones de garantía en:

- Nuestro centro de servicio principal
- Centros de servicio autorizados del fabricante
- Talleres aprobados (con autorización previa)

### 9.2 Tiempos de Reparación

- Evaluación inicial: Dentro de 48 horas
- Reparaciones menores: 1-3 días hábiles
- Reparaciones mayores: 5-10 días hábiles
- Proporcionamos vehículo de cortesía cuando está disponible

## 10. Garantía de Satisfacción

Además de las garantías técnicas, ofrecemos:

- **Garantía de satisfacción del cliente:** Trabajamos para resolver cualquier preocupación
- **Garantía de precio:** Mejor precio garantizado
- **Garantía de calidad:** Todos los vehículos inspeccionados profesionalmente

## 11. Contacto para Garantías

Para preguntas o reclamaciones de garantía:

- **Email:** [garantias@ejemplo.com]
- **Teléfono:** [número de teléfono]
- **Horario:** Lunes a Sábado, 8:00 AM - 6:00 PM
- **Emergencias:** [número de emergencias 24/7]

## 12. Resolución de Disputas

Si tiene una disputa sobre garantía:

1. Contacte con nuestro departamento de servicio al cliente
2. Solicite una revisión por parte de la gerencia
3. Podemos ofrecer mediación o arbitraje
4. Puede contactar a las autoridades de protección al consumidor

**Última actualización:** ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    enabled: true,
    lastUpdated: new Date(),
  },
};

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obtener políticas del tenant
    const tenantDoc = await db.collection('tenants').doc(auth.tenantId).get();
    
    let policiesSettings: PoliciesSettings;
    
    if (!tenantDoc.exists) {
      // Si el tenant no existe, usar políticas por defecto
      console.warn(`Tenant ${auth.tenantId} not found, using default policies`);
      policiesSettings = {
        privacy: { ...DEFAULT_POLICIES.privacy },
        terms: { ...DEFAULT_POLICIES.terms },
        cookies: { ...DEFAULT_POLICIES.cookies },
        returns: { ...DEFAULT_POLICIES.returns },
        warranty: { ...DEFAULT_POLICIES.warranty },
      };
    } else {
      const tenantData = tenantDoc.data();
      const policies = tenantData?.policies || {};

      // Si no hay políticas, usar las por defecto
      policiesSettings = {
        privacy: policies.privacy ? { ...DEFAULT_POLICIES.privacy, ...policies.privacy } : { ...DEFAULT_POLICIES.privacy },
        terms: policies.terms ? { ...DEFAULT_POLICIES.terms, ...policies.terms } : { ...DEFAULT_POLICIES.terms },
        cookies: policies.cookies ? { ...DEFAULT_POLICIES.cookies, ...policies.cookies } : { ...DEFAULT_POLICIES.cookies },
        returns: policies.returns ? { ...DEFAULT_POLICIES.returns, ...policies.returns } : { ...DEFAULT_POLICIES.returns },
        warranty: policies.warranty ? { ...DEFAULT_POLICIES.warranty, ...policies.warranty } : { ...DEFAULT_POLICIES.warranty },
      };
    }

    return NextResponse.json({ policies: policiesSettings });
  } catch (error: any) {
    console.error('Error fetching policies:', error);
    console.error('Error stack:', error.stack);
    // En caso de error, devolver políticas por defecto en lugar de error
    // Esto asegura que siempre haya políticas disponibles
    const policiesSettings: PoliciesSettings = {
      privacy: { ...DEFAULT_POLICIES.privacy },
      terms: { ...DEFAULT_POLICIES.terms },
      cookies: { ...DEFAULT_POLICIES.cookies },
      returns: { ...DEFAULT_POLICIES.returns },
      warranty: { ...DEFAULT_POLICIES.warranty },
    };
    return NextResponse.json({ policies: policiesSettings }, { status: 200 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { policies } = body;

    if (!policies) {
      return NextResponse.json({ error: 'Policies data required' }, { status: 400 });
    }

    // Validar estructura de políticas
    const validTypes: PolicyType[] = ['privacy', 'terms', 'cookies', 'returns', 'warranty'];
    for (const type of validTypes) {
      if (policies[type]) {
        if (!policies[type].title || !policies[type].content) {
          return NextResponse.json(
            { error: `Policy ${type} must have title and content` },
            { status: 400 }
          );
        }
        // Agregar timestamp de actualización
        policies[type].lastUpdated = new Date();
      }
    }

    // Actualizar políticas en el tenant
    await db.collection('tenants').doc(auth.tenantId).update({
      policies: policies,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating policies:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

