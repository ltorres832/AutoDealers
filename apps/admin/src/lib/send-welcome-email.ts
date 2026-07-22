import { sendWelcomeEmailForRole as sendWelcomeEmailForRoleCore } from '@autodealers/core';

export async function sendWelcomeEmailForRole(params: {
  email: string;
  name: string;
  role: string;
}): Promise<{ sent: boolean; error?: string }> {
  return sendWelcomeEmailForRoleCore({
    ...params,
    createdByAdmin: true,
  });
}
