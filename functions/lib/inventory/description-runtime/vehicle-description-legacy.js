"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconcileLegacyVehicleDescription = reconcileLegacyVehicleDescription;
const vehicle_description_1 = require("./vehicle-description");
const vehicle_description_persistence_1 = require("./vehicle-description-persistence");
/** Bridges older clients that still write description directly. No AI request is made here. */
async function reconcileLegacyVehicleDescription(database, event) {
    const { before, after } = event;
    if (!after.exists)
        return;
    const previous = before.data() || {}, incoming = after.data();
    const serverCommit = incoming.descriptionUpdatedAt !== previous.descriptionUpdatedAt && incoming.description === incoming.masterDescription;
    if (serverCommit)
        return;
    if (before.exists && incoming.description === previous.description && (0, vehicle_description_1.descriptionInputKey)(incoming) === (0, vehicle_description_1.descriptionInputKey)(previous))
        return;
    const configSnapshot = await database.collection('system').doc('vehicle_descriptions').get();
    const config = { ...vehicle_description_1.DEFAULT_DESCRIPTION_CONFIG, ...configSnapshot.data() };
    await database.runTransaction(async (tx) => {
        const fresh = await tx.get(after.ref);
        // Firestore can deliver duplicate/out-of-order events. Never replace a newer write.
        if (!fresh.exists || !fresh.updateTime?.isEqual(after.updateTime))
            return;
        const text = typeof incoming.description === 'string' ? incoming.description : (0, vehicle_description_1.officialVehicleDescription)(incoming);
        const actor = { userId: event.authId || `legacy:${event.authType || 'unknown'}`, role: 'admin', tenantId: after.ref.parent.parent.id };
        const patch = await (0, vehicle_description_persistence_1.persistVehicleDescription)(database, tx, after.ref, before.exists ? previous : null, { ...incoming, masterDescription: text }, actor, {}, config);
        tx.update(after.ref, patch);
    });
}
