import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Para static export, necesitamos generar los params estáticamente
export async function generateStaticParams() {
  return [];
}
export const revalidate = 0;

// Inicializar Firebase Admin directamente
function getFirestore() {
  if (!admin.apps.length) {
    try {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      
      if (!projectId || !clientEmail || !privateKey) {
        console.error('Firebase credentials missing:', {
          hasProjectId: !!projectId,
          hasClientEmail: !!clientEmail,
          hasPrivateKey: !!privateKey,
        });
        throw new Error('Firebase credentials are not configured. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables.');
      }
      
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log('Firebase Admin initialized successfully');
    } catch (error: any) {
      if (error.code === 'app/duplicate-app') {
        return admin.firestore();
      }
      console.error('Firebase Admin initialization error:', error);
      throw error;
    }
  }
  return admin.firestore();
}

// Función para obtener tenant por subdomain sin usar @autodealers/core
async function getTenantBySubdomain(subdomain: string) {
  try {
    const db = getFirestore();
    console.log(`🔍 getTenantBySubdomain buscando: "${subdomain}"`);
    
    // Primero buscar por subdomain sin filtrar por status
    let snapshot = await db
      .collection('tenants')
      .where('subdomain', '==', subdomain)
      .limit(1)
      .get();
    
    console.log(`📊 Resultados de búsqueda para "${subdomain}": ${snapshot.size} documentos encontrados`);
    
    if (snapshot.empty) {
      console.log(`⚠️ No se encontró tenant con subdomain: "${subdomain}"`);
      // Intentar buscar todos los tenants para debug
      const allTenants = await db.collection('tenants').limit(10).get();
      console.log(`📋 Tenants disponibles (primeros 10):`, allTenants.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        subdomain: doc.data().subdomain,
        status: doc.data().status,
      })));
      return null;
    }
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    
    console.log(`✅ Tenant encontrado:`, {
      id: doc.id,
      name: data.name,
      subdomain: data.subdomain,
      type: data.type,
      status: data.status,
    });
    
    // Verificar que esté activo
    if (data.status !== 'active') {
      console.log(`⚠️ Tenant encontrado pero está inactivo (status: ${data.status})`);
      return null;
    }
    
    return {
      id: doc.id,
      ...data,
    };
  } catch (error) {
    console.error('❌ Error in getTenantBySubdomain:', error);
    return null;
  }
}

