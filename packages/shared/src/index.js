"use strict";
// Shared components and utilities
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
exports.StripePaymentForm = exports.getFirestoreFieldValue = exports.getStorage = exports.getAuth = exports.getFirestore = exports.initializeFirebase = void 0;
// Firebase (Solo para uso en servidor, seguro para exportar gracias a dynamic require)
var firebase_1 = require("./firebase");
Object.defineProperty(exports, "initializeFirebase", { enumerable: true, get: function () { return firebase_1.initializeFirebase; } });
Object.defineProperty(exports, "getFirestore", { enumerable: true, get: function () { return firebase_1.getFirestore; } });
Object.defineProperty(exports, "getAuth", { enumerable: true, get: function () { return firebase_1.getAuth; } });
Object.defineProperty(exports, "getStorage", { enumerable: true, get: function () { return firebase_1.getStorage; } });
Object.defineProperty(exports, "getFirestoreFieldValue", { enumerable: true, get: function () { return firebase_1.getFirestoreFieldValue; } });
__exportStar(require("./firebase-server"), exports);
__exportStar(require("./components/Logo"), exports);
__exportStar(require("./components/Header"), exports);
__exportStar(require("./components/Sidebar"), exports);
__exportStar(require("./components/Footer"), exports);
__exportStar(require("./components/Card"), exports);
__exportStar(require("./components/Button"), exports);
__exportStar(require("./components/StatsCard"), exports);
__exportStar(require("./components/PageHeader"), exports);
var StripePaymentForm_1 = require("./components/StripePaymentForm");
Object.defineProperty(exports, "StripePaymentForm", { enumerable: true, get: function () { return StripePaymentForm_1.StripePaymentForm; } });
