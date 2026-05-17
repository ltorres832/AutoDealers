"use strict";
// Firebase Admin - Solo para uso en servidor
// Este archivo debe importarse solo en código del servidor (API routes, Server Components, etc.)
// Re-exporta desde firebase.ts para mantener compatibilidad
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStorage = exports.getAuth = exports.getFirestore = exports.initializeFirebase = void 0;
var firebase_1 = require("./firebase");
Object.defineProperty(exports, "initializeFirebase", { enumerable: true, get: function () { return firebase_1.initializeFirebase; } });
Object.defineProperty(exports, "getFirestore", { enumerable: true, get: function () { return firebase_1.getFirestore; } });
Object.defineProperty(exports, "getAuth", { enumerable: true, get: function () { return firebase_1.getAuth; } });
Object.defineProperty(exports, "getStorage", { enumerable: true, get: function () { return firebase_1.getStorage; } });
