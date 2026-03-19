
const admin = require('firebase-admin');

// Hardcoded for a one-time setup (from .env.local)
const serviceAccount = {
    projectId: "autodealers-7f62e",
    clientEmail: "firebase-adminsdk-fbsvc@autodealers-7f62e.iam.gserviceaccount.com",
    privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDO4lsWCkiU0WSo\nStqusL1iU1A++a+nVO/FGcm7h8dGwcg1bYRtK4Vs36Br1OVTgUqw4g3vkr2HRGc6\nQakXwcx0Wzf9mMQ1zpAjGGw1s8hYeYpOJUPT8rtWGKW+KdvBgLyhZTMVsH3Qe4yT\n0a7aNqXQAHYIT1BNcQ/zkF/QqguUy/uQnt28Xrt/sJNGepXicRfyJanvYPbqSeGf\nMkibmxwGacZPa3pEECPhjtpGT2fnpPvqq/gLJ2l+t7fIC26fGBbHA3DxxXKFjaZM\n1YOH8ZRnQZCTkLYlb3hbTQmPPlzQvRLOi4DCOi5ttk1dYgJ23GIKUBDq+DKAnAak\nvC1iglfHAgMBAAECggEAF6e3HYKIgQeeOEXy0jWgOe1nyAOZq4rhLYrAz8H7LaJ7\np2xBz4/B3kyFlb7Oh+lJJod6a3G+XQibuwQF9xLwMz+427TLfpGDVpf0y4Emf8NJ\n5pyJMGNZO0NvNBqqJ2p2ZwfguvKmuB9gWAiKMyY7eFiNJm8XMfujBMj1w7ClyVoC\nvEp8Cgbkt459cVDoRS66VPyNv6nKQVI/FT2DVnqeVFI3jCZR/1yA4BcQWoSdirMD\nTWIGyD/CapZrrOG3NIkFPeOgrTkZBJR3dlMHwKVfMQKFZJVPYbPKK5ohnbzTvNNT\nnDZ7SkpTY1yMb2nHBCCQpswDTghADl6BsyTocKmoEQKBgQD40WEIhYslsjlu8N8y\n+Radf1HushjQwL75R0bwpVPMNN+oIWmy2zGr5iPCLW85aPt2J3ZObSLHt3pu5jjM\nep46oql7uKHnuZNbvseVencMimwnKEO3Q229bhcTLcan1rgG+qEVUWUfU68SbNuX\nnkqZwZg5GLUxbdzNEW3VXEfY1wKBgQDU2xxpBQ2rwQXkTXbYnev18LRPf8dXKktM\qdJZyj54WtsbCpFCHeGe4/exkkZYBrJ5IDT9obBuhaKRnyyzdFu8X6DpfkrWoegU\nuKOG24LWfiBv2vSVSOZRmx+/wjgP7iVZdjQgSkIimjFTb4keYCAPvZV9Hf/EvMYW\n3Fe8W8TqkQKBgFTpNyDuWd8CZEEs6C5//KzAz1gS5Q8QR9vP7DChauhsPssko+qK\njPfpsNhKIwPHhND8hI4dBlp7jcecv1NgoPDHo+j5yB7JILWVdIzZXxkjf+cZAYrf\n8upLUIqV+445Y1HWY/Rfc4/uQfeauJGUTkcMXwNVIDh/EnPU99NxC3+/AoGAWV8q\nfZnmlI/2Jla0KN2d3mTTgHG5RAr5FNZVAOhe9G/JgYAdX3Jmci1rqb4uFPWy6BKy\nzS+fgbhQeu4nea3Ier54NLGXQKk4ZcLkvlHajK7mdbCscyXptqf4W65zlZS7T+XG\nmywyuo6dWVgCbaOUsqc6Zg87feJ5Fc4sdGTfuFECgYEAgRC94eND/F4Zrilt58sQ\nz9cmJB1Nv7NQ81O2goFiWhn8eXCCMYXCSLy4B/O71mXkmhZf7pzWAd6Xkgrbb1Gs\nRtRBMklcHu0GIHL20cCAML3jVuazAlVrm3Zm6c/C7q6f9QQG9MB4Vbbk8vTDAlcF\nHEO55QHqrIrJokQYy8kwPSQ=\n-----END PRIVATE KEY-----\n".replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.projectId,
    });
}

const db = admin.firestore();

async function runSeed() {
    console.log('🌱 Starting full seed...');

    // 1. Memberships
    console.log('💰 Seeding memberships...');
    const memberships = [
        { name: 'Gratis', type: 'free', price: 0, interval: 'month', features: ['3 anuncios activos', 'Estadísticas básicas'], status: 'active' },
        { name: 'Premium Dealer', type: 'dealer', price: 99, interval: 'month', features: ['Anuncios ilimitados', 'Dashboard avanzado', 'Promociones destacadas'], status: 'active' },
        { name: 'Vendedor Pro', type: 'seller', price: 29, interval: 'month', features: ['10 anuncios activos', 'Estadísticas pro'], status: 'active' }
    ];

    for (const m of memberships) {
        await db.collection('memberships').doc(m.type).set({ ...m, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        console.log(`✅ Membership: ${m.name}`);
    }

    // 2. Tenant
    console.log('Dealer: Auto Premium... ');
    const tenantRef = db.collection('tenants').doc('auto-premium-test');
    await tenantRef.set({
        name: 'Auto Premium Motors',
        type: 'dealer',
        status: 'active',
        subdomain: 'autopremium',
        description: 'Concesionario de alta gama',
        publishedVehiclesCount: 6,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 3. Vehicles
    const vehicles = [
        { make: 'Toyota', model: 'Camry', year: 2023, price: 28500, condition: 'new', bodyType: 'Sedán', photo: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800' },
        { make: 'Tesla', model: 'Model 3', year: 2023, price: 42990, condition: 'new', bodyType: 'Sedán', photo: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800' },
        { make: 'Ford', model: 'F-150', year: 2023, price: 45900, condition: 'new', bodyType: 'Pickup', photo: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800' },
        { make: 'BMW', model: 'X5', year: 2022, price: 62500, condition: 'used', bodyType: 'SUV', photo: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800' },
        { make: 'Honda', model: 'CR-V', year: 2022, price: 32900, condition: 'used', bodyType: 'SUV', photo: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800' },
        { make: 'Mercedes', model: 'C-Class', year: 2023, price: 48900, condition: 'new', bodyType: 'Sedán', photo: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800' }
    ];

    for (let i = 0; i < vehicles.length; i++) {
        const v = vehicles[i];
        await tenantRef.collection('vehicles').doc(`v${i}`).set({
            ...v,
            tenantId: 'auto-premium-test',
            status: 'available',
            publishedOnPublicPage: true,
            photos: [v.photo],
            specifications: { bodyType: v.bodyType },
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`✅ Vehicle: ${v.make} ${v.model}`);
    }

    // 4. Admin User
    console.log('👤 Seeding admin user...');
    await db.collection('admin_users').doc('admin@autodealers.com').set({
        email: 'admin@autodealers.com',
        role: 'superadmin',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('\n✨ SEED COMPLETED! Refresh production page now.');
}

runSeed().catch(console.error);