// Función para obtener vehículos sin usar @autodealers/inventory
async function getVehicles(tenantId: string, filters: { status?: string } = {}) {
  const db = getFirestore();
  let query: admin.firestore.Query = db
    .collection('tenants')
    .doc(tenantId)
    .collection('vehicles');
  
  if (filters.status) {
    query = query.where('status', '==', filters.status);
  }
  
  try {
    const snapshot = await query.get();
    const vehicles = snapshot.docs.map((doc) => {
      const data = doc.data();
      const vehicle = {
        id: doc.id,
        ...data,
        // Asegurar que las fechas se conviertan correctamente
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
      };
      
      // Log bodyType para debug (solo primeros 3 vehículos)
      if (snapshot.docs.indexOf(doc) < 3) {
        console.log(`📦 Vehículo ${doc.id}:`, {
          make: data.make,
          model: data.model,
          bodyType: data.bodyType || 'NO TIENE',
          'specifications.bodyType': data.specifications?.bodyType || 'NO TIENE',
          hasSpecifications: !!data.specifications,
        });
      }
      
      return vehicle;
    });
    console.log(`📦 getVehicles(${tenantId}, ${JSON.stringify(filters)}): ${vehicles.length} vehículos encontrados`);
    
    // Contar bodyTypes encontrados
    const bodyTypeStats: Record<string, number> = {};
    vehicles.forEach((v: any) => {
      const bt = v.bodyType || v.specifications?.bodyType;
      if (bt) {
        bodyTypeStats[bt] = (bodyTypeStats[bt] || 0) + 1;
      } else {
        bodyTypeStats['SIN_BODYTYPE'] = (bodyTypeStats['SIN_BODYTYPE'] || 0) + 1;
      }
    });
    console.log(`📊 BodyTypes encontrados en getVehicles:`, bodyTypeStats);
    
    return vehicles;
  } catch (error: any) {
    console.error(`❌ Error en getVehicles para tenant ${tenantId}:`, error);
    // Si falla con filtro de status, intentar sin filtro
    if (filters.status) {
      console.log(`⚠️ Reintentando sin filtro de status...`);
      try {
        const snapshot = await db
          .collection('tenants')
          .doc(tenantId)
          .collection('vehicles')
          .get();
        const vehicles = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        console.log(`📦 getVehicles sin filtro: ${vehicles.length} vehículos encontrados`);
        return vehicles;
      } catch (retryError: any) {
        console.error(`❌ Error en reintento:`, retryError);
        return [];
      }
    }
    return [];
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { subdomain: string } }
) {
  try {
    const { subdomain } = params;

    // Obtener tenant por subdominio
    console.log(`🔍 Buscando tenant con subdomain: "${subdomain}"`);
    let tenant: any = await getTenantBySubdomain(subdomain);
    console.log(`📋 Tenant encontrado por subdomain:`, tenant ? {
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      type: tenant.type,
      status: tenant.status,
    } : 'NO ENCONTRADO');

    // Si no se encuentra por subdomain, intentar buscar por tenantId directamente
    // (útil si el subdomain es en realidad un tenantId)
    if (!tenant) {
      console.log(`⚠️ No se encontró tenant por subdomain "${subdomain}", intentando buscar por tenantId...`);
      try {
        const db = getFirestore();
        const tenantDoc = await db.collection('tenants').doc(subdomain).get();
        if (tenantDoc.exists) {
          const tenantData = tenantDoc.data();
          if (tenantData && tenantData.status === 'active') {
            tenant = {
              id: tenantDoc.id,
              ...tenantData,
            };
            console.log(`✅ Tenant encontrado por ID:`, {
              id: tenant.id,
              name: tenant.name,
              subdomain: tenant.subdomain || 'SIN SUBDOMAIN',
              type: tenant.type,
              status: tenant.status,
            });
            
            // Si el tenant no tiene subdomain, asignarle uno automáticamente basado en su ID o nombre
            if (!tenant.subdomain || tenant.subdomain === 'SIN SUBDOMAIN' || tenant.subdomain.trim() === '') {
              console.log(`⚠️ Tenant ${tenant.id} no tiene subdomain válido, asignando uno automáticamente...`);
              const autoSubdomain = tenant.name
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '')
                .substring(0, 50) || `tenant-${tenant.id.substring(0, 8)}`;
              
              // Verificar que el subdomain no esté en uso
              const existingSubdomain = await db
                .collection('tenants')
                .where('subdomain', '==', autoSubdomain)
                .limit(1)
                .get();
              
              let finalSubdomain = autoSubdomain;
              if (!existingSubdomain.empty && existingSubdomain.docs[0].id !== tenant.id) {
                // Si ya existe para otro tenant, usar el tenantId como subdomain
                finalSubdomain = tenant.id;
              }
              
              await tenantDoc.ref.update({ 
                subdomain: finalSubdomain,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
              tenant.subdomain = finalSubdomain;
              console.log(`✅ Subdomain asignado: "${finalSubdomain}"`);
            }
          }
        }
      } catch (error: any) {
        console.error(`❌ Error buscando tenant por ID:`, error.message);
      }
    }

    // Si no existe y es 'demo', crearlo automáticamente
    if (!tenant && subdomain === 'demo') {
      try {
        const db = getFirestore();
        
        // Verificar si ya existe (sin filtrar por status)
        const existing = await db
          .collection('tenants')
          .where('subdomain', '==', 'demo')
          .limit(1)
          .get();
        
        if (existing.empty) {
          // Crear tenant demo con ID específico para facilitar el acceso
          const tenantRef = db.collection('tenants').doc();
          const now = admin.firestore.Timestamp.now();
          
          const tenantData = {
            name: 'AutoDealers Demo',
            type: 'dealer',
            subdomain: 'demo',
            status: 'active',
            membershipId: '',
            branding: {
              primaryColor: '#2563EB',
              secondaryColor: '#1E40AF',
            },
            settings: {},
            description: 'Concesionario de demostración - Tu concesionario de confianza con más de 10 años de experiencia',
            contactEmail: 'demo@autodealers.com',
            contactPhone: '+1 (555) 123-4567',
            address: {
              street: '123 Calle Principal',
              city: 'Ciudad',
              state: 'Estado',
              zipCode: '12345',
              country: 'País',
            },
            website: 'https://demo.autodealers.com',
            businessHours: 'Lunes a Viernes: 9:00 AM - 6:00 PM\nSábados: 10:00 AM - 4:00 PM',
            socialMedia: {
              facebook: 'https://facebook.com/demo',
              instagram: 'https://instagram.com/demo',
              tiktok: 'https://tiktok.com/@demo',
            },
            createdAt: now,
            updatedAt: now,
          };
          
          await tenantRef.set(tenantData);
          
          console.log('Demo tenant created:', tenantRef.id);
          
          // Esperar un momento y obtener el tenant recién creado
          await new Promise(resolve => setTimeout(resolve, 500));
          tenant = await getTenantBySubdomain('demo');
          
          // Si aún no se encuentra, intentar obtenerlo directamente por ID
          if (!tenant) {
            const createdDoc = await tenantRef.get();
            if (createdDoc.exists) {
              const data = createdDoc.data();
              if (data && data.status === 'active') {
                tenant = {
                  id: createdDoc.id,
                  ...data,
                };
              }
            }
          }
        } else {
          // Ya existe, verificar si está activo
          const existingData = existing.docs[0].data();
          if (existingData.status === 'active') {
            tenant = {
              id: existing.docs[0].id,
              ...existingData,
            };
          } else {
            // Si existe pero está inactivo, activarlo
            await existing.docs[0].ref.update({ status: 'active' });
            tenant = {
              id: existing.docs[0].id,
              ...existingData,
              status: 'active',
            };
          }
        }
      } catch (createError: any) {
        console.error('Error creating demo tenant:', createError);
        // Intentar obtener el tenant de todas formas
        tenant = await getTenantBySubdomain('demo');
      }
    }

    if (!tenant || tenant.status !== 'active') {
      return NextResponse.json(
        { error: 'Tenant not found or inactive' },
        { status: 404 }
      );
    }

    // Log información del tenant encontrado
    console.log(`📋 Información del tenant encontrado:`, {
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain || 'SIN SUBDOMAIN',
      type: tenant.type,
      status: tenant.status,
    });

    // Obtener TODOS los vehículos del tenant para la página personal
    // En la página personal del vendedor/dealer, mostrar todos los vehículos (excepto vendidos)
    console.log(`🔍 Buscando vehículos para tenant: ${tenant.id}`);
    
    // Obtener TODOS los vehículos del tenant (sin filtro de status)
    const allVehicles = await getVehicles(tenant.id);
    console.log(`📊 Total de vehículos en Firestore para tenant ${tenant.id}: ${allVehicles.length}`);
    
    // Log detallado de los primeros vehículos encontrados
    if (allVehicles.length > 0) {
      console.log(`📋 Primeros vehículos encontrados:`, allVehicles.slice(0, 3).map((v: any) => ({
        id: v.id,
        tenantId: v.tenantId || 'NO TIENE tenantId',
        make: v.make,
        model: v.model,
        year: v.year,
        status: v.status || 'sin status',
      })));
    } else {
      console.warn(`⚠️ NO SE ENCONTRARON VEHÍCULOS para tenant ${tenant.id}`);
    }
    
    // Filtrar solo los vendidos, mostrar todos los demás (available, reserved, sin status, etc.)
    let vehicles = allVehicles.filter((v: any) => {
      const status = (v.status || '').toLowerCase();
      return status !== 'sold';
    });
    
    console.log(`📊 Vehículos después de filtrar vendidos: ${vehicles.length}`);
    
    // Si no hay vehículos, intentar obtener con status 'available' como fallback
    if (vehicles.length === 0) {
      console.log(`⚠️ No se encontraron vehículos, intentando con filtro 'available'...`);
      vehicles = await getVehicles(tenant.id, { status: 'available' });
      console.log(`📊 Vehículos con status 'available': ${vehicles.length}`);
    }
    
    // Log detallado de los vehículos encontrados
    if (vehicles.length > 0) {
      console.log(`✅ Vehículos encontrados (${vehicles.length}):`, vehicles.slice(0, 5).map((v: any) => ({
        id: v.id,
        make: v.make,
        model: v.model,
        year: v.year,
        status: v.status || 'sin status',
        hasPhotos: !!(v.photos && Array.isArray(v.photos) && v.photos.length > 0),
        photosCount: Array.isArray(v.photos) ? v.photos.length : 0,
        price: v.price,
      })));
    } else {
      console.warn(`⚠️ No se encontraron vehículos para tenant: ${tenant.id}`);
      console.log(`🔍 Verificando colección directamente...`);
      // Verificación directa en Firestore
      try {
        const db = getFirestore();
        const directSnapshot = await db
          .collection('tenants')
          .doc(tenant.id)
          .collection('vehicles')
          .limit(10)
          .get();
        console.log(`📊 Verificación directa: ${directSnapshot.size} documentos encontrados`);
        if (directSnapshot.size > 0) {
          directSnapshot.docs.forEach((doc, idx) => {
            const data = doc.data();
            console.log(`  Vehículo ${idx + 1}:`, {
              id: doc.id,
              make: data.make,
              model: data.model,
              status: data.status || 'sin status',
            });
          });
        }
      } catch (directError: any) {
        console.error(`❌ Error en verificación directa:`, directError.message);
      }
    }

    // Obtener información completa del tenant desde Firestore
    const db = getFirestore();
    const tenantDoc = await db.collection('tenants').doc(tenant.id).get();
    const tenantData = tenantDoc.data();
    
    // Si es un seller, obtener información del usuario (foto, bio)
    // Si es un dealer, obtener el primer vendedor activo o información del dealer
    let sellerInfo = null;
    if (tenant.type === 'seller') {
      // Para seller, el usuario generalmente tiene el mismo ID que el tenant
      // Intentar obtener el usuario directamente por ID
      const userDoc = await db.collection('users').doc(tenant.id).get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        sellerInfo = {
          id: userDoc.id,
          name: userData?.name || tenantData?.name || tenant.name,
          photo: userData?.photo || userData?.profilePhoto || null,
          bio: userData?.bio || null,
        };
      } else {
        // Si no existe con el mismo ID, buscar por tenantId
        const usersSnapshot = await db
          .collection('users')
          .where('tenantId', '==', tenant.id)
          .where('role', '==', 'seller')
          .where('status', '==', 'active')
          .limit(1)
          .get();
        
        if (!usersSnapshot.empty) {
          const userData = usersSnapshot.docs[0].data();
          sellerInfo = {
            id: usersSnapshot.docs[0].id,
            name: userData.name || tenantData?.name || tenant.name,
            photo: userData.photo || userData.profilePhoto || null,
            bio: userData.bio || null,
          };
        } else {
          // Si no hay usuario, usar información del tenant
          sellerInfo = {
            id: tenant.id,
            name: tenantData?.name || tenant.name,
            photo: null,
            bio: tenantData?.description || null,
          };
        }
      }
    } else if (tenant.type === 'dealer') {
      // Para dealers, obtener el primer vendedor activo asociado
      const usersSnapshot = await db
        .collection('users')
        .where('tenantId', '==', tenant.id)
        .where('role', '==', 'seller')
        .where('status', '==', 'active')
        .limit(1)
        .get();
      
      if (!usersSnapshot.empty) {
        const userData = usersSnapshot.docs[0].data();
        sellerInfo = {
          id: usersSnapshot.docs[0].id,
          name: userData.name || 'Vendedor',
          photo: userData.photo || userData.profilePhoto || null,
          bio: userData.bio || null,
        };
      }
    }

    // Obtener configuración de la página web
    const websiteSettings = tenantData?.websiteSettings || {};
    
    // Obtener políticas
    const policies = tenantData?.policies || {};

    // Mapear vehículos con todos los datos necesarios
    const mappedVehicles = vehicles.map((v: any) => {
      // Limpiar fotos
      const cleanPhotos = Array.isArray(v.photos) 
        ? v.photos.filter((p: any) => p && typeof p === 'string' && p.trim() !== '' && p !== 'undefined')
        : [];
      
      // Obtener bodyType de cualquier lugar donde pueda estar
      const bodyType = v.bodyType || v.specifications?.bodyType || null;
      
      // Log para debug
      if (bodyType) {
        console.log(`🚗 Vehículo ${v.id} (${v.make} ${v.model}): bodyType = "${bodyType}"`);
      } else {
        console.warn(`⚠️ Vehículo ${v.id} (${v.make} ${v.model}): NO tiene bodyType`);
        console.log(`   - v.bodyType: ${v.bodyType}`);
        console.log(`   - v.specifications?.bodyType: ${v.specifications?.bodyType}`);
        console.log(`   - v.specifications:`, JSON.stringify(v.specifications || {}));
      }
      
      return {
        id: v.id,
        make: v.make || '',
        model: v.model || '',
        year: v.year || new Date().getFullYear(),
        price: v.price || 0,
        currency: v.currency || 'USD',
        photos: cleanPhotos,
        description: v.description || '',
        mileage: v.mileage || null,
        condition: v.condition || 'used',
        specifications: {
          ...(v.specifications || {}),
          transmission: v.specifications?.transmission || v.transmission,
          fuelType: v.specifications?.fuelType || v.fuelType,
          engine: v.specifications?.engine || v.engine,
          color: v.specifications?.color || v.color,
          doors: v.specifications?.doors || v.doors,
          seats: v.specifications?.seats || v.seats,
          bodyType: bodyType,
        },
        bodyType: bodyType,
        status: v.status || 'available',
        stockNumber: v.stockNumber || v.specifications?.stockNumber || null,
      };
    });
    
    console.log(`✅ Devolviendo ${mappedVehicles.length} vehículos mapeados para tenant ${tenant.id}`);
    console.log(`📋 Primeros 3 vehículos mapeados:`, mappedVehicles.slice(0, 3).map((v: any) => ({
      id: v.id,
      make: v.make,
      model: v.model,
      year: v.year,
      price: v.price,
      hasPhotos: v.photos?.length > 0,
      photosCount: v.photos?.length || 0,
    })));
    
    // Contar vehículos por bodyType para debug
    const bodyTypeCounts: Record<string, number> = {};
    mappedVehicles.forEach((v: any) => {
      const bt = v.bodyType || v.specifications?.bodyType;
      if (bt) {
        bodyTypeCounts[bt] = (bodyTypeCounts[bt] || 0) + 1;
      }
    });
    console.log(`📊 Conteos de bodyType en vehículos mapeados:`, bodyTypeCounts);
    console.log(`⚠️ Vehículos sin bodyType: ${mappedVehicles.filter((v: any) => !v.bodyType && !v.specifications?.bodyType).length}`);
    
    // Verificar que los vehículos tengan los campos mínimos necesarios
    const vehiclesWithRequiredFields = mappedVehicles.filter((v: any) => 
      v.make && v.model && v.year && v.price
    );
    console.log(`✅ Vehículos con campos requeridos: ${vehiclesWithRequiredFields.length} de ${mappedVehicles.length}`);
    
    const responseData = {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        branding: tenant.branding,
        // Información de contacto
        contactEmail: tenantData?.contactEmail || '',
        contactPhone: tenantData?.contactPhone || '',
        address: tenantData?.address || {},
        website: tenantData?.website || '',
        description: tenantData?.description || tenant.description || '',
        businessHours: tenantData?.businessHours || '',
        socialMedia: tenantData?.socialMedia || {},
        // Configuración de la página web
        websiteSettings: websiteSettings,
        // Políticas
        policies: policies,
        // Información del vendedor (si aplica)
        sellerInfo: sellerInfo,
      },
      vehicles: mappedVehicles,
      // Debug info en desarrollo
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          tenantId: tenant.id,
          vehiclesFound: vehicles.length,
          vehiclesMapped: mappedVehicles.length,
          allVehiclesCount: allVehicles.length,
          vehiclesWithRequiredFields: vehiclesWithRequiredFields.length,
        },
      }),
    };
    
    console.log(`📤 Enviando respuesta con ${responseData.vehicles.length} vehículos`);
    console.log(`📋 Estructura de respuesta:`, {
      hasTenant: !!responseData.tenant,
      tenantId: responseData.tenant.id,
      vehiclesCount: responseData.vehicles.length,
      vehiclesIsArray: Array.isArray(responseData.vehicles),
      firstVehicle: responseData.vehicles[0] || null,
    });
    
    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('❌ Error fetching tenant data:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack?.substring(0, 500), // Limitar stack trace
    });
    
    // Mensajes de error más específicos y útiles
    let errorMessage = 'Error interno del servidor';
    let statusCode = 500;
    let hint: string | undefined;
    
    if (error.message?.includes('Firebase credentials missing')) {
      errorMessage = 'Firebase no está configurado correctamente';
      hint = 'Ejecuta: node get-firebase-credentials.js para configurar Firebase';
    } else if (error.message?.includes('Firebase')) {
      errorMessage = `Error de Firebase: ${error.message}`;
      hint = 'Verifica que las credenciales de Firebase sean correctas';
    } else if (error.message?.includes('permission-denied')) {
      errorMessage = 'No tienes permisos para acceder a estos datos';
      statusCode = 403;
    } else if (error.message?.includes('not-found')) {
      errorMessage = 'Recurso no encontrado';
      statusCode = 404;
    } else {
      hint = process.env.NODE_ENV === 'development' 
        ? `Detalles: ${error.message}` 
        : 'Revisa la consola del servidor para más detalles';
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        hint,
        ...(process.env.NODE_ENV === 'development' && {
          details: error.message,
          code: error.code,
        })
      },
      { status: statusCode }
    );
  }
}



