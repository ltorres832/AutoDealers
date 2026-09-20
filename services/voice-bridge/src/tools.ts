// Ejecución de herramientas del agente de voz (function calling)
// Todas leen/escriben datos reales de la plataforma.

import {
  addPurchaseBlocker,
  markBlockerCongratulated,
  saveLeadConversationMemory,
  getLeadConversationMemory,
  type CallOutcome,
} from '@autodealers/voice';

export interface ToolContext {
  tenantId: string;
  leadId?: string;
  callLogId: string;
  assignedTo?: string;
  serviceSlotMinutes: number;
}

export interface ToolResult {
  ok: boolean;
  data?: any;
  error?: string;
}

export interface EndCallData {
  summary: string;
  nextSteps?: string[];
  outcome: CallOutcome;
}

export class ToolExecutor {
  private ctx: ToolContext;
  identityConfirmed = false;
  disclosureGiven = false;
  endCallData: EndCallData | null = null;

  constructor(ctx: ToolContext) {
    this.ctx = ctx;
  }

  /** Actualiza el leadId si se identificó al cliente durante la llamada (inbound). */
  setLead(leadId: string, assignedTo?: string) {
    this.ctx.leadId = leadId;
    if (assignedTo) this.ctx.assignedTo = assignedTo;
  }

  get leadId(): string | undefined {
    return this.ctx.leadId;
  }

  async execute(name: string, args: any): Promise<ToolResult> {
    try {
      switch (name) {
        case 'confirmIdentityAndDisclosure':
          this.identityConfirmed = args?.identityConfirmed === true;
          this.disclosureGiven = true;
          return { ok: true, data: { registered: true } };

        case 'findLeadByPhone':
          return await this.findLeadByPhone(String(args?.phone || ''));

        case 'listAvailableInventory':
          return await this.listAvailableInventory(args || {});

        case 'getActivePromotions':
          return await this.getActivePromotions();

        case 'checkAppointmentAvailability':
          return await this.checkAppointmentAvailability(String(args?.date || ''));

        case 'createAppointment':
          return await this.createAppointment(args || {});

        case 'createServiceAppointment':
          return await this.createServiceAppointment(args || {});

        case 'recordPurchaseBlocker':
          return await this.recordPurchaseBlocker(String(args?.description || ''));

        case 'markBlockerCongratulated':
          return await this.markCongratulated(String(args?.blockerId || ''));

        case 'saveMemoryNote':
          return await this.saveMemoryNote(args || {});

        case 'requestCallback':
          return await this.requestCallback(args || {});

        case 'markDoNotCall':
          return await this.markDoNotCall();

        case 'endCallSummary':
          this.endCallData = {
            summary: String(args?.summary || ''),
            nextSteps: Array.isArray(args?.nextSteps) ? args.nextSteps.map(String) : [],
            outcome: (args?.outcome || 'other') as CallOutcome,
          };
          return { ok: true, data: { registered: true } };

        default:
          return { ok: false, error: `Herramienta desconocida: ${name}` };
      }
    } catch (error: any) {
      console.error(`[voice-bridge] Error ejecutando ${name}:`, error);
      return { ok: false, error: error?.message || 'Error interno' };
    }
  }

  private async findLeadByPhone(phone: string): Promise<ToolResult> {
    if (!phone) return { ok: false, error: 'Teléfono requerido' };
    const crm: any = await import('@autodealers/crm');
    const lead = await crm.findLeadByPhoneInTenant(this.ctx.tenantId, phone);
    if (!lead) {
      return { ok: true, data: { found: false, message: 'Cliente nuevo, sin historial.' } };
    }
    this.setLead(lead.id, lead.assignedTo);
    const memory = await getLeadConversationMemory(this.ctx.tenantId, lead.id);
    return {
      ok: true,
      data: {
        found: true,
        name: lead.contact?.name,
        vehicleInterest: lead.vehicleInterest || null,
        status: lead.status,
        memory: memory
          ? {
              preferredName: memory.preferredName,
              runningSummary: memory.runningSummary,
              purchaseBlockers: memory.purchaseBlockers,
              preferences: memory.preferences,
            }
          : null,
      },
    };
  }

