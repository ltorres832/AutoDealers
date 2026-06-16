import MembershipsPageClient from './MembershipsPageClient';
import { loadAdminMembershipsList } from '@/lib/load-admin-memberships';

export const dynamic = 'force-dynamic';

export default async function AdminMembershipsPage() {
  const { memberships, error } = await loadAdminMembershipsList();
  return (
    <MembershipsPageClient initialMemberships={memberships} initialError={error} />
  );
}
