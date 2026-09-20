'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { MembershipUpsell } from '@/components/MembershipUpsell';
import { isDealerManagedClientUser } from '@/lib/dealer-managed-client';

const GATED_ROUTES: { prefix: string; featureKey: string; name: string }[] = [
  { prefix: '/leads/kanban', featureKey: 'crm_kanban', name: 'Pipeline Kanban' },
  { prefix: '/tasks', featureKey: 'crm_tasks', name: 'Tareas' },
  { prefix: '/workflows', featureKey: 'crm_workflows', name: 'Workflows' },
  { prefix: '/public-chat', featureKey: 'public_chat', name: 'Chat Público' },
  { prefix: '/appointments', featureKey: 'appointments', name: 'Citas' },
  { prefix: '/campaigns', featureKey: 'campaigns', name: 'Campañas' },
  { prefix: '/social-posts', featureKey: 'social_posts', name: 'Publicaciones Sociales' },
  { prefix: '/customer-files', featureKey: 'customer_files', name: 'Casos de Cliente' },
  { prefix: '/fi', featureKey: 'fi_module', name: 'F&I' },
  { prefix: '/compensation', featureKey: 'compensation_portal', name: 'Mi compensación' },
  { prefix: '/reports', featureKey: 'crm_reports', name: 'Reportes' },
];

function matchGatedRoute(pathname: string | null) {
  if (!pathname) return null;
  return GATED_ROUTES.find(
    (route) => pathname === route.prefix || pathname.startsWith(`${route.prefix}/`)
  );
}

export function MembershipPageGate({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: { dealerId?: string | null; billingMode?: string | null } | null;
}) {
  const pathname = usePathname();
  const gated = matchGatedRoute(pathname);
  const [state, setState] = useState<'idle' | 'loading' | 'on' | 'off'>('idle');
  const dealerManaged = isDealerManagedClientUser(user);

  useEffect(() => {
    if (!gated) {
      setState('idle');
      return;
    }

    let cancelled = false;
    setState('loading');

    (async () => {
      try {
        const response = await fetch(
          `/api/feature-flags/check?dashboard=seller&featureKey=${encodeURIComponent(gated.featureKey)}`,
          { credentials: 'include' }
        );
        if (cancelled) return;
        if (response.ok) {
          const data = (await response.json()) as { enabled?: boolean };
          setState(data.enabled === true ? 'on' : 'off');
          return;
        }
        setState('on');
      } catch {
        if (!cancelled) setState('on');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [gated?.featureKey, pathname]);

  if (!gated) return <>{children}</>;

  if (state === 'loading') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8 text-sm text-gray-500">
        Cargando…
      </div>
    );
  }

  if (state === 'off') {
    return (
      <MembershipUpsell
        title={gated.name}
        description={
          dealerManaged
            ? 'Esta función no está incluida en el plan de tu concesionario. Contacta a tu dealer para activarla.'
            : 'Esta función no está incluida en tu plan. Selecciona o activa tu membresía para usarla.'
        }
        membershipHref={dealerManaged ? '/settings' : '/settings/membership'}
      />
    );
  }

  return <>{children}</>;
}
