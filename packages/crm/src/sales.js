"use strict";
// Gestión de ventas
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSale = createSale;
exports.getSaleById = getSaleById;
exports.getSalesBySeller = getSalesBySeller;
exports.getTenantSales = getTenantSales;
exports.completeSale = completeSale;
exports.calculateCommission = calculateCommission;
const core_1 = require("@autodealers/core");
const admin = __importStar(require("firebase-admin"));
const inventory_1 = require("@autodealers/inventory");
const post_sale_1 = require("./post-sale");
const customer_files_1 = require("./customer-files");
const core_2 = require("@autodealers/core");
const messaging_1 = require("@autodealers/messaging");
const db = (0, core_1.getFirestore)();
/**
 * Crea una nueva venta
 */
async function createSale(saleData) {
    const docRef = db
        .collection('tenants')
        .doc(saleData.tenantId)
        .collection('sales')
        .doc();
    // Guardar todos los campos de la venta
    const saleToSave = {
        ...saleData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    // Mantener compatibilidad con el campo 'price' antiguo si no existe salePrice
    if (!saleToSave.salePrice && saleToSave.price) {
        saleToSave.salePrice = saleToSave.price;
        saleToSave.vehiclePrice = saleToSave.price;
    }
    await docRef.set(saleToSave);
    // Actualizar estado del vehículo a vendido
    await (0, inventory_1.updateVehicleStatus)(saleData.tenantId, saleData.vehicleId, 'sold');
    // Crear calificación pendiente y enviar email si hay información del comprador
    if (saleData.buyer && saleData.buyer.email) {
        try {
            // Obtener información del vendedor para obtener dealerId
            const sellerDoc = await db.collection('users').doc(saleData.sellerId).get();
            const sellerData = sellerDoc.exists ? sellerDoc.data() : null;
            const dealerId = sellerData?.dealerId || undefined;
            // Crear calificación pendiente
            const rating = await (0, core_2.createPendingRating)(saleData.tenantId, docRef.id, saleData.vehicleId, saleData.sellerId, dealerId, saleData.buyer.email, saleData.buyer.fullName);
            // Enviar email con encuesta
            const emailService = new messaging_1.EmailService(process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY || '', process.env.RESEND_API_KEY ? 'resend' : 'sendgrid');
            const surveyUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/survey/${rating.surveyToken}`;
            await emailService.sendEmail({
                tenantId: saleData.tenantId,
                channel: 'email',
                direction: 'outbound',
                from: 'noreply@autodealers.com',
                to: saleData.buyer.email,
                content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4F46E5;">¡Gracias por tu compra!</h2>
            <p>Estimado/a ${saleData.buyer.fullName},</p>
            <p>Gracias por confiar en nosotros para tu compra. Tu opinión es muy importante para nosotros.</p>
            <p>Por favor, tómate un momento para calificar tu experiencia con nuestro servicio:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${surveyUrl}" 
                 style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Calificar Servicio
              </a>
            </div>
            <p style="color: #666; font-size: 12px;">
              Este enlace expirará en 30 días.
            </p>
          </div>
        `,
                metadata: {
                    subject: 'Califica tu experiencia de compra - AutoDealers',
                },
            });
        }
        catch (error) {
            console.error('Error creating rating or sending email:', error);
            // No fallar la venta si hay error en la calificación
        }
    }
    // Crear recordatorios post-venta si está habilitado
    if (saleData.enableReminders && saleData.selectedReminders && saleData.selectedReminders.length > 0) {
        // Si hay información del comprador, crear o actualizar el lead primero
        let customerId = saleData.leadId;
        if (saleData.buyer && !customerId) {
            // Crear un nuevo lead con la información del comprador
            const leadRef = db
                .collection('tenants')
                .doc(saleData.tenantId)
                .collection('leads')
                .doc();
            await leadRef.set({
                contact: {
                    name: saleData.buyer.fullName,
                    phone: saleData.buyer.phone,
                    email: saleData.buyer.email,
                },
                address: saleData.buyer.address,
                status: 'sold',
                source: 'sale',
                assignedTo: saleData.sellerId,
                vehicleId: saleData.vehicleId,
                saleId: docRef.id,
                metadata: {
                    driverLicenseNumber: saleData.buyer.driverLicenseNumber,
                    vehiclePlate: saleData.buyer.vehiclePlate,
                },
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            customerId = leadRef.id;
        }
        if (customerId) {
            // Obtener información del vendedor para incluir en los recordatorios
            const sellerDoc = await db.collection('users').doc(saleData.sellerId).get();
            const sellerData = sellerDoc.exists ? sellerDoc.data() : null;
            // Crear recordatorios con los tipos seleccionados
            await (0, post_sale_1.createPostSaleReminders)(saleData.tenantId, docRef.id, customerId, saleData.vehicleId, saleData.selectedReminders);
            // Actualizar el lead con información del vendedor si existe
            if (sellerData && customerId) {
                await db
                    .collection('tenants')
                    .doc(saleData.tenantId)
                    .collection('leads')
                    .doc(customerId)
                    .update({
                    assignedTo: saleData.sellerId,
                    sellerInfo: {
                        id: saleData.sellerId,
                        name: sellerData.name || sellerData.email,
                        email: sellerData.email,
                    },
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
        }
    }
    // Crear Customer File automáticamente si hay información del comprador
    if (saleData.buyer) {
        // Obtener información del vendedor
        const sellerDoc = await db.collection('users').doc(saleData.sellerId).get();
        const sellerData = sellerDoc.exists ? sellerDoc.data() : null;
        let customerId = saleData.leadId;
        // Si no hay leadId, buscar o crear uno
        if (!customerId) {
            // Buscar lead existente por email o teléfono
            const existingLead = await db
                .collection('tenants')
                .doc(saleData.tenantId)
                .collection('leads')
                .where('contact.email', '==', saleData.buyer.email)
                .limit(1)
                .get();
            if (!existingLead.empty) {
                customerId = existingLead.docs[0].id;
            }
            else {
                // Crear nuevo lead
                const leadRef = db
                    .collection('tenants')
                    .doc(saleData.tenantId)
                    .collection('leads')
                    .doc();
                await leadRef.set({
                    contact: {
                        name: saleData.buyer.fullName,
                        phone: saleData.buyer.phone,
                        email: saleData.buyer.email,
                    },
                    address: saleData.buyer.address,
                    status: 'sold',
                    source: 'sale',
                    assignedTo: saleData.sellerId,
                    vehicleId: saleData.vehicleId,
                    saleId: docRef.id,
                    metadata: {
                        driverLicenseNumber: saleData.buyer.driverLicenseNumber,
                        vehiclePlate: saleData.buyer.vehiclePlate,
                    },
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                customerId = leadRef.id;
            }
        }
        // Crear Customer File
        await (0, customer_files_1.createCustomerFile)(saleData.tenantId, docRef.id, customerId, saleData.buyer, saleData.vehicleId, saleData.sellerId, sellerData ? {
            id: saleData.sellerId,
            name: sellerData.name || sellerData.email,
            email: sellerData.email,
        } : undefined);
    }
    // Obtener información del vehículo y vendedor para la notificación
    try {
        const { getVehicleById } = await Promise.resolve().then(() => __importStar(require('@autodealers/inventory')));
        const vehicle = await getVehicleById(saleData.tenantId, saleData.vehicleId);
        const sellerDoc = await db.collection('users').doc(saleData.sellerId).get();
        const sellerName = sellerDoc.data()?.name || 'Vendedor';
        const vehicleInfo = vehicle
            ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
            : 'Vehículo';
        // Notificar a gerentes y administradores sobre la venta completada (asíncrono, no bloquea)
        const { notifyManagersAndAdmins } = await Promise.resolve().then(() => __importStar(require('@autodealers/core')));
        await notifyManagersAndAdmins(saleData.tenantId, {
            type: 'sale_completed',
            title: 'Venta Completada',
            message: `¡Venta completada! ${vehicleInfo} vendido a ${saleData.buyer?.fullName || 'Cliente'} por $${saleData.salePrice || saleData.price || 0} (Vendedor: ${sellerName}).`,
            metadata: {
                saleId: docRef.id,
                vehicleId: saleData.vehicleId,
                vehicleInfo,
                sellerId: saleData.sellerId,
                sellerName,
                buyerName: saleData.buyer?.fullName,
                salePrice: saleData.salePrice || saleData.price || 0,
            },
        });
    }
    catch (error) {
        // No fallar si las notificaciones no están disponibles
        console.warn('Manager notification skipped for completed sale:', error);
    }
    return {
        id: docRef.id,
        ...saleData,
        createdAt: new Date(),
    };
}
/**
 * Obtiene una venta por ID
 */
async function getSaleById(tenantId, saleId) {
    const saleDoc = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('sales')
        .doc(saleId)
        .get();
    if (!saleDoc.exists) {
        return null;
    }
    const data = saleDoc.data();
    return {
        id: saleDoc.id,
        ...data,
        createdAt: data?.createdAt?.toDate() || new Date(),
        completedAt: data?.completedAt?.toDate(),
    };
}
/**
 * Obtiene ventas de un vendedor
 */
async function getSalesBySeller(tenantId, sellerId, startDate, endDate) {
    let query = db
        .collection('tenants')
        .doc(tenantId)
        .collection('sales')
        .where('sellerId', '==', sellerId);
    if (startDate) {
        query = query.where('createdAt', '>=', startDate);
    }
    if (endDate) {
        query = query.where('createdAt', '<=', endDate);
    }
    query = query.orderBy('createdAt', 'desc');
    const snapshot = await query.get();
    return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data?.createdAt?.toDate() || new Date(),
            completedAt: data?.completedAt?.toDate(),
        };
    });
}
/**
 * Obtiene ventas de un tenant
 */
async function getTenantSales(tenantId, filters) {
    let query = db
        .collection('tenants')
        .doc(tenantId)
        .collection('sales');
    if (filters?.status) {
        query = query.where('status', '==', filters.status);
    }
    if (filters?.startDate) {
        query = query.where('createdAt', '>=', filters.startDate);
    }
    if (filters?.endDate) {
        query = query.where('createdAt', '<=', filters.endDate);
    }
    query = query.orderBy('createdAt', 'desc');
    const snapshot = await query.get();
    return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data?.createdAt?.toDate() || new Date(),
            completedAt: data?.completedAt?.toDate(),
        };
    });
}
/**
 * Completa una venta
 */
async function completeSale(tenantId, saleId, documents) {
    const updateData = {
        status: 'completed',
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (documents) {
        updateData.documents = documents;
    }
    await db
        .collection('tenants')
        .doc(tenantId)
        .collection('sales')
        .doc(saleId)
        .update(updateData);
}
/**
 * Calcula comisión de una venta
 */
function calculateCommission(salePrice, commissionRate) {
    return salePrice * (commissionRate / 100);
}
//# sourceMappingURL=sales.js.map