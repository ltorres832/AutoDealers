const admin = require('firebase-admin');

if (admin.apps.length === 0) {
    admin.initializeApp({
        projectId: 'autodealers-7f62e'
    });
}

const db = admin.firestore();
const auth = admin.auth();

async function checkSystem() {
    try {
        console.log('--- CHECKING MEMBERSHIPS ---');
        const mSnapshot = await db.collection('memberships').get();
        console.log(`Memberships: ${mSnapshot.size}`);
        mSnapshot.forEach(doc => console.log(`  - ${doc.id}: ${doc.data().name} (${doc.data().type}) isActive: ${doc.data().isActive}`));

        console.log('\n--- CHECKING ADMIN USERS ---');
        const aSnapshot = await db.collection('admin_users').get();
        console.log(`Admin Users: ${aSnapshot.size}`);
        aSnapshot.forEach(doc => console.log(`  - ${doc.id}: ${doc.data().email} (${doc.data().role})`));

        console.log('\n--- CHECKING USERS ---');
        const uSnapshot = await db.collection('users').get();
        console.log(`Users: ${uSnapshot.size}`);
        uSnapshot.forEach(doc => console.log(`  - ${doc.id}: ${doc.data().email} (${doc.data().role})`));

        console.log('\n--- CHECKING DEFAULT ADMIN ---');
        try {
            const user = await auth.getUserByEmail('admin@autodealers.com');
            console.log(`Default Admin AUTH exists: ${user.uid}`);
        } catch (e) {
            console.log(`Default Admin AUTH NOT FOUND: ${e.message}`);
        }

    } catch (error) {
        console.error('CRITICAL ERROR:', error.message);
    }
}

checkSystem();
