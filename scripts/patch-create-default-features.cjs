const fs = require('fs');
const p = 'apps/admin/src/app/api/admin/memberships/create-default/route.ts';
let s = fs.readFileSync(p, 'utf8');
s = s.replace(/advancedReports: false,/g, 'advancedReports: true,');
s = s.replace(/exportData: false,/g, 'exportData: true,');
s = s.replace(/automationWorkflows: false,/g, 'automationWorkflows: true,');
s = s.replace(/fiModule: false/g, 'fiModule: true');
if (!s.includes('customerDocumentRequestsEnabled')) {
  s = s.replace(
    /requiresAdminApproval: false,/g,
    'requiresAdminApproval: false,\n      customerDocumentRequestsEnabled: true,\n      fiModule: true,'
  );
}
fs.writeFileSync(p, s);
console.log('patched', p);
