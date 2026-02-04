"use strict";
// Inventory Module - Gestión de Inventario
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
// Exportaciones compatibles con cliente (sin dependencias de servidor)
__exportStar(require("./types"), exports);
__exportStar(require("./vehicle-types"), exports);
// Exportaciones solo para servidor (no deben importarse en componentes cliente)
// Estas exportaciones solo deben usarse en API routes o Server Components
__exportStar(require("./vehicles"), exports);
__exportStar(require("./storage"), exports);
//# sourceMappingURL=index.js.map