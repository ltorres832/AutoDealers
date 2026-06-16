"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.membershipAllowsMultiDealerNetwork = membershipAllowsMultiDealerNetwork;
/**
 * True si el plan permite red multi-concesionario (gestionar varios dealers).
 * Unifica el nombre histórico `multipleDealers` (UI antigua) con `multiDealerEnabled` (seed / billing).
 */
function membershipAllowsMultiDealerNetwork(features) {
    if (!features || typeof features !== 'object')
        return false;
    const f = features;
    return f.multiDealerEnabled === true || f.multipleDealers === true;
}