  private async listAvailableInventory(args: {
    make?: string;
    model?: string;
    maxPrice?: number;
    minYear?: number;
    limit?: number;
  }): Promise<ToolResult> {
    const inventory: any = await import('@autodealers/inventory');
    const vehicles = await inventory.getVehicles(this.ctx.tenantId, { status: 'available' });
    let filtered = (vehicles || []).filter((v: any) => v.status === 'available' || !v.status);
    if (args.make) {
      const make = args.make.toLowerCase();
      filtered = filtered.filter((v: any) => String(v.make || '').toLowerCase().includes(make));
    }
    if (args.model) {
      const model = args.model.toLowerCase();
      filtered = filtered.filter((v: any) => String(v.model || '').toLowerCase().includes(model));
    }
    if (args.maxPrice) {
      filtered = filtered.filter((v: any) => Number(v.price || 0) <= args.maxPrice!);
    }
    if (args.minYear) {
      filtered = filtered.filter((v: any) => Number(v.year || 0) >= args.minYear!);
    }
    const limit = Math.min(args.limit || 5, 10);
    const results = filtered.slice(0, limit).map((v: any) => ({
      id: v.id,
      year: v.year,
      make: v.make,
      model: v.model,
      trim: v.trim || null,
      price: v.price,
      mileage: v.mileage || null,
      color: v.exteriorColor || v.color || null,
      stockNumber: v.stockNumber || null,
    }));
    return { ok: true, data: { count: filtered.length, vehicles: results } };
  }

  private async getActivePromotions(): Promise<ToolResult> {
    const core: any = await import('@autodealers/core');
    const promotions = await core.getActivePromotions(this.ctx.tenantId);
    return {
      ok: true,
      data: {
        promotions: (promotions || []).slice(0, 5).map((p: any) => ({
          title: p.title || p.name,
          description: p.description,
          validUntil: p.endDate || p.validUntil || null,
        })),
      },
    };
  }

  private async checkAppointmentAvailability(date: string): Promise<ToolResult> {
    if (!date) return { ok: false, error: 'Fecha requerida' };
    const crm: any = await import('@autodealers/crm');
    const dayStart = new Date(`${date}T08:00:00`);
    const slots: string[] = [];
    for (let hour = 9; hour <= 17; hour++) {
      const slot = new Date(dayStart);
      slot.setHours(hour, 0, 0, 0);
      if (slot.getTime() < Date.now()) continue;
      try {
        const available = await crm.checkAvailability(
          this.ctx.tenantId,
          this.ctx.assignedTo || '',
          slot,
          60
        );
        if (available) slots.push(`${String(hour).padStart(2, '0')}:00`);
      } catch {
        slots.push(`${String(hour).padStart(2, '0')}:00`);
      }
      if (slots.length >= 5) break;
    }
    return { ok: true, data: { date, availableSlots: slots } };
  }

  private async createAppointment(args: {
    type?: string;
    scheduledAt?: string;
    vehicleId?: string;
    notes?: string;
  }): Promise<ToolResult> {
    if (!this.ctx.leadId) return { ok: false, error: 'No hay lead identificado para la cita' };
    if (!args.scheduledAt) return { ok: false, error: 'Fecha y hora requeridas' };
    const scheduledAt = new Date(args.scheduledAt);
    if (isNaN(scheduledAt.getTime())) return { ok: false, error: 'Fecha inválida' };

    const crm: any = await import('@autodealers/crm');
    const appointment = await crm.createAppointment({
      tenantId: this.ctx.tenantId,
      leadId: this.ctx.leadId,
      assignedTo: this.ctx.assignedTo || 'voice-agent',
      vehicleIds: args.vehicleId ? [args.vehicleId] : [],
      type: args.type === 'test_drive' ? 'test_drive' : 'consultation',
      scheduledAt,
      duration: 60,
      status: 'scheduled',
      notes: `${args.notes || ''}\n(Agendada por el agente de voz, llamada ${this.ctx.callLogId})`.trim(),
    });
    return {
      ok: true,
      data: {
        appointmentId: appointment.id,
        scheduledAt: scheduledAt.toISOString(),
        message: 'Cita creada. Confírmale al cliente fecha y hora.',
      },
    };
  }

  private async createServiceAppointment(args: {
    serviceType?: string;
    scheduledAt?: string;
    vehicleDescription?: string;
    notes?: string;
  }): Promise<ToolResult> {
    if (!this.ctx.leadId) return { ok: false, error: 'No hay lead identificado para la cita' };
    if (!args.scheduledAt) return { ok: false, error: 'Fecha y hora requeridas' };
    const scheduledAt = new Date(args.scheduledAt);
    if (isNaN(scheduledAt.getTime())) return { ok: false, error: 'Fecha inválida' };

    const crm: any = await import('@autodealers/crm');
    const appointment = await crm.createAppointment({
      tenantId: this.ctx.tenantId,
      leadId: this.ctx.leadId,
      assignedTo: this.ctx.assignedTo || 'voice-agent',
      vehicleIds: [],
      type: 'service',
      scheduledAt,
      duration: this.ctx.serviceSlotMinutes || 60,
      status: 'scheduled',
      notes: `Servicio: ${args.serviceType || 'general'}. Vehículo: ${args.vehicleDescription || 'no indicado'}. ${args.notes || ''}\n(Agendada por el agente de voz)`.trim(),
    });
    return {
      ok: true,
      data: { appointmentId: appointment.id, scheduledAt: scheduledAt.toISOString() },
    };
  }

