const admin = require('firebase-admin');


if (admin.apps.length === 0) {
    admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'autodealers-89980',
    });
}

const db = admin.firestore();

async function checkMemberships() {
    try {
        const snapshot = await db.collection('memberships').get();
        console.log(`Total memberships found: ${snapshot.size}`);
        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`ID: ${doc.id}, Name: ${data.name}, Type: ${data.type}, IsActive: ${data.isActive}`);
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

checkMemberships();
