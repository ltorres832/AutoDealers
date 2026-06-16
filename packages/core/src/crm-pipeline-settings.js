"use strict";
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
exports.DEFAULT_CRM_PIPELINE_SETTINGS = exports.CRM_PIPELINE_STATUS_KEYS = void 0;
exports.normalizeCrmPipelineSettings = normalizeCrmPipelineSettings;
exports.getCrmPipelineSettings = getCrmPipelineSettings;
exports.saveCrmPipelineSettings = saveCrmPipelineSettings;
const shared_1 = require("@autodealers/shared");
const admin = __importStar(require("firebase-admin"));
/** Estados de lead alineados con `@autodealers/crm` / Firestore. */
exports.CRM_PIPELINE_STATUS_KEYS = [
    'new',
    'contacted',
    'qualified',
    'pre_qualified',
    'appointment',
    'test_drive',
    'negotiation',
    'closed',
    'lost',
];
const DOC_ID = 'crm_pipeline';
const DEFAULT_STAGES = [
    { status: 'new', label: 'Nuevos', color: 'blue', order: 0 },
    { status: 'contacted', label: 'Contactados', color: 'yellow', order: 1 },
    { status: 'qualified', label: 'Calificados', color: 'green', order: 2 },
    { status: 'pre_qualified', label: 'Pre-Calificados', color: 'purple', order: 3 },
    { status: 'appointment', label: 'Citas', color: 'indigo', order: 4 },
    { status: 'test_drive', label: 'Pruebas de manejo', color: 'pink', order: 5 },
    { status: 'negotiation', label: 'Negociación', color: 'orange', order: 6 },
    { status: 'closed', label: 'Cerrados', color: 'gray', order: 7 },
    { status: 'lost', label: 'Perdidos', color: 'red', order: 8 },
];
exports.DEFAULT_CRM_PIPELINE_SETTINGS = {
    enabled: true,
    stages: DEFAULT_STAGES,
};
const COLOR_KEYS = new Set([
    'blue',
    'yellow',
    'green',
    'purple',
    'indigo',
    'pink',
    'orange',
    'gray',
    'red',
]);
const STATUS_SET = new Set(exports.CRM_PIPELINE_STATUS_KEYS);
function clampOrder(n, max) {
    if (!Number.isFinite(n))
        return 0;
    return Math.max(0, Math.min(max, Math.floor(n)));
}
function normalizeCrmPipelineSettings(raw) {
    const d = (raw && typeof raw === 'object' ? raw : {});
    const enabled = d.enabled !== false;
    let stages = [];
    if (Array.isArray(d.stages)) {
        for (const row of d.stages) {
            if (!row || typeof row !== 'object')
                continue;
            const r = row;
            const status = typeof r.status === 'string' && STATUS_SET.has(r.status) ? r.status : null;
            if (!status)
                continue;
            const label = typeof r.label === 'string' && r.label.trim() ? r.label.trim().slice(0, 80) : status;
            const color = typeof r.color === 'string' && COLOR_KEYS.has(r.color) ? r.color : 'gray';
            const order = clampOrder(Number(r.order), 99);
            stages.push({ status: status, label, color, order });
        }
    }
    if (stages.length === 0) {
        stages = DEFAULT_STAGES.map((s) => ({ ...s }));
    }
    const byStatus = new Map(stages.map((s) => [s.status, s]));
    for (const def of DEFAULT_STAGES) {
        if (!byStatus.has(def.status)) {
            stages.push({ ...def });
        }
    }
    stages.sort((a, b) => a.order - b.order || exports.CRM_PIPELINE_STATUS_KEYS.indexOf(a.status) - exports.CRM_PIPELINE_STATUS_KEYS.indexOf(b.status));
    return { enabled, stages };
}
async function getCrmPipelineSettings() {
    const snap = await (0, shared_1.getFirestore)().collection('system_settings').doc(DOC_ID).get();
    if (!snap.exists) {
        return { ...exports.DEFAULT_CRM_PIPELINE_SETTINGS, stages: DEFAULT_STAGES.map((s) => ({ ...s })) };
    }
    return normalizeCrmPipelineSettings(snap.data());
}
async function saveCrmPipelineSettings(data, meta) {
    const normalized = normalizeCrmPipelineSettings(data);
    await (0, shared_1.getFirestore)()
        .collection('system_settings')
        .doc(DOC_ID)
        .set({
        ...normalized,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: meta.userId,
    }, { merge: true });
}
