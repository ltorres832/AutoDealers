const admin = require('firebase-admin');

if (admin.apps.length === 0) {
    admin.initializeApp({
        projectId: 'autodealers-7f62e'
    });
}

const db = admin.firestore();

async function checkMemberships() {
    const snapshot = await db.collection('memberships').get();
    console.log(`Found ${snapshot.size} memberships`);
    snapshot.forEach(doc => {
        console.log(`ID: ${doc.id}`);
        console.log(JSON.stringify(doc.data(), null, 2));
    });
}

checkMemberships();