  private async recordPurchaseBlocker(description: string): Promise<ToolResult> {
    if (!this.ctx.leadId) return { ok: false, error: 'No hay lead identificado' };
    if (!description) return { ok: false, error: 'Descripción requerida' };
    const blocker = await addPurchaseBlocker(this.ctx.tenantId, this.ctx.leadId, description);
    return { ok: true, data: { blockerId: blocker.id } };
  }

  private async markCongratulated(blockerId: string): Promise<ToolResult> {
    if (!this.ctx.leadId || !blockerId) return { ok: false, error: 'Datos incompletos' };
    await markBlockerCongratulated(this.ctx.tenantId, this.ctx.leadId, blockerId);
    return { ok: true, data: { done: true } };
  }

  private async saveMemoryNote(args: {
    kind?: string;
    key?: string;
    value?: string;
  }): Promise<ToolResult> {
    if (!this.ctx.leadId) return { ok: false, error: 'No hay lead identificado' };
    const value = String(args.value || '').trim();
    if (!value) return { ok: false, error: 'Valor requerido' };
    const memory = await getLeadConversationMemory(this.ctx.tenantId, this.ctx.leadId);

    switch (args.kind) {
      case 'preferredName':
        await saveLeadConversationMemory(this.ctx.tenantId, this.ctx.leadId, {
          preferredName: value,
        });
        break;
      case 'preference': {
        const preferences = { ...(memory?.preferences || {}), [args.key || 'general']: value };
        await saveLeadConversationMemory(this.ctx.tenantId, this.ctx.leadId, { preferences });
        break;
      }
      case 'vehicleDiscussed': {
        const vehiclesDiscussed = Array.from(
          new Set([...(memory?.vehiclesDiscussed || []), value])
        );
        await saveLeadConversationMemory(this.ctx.tenantId, this.ctx.leadId, { vehiclesDiscussed });
        break;
      }
      default: {
        const personalContext = [...(memory?.personalContext || []), value].slice(-20);
        await saveLeadConversationMemory(this.ctx.tenantId, this.ctx.leadId, { personalContext });
      }
    }
    return { ok: true, data: { saved: true } };
  }

  private async requestCallback(args: { preferredTime?: string; reason?: string }): Promise<ToolResult> {
    if (!this.ctx.leadId) return { ok: false, error: 'No hay lead identificado' };
    const crm: any = await import('@autodealers/crm');
    await crm.addInteraction(this.ctx.tenantId, this.ctx.leadId, {
      type: 'note',
      content: `El cliente pidió que un vendedor le devuelva la llamada${args.preferredTime ? ` (${args.preferredTime})` : ''}. ${args.reason || ''}`.trim(),
      userId: 'voice-agent',
    });
    try {
      const core: any = await import('@autodealers/core');
      if (this.ctx.assignedTo) {
        await core.createNotification({
          tenantId: this.ctx.tenantId,
          userId: this.ctx.assignedTo,
          type: 'callback_requested',
          title: 'Cliente pide que le devuelvan la llamada',
          message: `Solicitud desde el agente de voz${args.preferredTime ? ` — preferencia: ${args.preferredTime}` : ''}.`,
          metadata: { leadId: this.ctx.leadId, callLogId: this.ctx.callLogId, route: '/leads' },
        });
      }
    } catch (error) {
      console.warn('[voice-bridge] Notificación de callback omitida:', error);
    }
    return { ok: true, data: { registered: true } };
  }

  private async markDoNotCall(): Promise<ToolResult> {
    if (!this.ctx.leadId) return { ok: false, error: 'No hay lead identificado' };
    await saveLeadConversationMemory(this.ctx.tenantId, this.ctx.leadId, { doNotCall: true });
    const voice: any = await import('@autodealers/voice');
    await voice.cancelPendingCallsForLead(this.ctx.tenantId, this.ctx.leadId);
    return { ok: true, data: { registered: true } };
  }
}
