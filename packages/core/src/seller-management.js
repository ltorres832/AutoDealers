var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var seller_management_exports = {};
__export(seller_management_exports, {
  adminCancelSeller: () => adminCancelSeller,
  adminReactivateSeller: () => adminReactivateSeller,
  adminSuspendSeller: () => adminSuspendSeller,
  deleteSeller: () => deleteSeller,
  getAllSellersForAdmin: () => getAllSellersForAdmin,
  getSellersByDealer: () => getSellersByDealer,
  reactivateSeller: () => reactivateSeller,
  suspendSeller: () => suspendSeller
});
module.exports = __toCommonJS(seller_management_exports);
var import_shared = require("@autodealers/shared");
var admin = __toESM(require("firebase-admin"));
function getDb() {
  return (0, import_shared.getFirestore)();
}
const db = (0, import_shared.getFirestore)();
const auth = (0, import_shared.getAuth)();
async function getSellersByDealer(dealerId) {
  const snapshot = await getDb().collection("users").where("dealerId", "==", dealerId).where("role", "==", "seller").get();
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate() || /* @__PURE__ */ new Date(),
      updatedAt: data?.updatedAt?.toDate() || /* @__PURE__ */ new Date(),
      lastLogin: data?.lastLogin?.toDate()
    };
  });
}
async function suspendSeller(dealerId, sellerId) {
  const seller = await getDb().collection("users").doc(sellerId).get();
  const sellerData = seller.data();
  if (!seller.exists || sellerData?.dealerId !== dealerId) {
    throw new Error("Vendedor no encontrado o no pertenece a este dealer");
  }
  if (sellerData?.role !== "seller") {
    throw new Error("El usuario no es un vendedor");
  }
  await getDb().collection("users").doc(sellerId).update({
    status: "suspended",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    suspendedAt: admin.firestore.FieldValue.serverTimestamp(),
    suspendedBy: dealerId
  });
  await auth.updateUser(sellerId, { disabled: true });
}
async function reactivateSeller(dealerId, sellerId) {
  const seller = await getDb().collection("users").doc(sellerId).get();
  const sellerData = seller.data();
  if (!seller.exists || sellerData?.dealerId !== dealerId) {
    throw new Error("Vendedor no encontrado o no pertenece a este dealer");
  }
  await getDb().collection("users").doc(sellerId).update({
    status: "active",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    reactivatedAt: admin.firestore.FieldValue.serverTimestamp(),
    reactivatedBy: dealerId
  });
  await auth.updateUser(sellerId, { disabled: false });
}
function normalizeSellerDoc(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: data?.createdAt?.toDate?.() || /* @__PURE__ */ new Date(),
    updatedAt: data?.updatedAt?.toDate?.() || /* @__PURE__ */ new Date(),
    lastLogin: data?.lastLogin?.toDate?.()
  };
}
async function getAllSellersForAdmin(filters = {}) {
  const snapshot = await getDb().collection("users").where("role", "==", "seller").get();
  let rows = snapshot.docs.map((doc) => normalizeSellerDoc(doc));
  if (filters.dealerId) {
    const did = filters.dealerId.trim();
    rows = rows.filter(
      (s) => s.dealerId === did || !s.dealerId && s.tenantId === did
    );
  }
  if (filters.status) {
    rows = rows.filter((s) => (s.status || "active") === filters.status);
  }
  if (filters.search) {
    const q = filters.search.trim().toLowerCase();
    rows = rows.filter(
      (s) => (s.name || "").toLowerCase().includes(q) || (s.email || "").toLowerCase().includes(q) || (s.id || "").toLowerCase().includes(q)
    );
  }
  const tenantIds = /* @__PURE__ */ new Set();
  for (const s of rows) {
    if (s.tenantId) tenantIds.add(s.tenantId);
    if (s.dealerId) tenantIds.add(s.dealerId);
  }
  const tenantNames = /* @__PURE__ */ new Map();
  const idList = [...tenantIds].slice(0, 200);
  await Promise.all(
    idList.map(async (tid) => {
      try {
        const snap = await getDb().collection("tenants").doc(tid).get();
        if (snap.exists) {
          const d = snap.data();
          tenantNames.set(tid, {
            name: d?.name || d?.companyName || tid,
            type: d?.type,
            ownerId: d?.ownerId || void 0
          });
        }
      } catch {
      }
    })
  );
  const enriched = rows.map((s) => {
    const tenantMeta = s.tenantId ? tenantNames.get(s.tenantId) : void 0;
    const isIndependentSeller = tenantMeta?.type === "seller" && tenantMeta?.ownerId === s.id;
    return {
      ...s,
      tenantName: s.tenantId ? tenantNames.get(s.tenantId)?.name ?? null : null,
      tenantType: tenantMeta?.type ?? null,
      tenantOwnerId: tenantMeta?.ownerId ?? null,
      isIndependentSeller,
      dealerName: s.dealerId ? tenantNames.get(s.dealerId)?.name ?? null : null
    };
  });
  let filtered = enriched;
  if (filters.linkType === "independent") {
    filtered = enriched.filter((s) => s.isIndependentSeller || !s.dealerId);
  } else if (filters.linkType === "linked") {
    filtered = enriched.filter((s) => !!s.dealerId && !s.isIndependentSeller);
  }
  filtered.sort((a, b) => (a.name || "").localeCompare(b.name || "", "es"));
  return filtered;
}
async function assertSellerUser(sellerId) {
  const seller = await getDb().collection("users").doc(sellerId).get();
  const sellerData = seller.data();
  if (!seller.exists || sellerData?.role !== "seller") {
    throw new Error("El usuario no es un vendedor o no existe");
  }
  return sellerData;
}
async function adminSuspendSeller(sellerId, adminUserId) {
  await assertSellerUser(sellerId);
  await getDb().collection("users").doc(sellerId).update({
    status: "suspended",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    suspendedAt: admin.firestore.FieldValue.serverTimestamp(),
    suspendedBy: adminUserId
  });
  await auth.updateUser(sellerId, { disabled: true });
}
async function adminReactivateSeller(sellerId, adminUserId) {
  await assertSellerUser(sellerId);
  await getDb().collection("users").doc(sellerId).update({
    status: "active",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    reactivatedAt: admin.firestore.FieldValue.serverTimestamp(),
    reactivatedBy: adminUserId
  });
  await auth.updateUser(sellerId, { disabled: false });
}
async function adminCancelSeller(sellerId, adminUserId) {
  const sellerData = await assertSellerUser(sellerId);
  await getDb().collection("users").doc(sellerId).update({
    status: "cancelled",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    deletedAt: admin.firestore.FieldValue.serverTimestamp(),
    deletedBy: adminUserId
  });
  await auth.updateUser(sellerId, { disabled: true });
  const tenantId = sellerData.tenantId;
  if (tenantId) {
    const t = await getDb().collection("tenants").doc(tenantId).get();
    if (t.exists && t.data()?.type === "seller") {
      await getDb().collection("tenants").doc(tenantId).update({
        status: "cancelled",
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  }
}
async function deleteSeller(dealerId, sellerId) {
  const seller = await getDb().collection("users").doc(sellerId).get();
  const sellerData = seller.data();
  if (!seller.exists || sellerData?.dealerId !== dealerId) {
    throw new Error("Vendedor no encontrado o no pertenece a este dealer");
  }
  if (sellerData?.role !== "seller") {
    throw new Error("El usuario no es un vendedor");
  }
  await getDb().collection("users").doc(sellerId).update({
    status: "cancelled",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    deletedAt: admin.firestore.FieldValue.serverTimestamp(),
    deletedBy: dealerId
  });
  await auth.updateUser(sellerId, { disabled: true });
  if (sellerData?.tenantId) {
    await getDb().collection("tenants").doc(sellerData.tenantId).update({
      status: "cancelled",
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  adminCancelSeller,
  adminReactivateSeller,
  adminSuspendSeller,
  deleteSeller,
  getAllSellersForAdmin,
  getSellersByDealer,
  reactivateSeller,
  suspendSeller
});
