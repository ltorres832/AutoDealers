import { Appointment, Reminder } from './types';
/**
 * Crea una nueva cita
 */
export declare function createAppointment(appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt' | 'reminders'>): Promise<Appointment>;
/**
 * Obtiene una cita por ID
 */
export declare function getAppointmentById(tenantId: string, appointmentId: string): Promise<Appointment | null>;
/**
 * Obtiene todas las citas de un tenant
 */
export declare function getAppointments(tenantId: string, startDate?: Date, endDate?: Date): Promise<Appointment[]>;
/**
 * Obtiene citas de un vendedor
 */
export declare function getAppointmentsBySeller(tenantId: string, sellerId: string, startDate?: Date, endDate?: Date): Promise<Appointment[]>;
/**
 * Obtiene citas de un lead
 */
export declare function getLeadAppointments(tenantId: string, leadId: string): Promise<Appointment[]>;
/**
 * Actualiza el estado de una cita
 */
export declare function updateAppointmentStatus(tenantId: string, appointmentId: string, status: Appointment['status']): Promise<void>;
/**
 * Cancela una cita
 */
export declare function cancelAppointment(tenantId: string, appointmentId: string, reason?: string): Promise<void>;
/**
 * Agrega un recordatorio a una cita
 */
export declare function addReminder(tenantId: string, appointmentId: string, reminder: Reminder): Promise<void>;
/**
 * Verifica disponibilidad de horario
 */
export declare function checkAvailability(tenantId: string, sellerId: string, scheduledAt: Date, duration: number): Promise<boolean>;
//# sourceMappingURL=appointments.d.ts.map