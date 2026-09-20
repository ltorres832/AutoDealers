// Módulos del DMS AutoDealers + plantillas de departamento + helpers de acceso

export const DMS_MODULES = [
  'inventory',
  'crm_leads',
  'sales',
  'contracts',
  'fi',
  'service',
  'parts',
  'finance',
  'hr_compensation',
  'voice',
  'marketing_social',
  'integrations',
  'settings_users',
  'reports',
] as const;

export type DmsModuleId = (typeof DMS_MODULES)[number];

export type DmsModuleAccess = 'none' | 'read' | 'write' | 'manage';

export type DmsModulePermissions = Partial<Record<DmsModuleId, DmsModuleAccess>>;

export const DMS_MODULE_LABELS: Record<DmsModuleId, string> = {
  inventory: 'Inventario',
  crm_leads: 'CRM / Leads',
  sales: 'Ventas',
  contracts: 'Contratos',
  fi: 'F&I',
  service: 'Servicio / Taller',
  parts: 'Piezas',
  finance: 'Finanzas',
  hr_compensation: 'RR.HH. / Compensación',
  voice: 'Agente de Voz',
  marketing_social: 'Marketing / Redes',
  integrations: 'Integraciones',
  settings_users: 'Usuarios / Equipo',
  reports: 'Reportes',
};

/** Plantillas de departamento: el dealer asigna una y puede override módulo a módulo */
export const DMS_DEPARTMENT_TEMPLATES: Record<
  string,
  { label: string; modules: DmsModulePermissions }
> = {
  owner: {
    label: 'Propietario / Admin dealer',
    modules: Object.fromEntries(DMS_MODULES.map((m) => [m, 'manage'])) as DmsModulePermissions,
  },
  sales: {
    label: 'Ventas',
    modules: {
      inventory: 'read',
      crm_leads: 'write',
      sales: 'write',
      contracts: 'write',
      fi: 'read',
      hr_compensation: 'read',
      reports: 'read',
      marketing_social: 'read',
    },
  },
  fi: {
    label: 'F&I',
    modules: {
      crm_leads: 'read',
      sales: 'read',
      contracts: 'read',
      fi: 'manage',
      finance: 'read',
      reports: 'read',
    },
  },
  service: {
    label: 'Taller / Servicio',
    modules: {
      inventory: 'read',
      crm_leads: 'read',
      service: 'manage',
      parts: 'write',
      finance: 'read',
    },
  },
  parts: {
    label: 'Piezas',
    modules: {
      parts: 'manage',
      service: 'read',
      inventory: 'read',
      finance: 'read',
    },
  },
  finance: {
    label: 'Finanzas',
    modules: {
      finance: 'manage',
      sales: 'read',
      fi: 'read',
      service: 'read',
      parts: 'read',
      hr_compensation: 'manage',
      reports: 'manage',
    },
  },
  hr: {
    label: 'RR.HH.',
    modules: {
      hr_compensation: 'manage',
      settings_users: 'write',
      reports: 'read',
      sales: 'read',
    },
  },
  marketing: {
    label: 'Marketing',
    modules: {
      marketing_social: 'manage',
      inventory: 'read',
      crm_leads: 'read',
      voice: 'write',
      reports: 'read',
    },
  },
};

const ACCESS_RANK: Record<DmsModuleAccess, number> = {
  none: 0,
  read: 1,
  write: 2,
  manage: 3,
};

export function normalizeModuleAccess(value: unknown): DmsModuleAccess {
  if (value === 'read' || value === 'write' || value === 'manage') return value;
  if (value === true) return 'write';
  return 'none';
}

/** Une plantilla + overrides del usuario */
export function resolveDmsPermissions(input: {
  role?: string;
  departmentTemplate?: string | null;
  modulePermissions?: DmsModulePermissions | null;
  /** Legacy canManage* flags */
  legacyPermissions?: Record<string, boolean> | null;
}): DmsModulePermissions {
  const role = String(input.role || '');
  if (role === 'dealer' || role === 'master_dealer' || role === 'admin' || role === 'dealer_admin') {
    return { ...DMS_DEPARTMENT_TEMPLATES.owner.modules };
  }

  const fromTemplate =
    (input.departmentTemplate && DMS_DEPARTMENT_TEMPLATES[input.departmentTemplate]?.modules) ||
    {};
  const overrides = input.modulePermissions || {};
  const merged: DmsModulePermissions = { ...fromTemplate, ...overrides };

  // Retrocompat: flags antiguos
  const legacy = input.legacyPermissions || {};
  if (legacy.canManageInventory && !merged.inventory) merged.inventory = 'write';
  if (legacy.canManageLeads && !merged.crm_leads) merged.crm_leads = 'write';
  if (legacy.canViewReports && !merged.reports) merged.reports = 'read';
  if (legacy.canManageIntegrations && !merged.integrations) merged.integrations = 'write';
  if (legacy.canManageUsers && !merged.settings_users) merged.settings_users = 'manage';
  if (legacy.canManageCampaigns && !merged.marketing_social) merged.marketing_social = 'write';

  // Vendedor sin plantilla: acceso ventas + su compensación
  if (role === 'seller' && Object.keys(merged).length === 0) {
    return {
      inventory: 'write',
      crm_leads: 'write',
      sales: 'write',
      contracts: 'write',
      fi: 'write',
      hr_compensation: 'read',
      reports: 'read',
      marketing_social: 'write',
      voice: 'write',
    };
  }

  return merged;
}

export function hasDmsAccess(
  perms: DmsModulePermissions | null | undefined,
  moduleId: DmsModuleId,
  minimum: DmsModuleAccess = 'read'
): boolean {
  const current = normalizeModuleAccess(perms?.[moduleId]);
  return ACCESS_RANK[current] >= ACCESS_RANK[minimum];
}
