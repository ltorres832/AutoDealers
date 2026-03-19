
const admin = require('firebase-admin');

// Using ADC
admin.initializeApp({
    projectId: 'autodealers-7f62e'
});

const db = admin.firestore();

async function checkMemberships() {
    console.log('--- Checking Memberships ---');
    try {
        const snapshot = await db.collection('memberships').get();
        if (snapshot.empty) {
            console.log('❌ No memberships found in the "memberships" collection.');
        } else {
            snapshot.docs.forEach(doc => {
                console.log(`- ID: ${doc.id}, Data: ${JSON.stringify(doc.data())}`);
            });
        }
    } catch (error) {
        console.error('❌ Error fetching memberships:', error.message);
    }
}

async function checkTenants() {
    console.log('\n--- Checking Active Tenants ---');
    try {
        const snapshot = await db.collection('tenants').where('status', '==', 'active').get();
        if (snapshot.empty) {
            console.log('❌ No active tenants found.');
        } else {
            snapshot.docs.forEach(doc => {
                console.log(`- ID: ${doc.id}, Subdomain: ${doc.data().subdomain || 'no-subdomain'}`);
            });
        }
    } catch (error) {
        console.error('❌ Error fetching tenants:', error.message);
    }
}

async function checkAdminUser() {
    console.log('\n--- Checking Admin User ---');
    try {
        const users = await admin.auth().listUsers(10);
        console.log('Recent Users:');
        users.users.forEach(u => console.log(`- ${u.email} (${u.uid})`));
    } catch (error) {
        console.error('❌ Error fetching users:', error.message);
    }
}

async function run() {
    await checkMemberships();
    await checkTenants();
    await checkAdminUser();
    process.exit(0);
}

run();
