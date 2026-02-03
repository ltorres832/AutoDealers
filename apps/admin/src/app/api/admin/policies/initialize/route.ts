export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createPolicy } from '@autodealers/core';

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 Inicializando políticas - Verificando autenticación...');
    const auth = await verifyAuth(request);
    
    if (!auth) {
      console.error('❌ No se pudo verificar la autenticación');
      return NextResponse.json({ 
        error: 'Unauthorized - No se pudo verificar la autenticación. Por favor, inicia sesión nuevamente.' 
      }, { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('✅ Usuario autenticado:', { userId: auth.userId, role: auth.role });
    
    if (auth.role !== 'admin') {
      console.error('❌ Usuario no es admin:', auth.role);
      return NextResponse.json({ 
        error: `Unauthorized - Se requiere rol de administrador. Rol actual: ${auth.role}` 
      }, { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const defaultPolicies = [
      {
        type: 'privacy' as const,
        title: 'Política de Privacidad',
        content: `# Política de Privacidad

## 1. Información que Recopilamos

Recopilamos información que usted nos proporciona directamente, información recopilada automáticamente e información de terceros.

### Información que usted nos proporciona:
- Nombre y datos de contacto
- Información de la cuenta
- Información de pago
- Contenido que usted proporciona

### Información recopilada automáticamente:
- Información del dispositivo
- Información de uso
- Cookies y tecnologías similares

## 2. Cómo Usamos su Información

Utilizamos la información recopilada para:
- Proporcionar y mejorar nuestros servicios
- Procesar transacciones
- Comunicarnos con usted
- Personalizar su experiencia
- Cumplir con obligaciones legales

## 3. Compartir Información

No vendemos su información personal. Podemos compartir información con:
- Proveedores de servicios
- Socios comerciales autorizados
- Cuando sea requerido por ley

## 4. Seguridad

Implementamos medidas de seguridad técnicas y organizativas para proteger su información.

## 5. Sus Derechos

Usted tiene derecho a:
- Acceder a su información
- Corregir información inexacta
- Solicitar eliminación
- Oponerse al procesamiento
- Portabilidad de datos

## 6. Contacto

Para preguntas sobre esta política, contáctenos en: privacy@autodealers.com

Última actualización: ${new Date().toLocaleDateString('es-ES')}`,
        version: '1.0',
        language: 'es' as const,
        isActive: true,
        isRequired: true,
        requiresAcceptance: true,
        applicableTo: ['public', 'dealer', 'seller'] as const,
        effectiveDate: new Date(),
      },
      {
        type: 'terms' as const,
        title: 'Términos y Condiciones',
        content: `# Términos y Condiciones

## 1. Aceptación de los Términos

Al acceder y usar esta plataforma, usted acepta estar sujeto a estos términos y condiciones.

## 2. Uso de la Plataforma

Usted se compromete a:
- Usar la plataforma de manera legal y ética
- No realizar actividades fraudulentas
- Respetar los derechos de otros usuarios
- Mantener la confidencialidad de su cuenta

## 3. Cuentas de Usuario

- Usted es responsable de mantener la seguridad de su cuenta
- Debe proporcionar información precisa y actualizada
- No puede compartir su cuenta con terceros

## 4. Contenido

- Usted conserva los derechos sobre su contenido
- Otorga licencia para usar su contenido en la plataforma
- No puede publicar contenido ilegal o ofensivo

## 5. Pagos y Reembolsos

- Los pagos son procesados de forma segura
- Las políticas de reembolso se aplican según el tipo de servicio
- Consulte nuestra política de reembolsos para más detalles

## 6. Limitación de Responsabilidad

La plataforma se proporciona "tal cual" sin garantías expresas o implícitas.

## 7. Modificaciones

Nos reservamos el derecho de modificar estos términos en cualquier momento.

Última actualización: ${new Date().toLocaleDateString('es-ES')}`,
        version: '1.0',
        language: 'es' as const,
        isActive: true,
        isRequired: true,
        requiresAcceptance: true,
        applicableTo: ['public', 'dealer', 'seller'] as const,
        effectiveDate: new Date(),
      },
      {
        type: 'refund' as const,
        title: 'Política de Reembolsos',
        content: `# Política de Reembolsos

## 1. Reembolsos Elegibles

Ofrecemos reembolsos en las siguientes circunstancias:
- Cancelación dentro del período de gracia (7 días)
- Servicio no proporcionado según lo acordado
- Error técnico de nuestra parte

## 2. Proceso de Reembolso

1. Solicite el reembolso dentro de 30 días
2. Revisaremos su solicitud
3. Procesaremos el reembolso en 5-10 días hábiles

## 3. Reembolsos No Elegibles

No ofrecemos reembolsos para:
- Uso del servicio después del período de gracia
- Cancelación por cambio de opinión después de 7 días
- Violación de términos de servicio

## 4. Método de Reembolso

Los reembolsos se procesarán al método de pago original.

Última actualización: ${new Date().toLocaleDateString('es-ES')}`,
        version: '1.0',
        language: 'es' as const,
        isActive: true,
        isRequired: false,
        requiresAcceptance: false,
        applicableTo: ['public', 'dealer', 'seller'] as const,
        effectiveDate: new Date(),
      },
      {
        type: 'cookie' as const,
        title: 'Política de Cookies',
        content: `# Política de Cookies

## 1. ¿Qué son las Cookies?

Las cookies son pequeños archivos de texto que se almacenan en su dispositivo cuando visita nuestro sitio web.

## 2. Tipos de Cookies que Usamos

- Cookies esenciales: Necesarias para el funcionamiento del sitio
- Cookies de rendimiento: Nos ayudan a entender cómo los visitantes interactúan con el sitio
- Cookies de funcionalidad: Permiten que el sitio recuerde sus preferencias
- Cookies de marketing: Se usan para mostrar anuncios relevantes

## 3. Gestión de Cookies

Puede gestionar sus preferencias de cookies en la configuración de su navegador.

Última actualización: ${new Date().toLocaleDateString('es-ES')}`,
        version: '1.0',
        language: 'es' as const,
        isActive: true,
        isRequired: false,
        requiresAcceptance: false,
        applicableTo: ['public'] as const,
        effectiveDate: new Date(),
      },
    ];

    console.log('📝 Creando políticas por defecto...');
    const createdPolicies = [];
    for (const policyData of defaultPolicies) {
      try {
        console.log(`  - Creando política: ${policyData.type}`);
        const policy = await createPolicy({
          ...policyData,
          createdBy: auth.userId,
        } as any);
        createdPolicies.push(policy);
        console.log(`  ✅ Política ${policyData.type} creada: ${policy.id}`);
      } catch (error: any) {
        console.error(`  ❌ Error creando política ${policyData.type}:`, error);
        // Continuar con las demás políticas aunque una falle
      }
    }

    console.log(`✅ Proceso completado: ${createdPolicies.length} políticas creadas`);
    return NextResponse.json({
      success: true,
      message: `${createdPolicies.length} políticas creadas`,
      policies: createdPolicies,
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('❌ Error initializing policies:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { 
        error: error.message || 'Error al inicializar políticas',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

