import { sendAdminWelcomeEmail } from '@autodealers/core';
import { getDashboardLoginUrl, getDashboardLabel } from './dashboard-login-urls';

export async function sendWelcomeEmailForRole(params: {
  email: string;
  name: string;
  role: string;
}): Promise<{ sent: boolean; error?: string }> {
  const loginUrl = getDashboardLoginUrl(params.role);
  const roleLabel = getDashboardLabel(params.role);
  return sendAdminWelcomeEmail({
    email: params.email,
    name: params.name,
    roleLabel,
    loginUrl,
  });
}
