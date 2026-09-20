/**
 * True si el plan permite red multi-concesionario (gestionar varios dealers).
 * Unifica el nombre histórico `multipleDealers` (UI antigua) con `multiDealerEnabled` (seed / billing).
 */
export function membershipAllowsMultiDealerNetwork(features) {
    if (!features || typeof features !== 'object')
        return false;
    const f = features;
    return f.multiDealerEnabled === true || f.multipleDealers === true;
}
