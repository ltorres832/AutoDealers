'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type Role = 'dealer' | 'seller' | 'business';
type PayMode = 'client' | 'employee' | 'link';
type ProductKind = 'banner' | 'paid_promotion' | 'featured_promotion';

type Account = {
  id: string;
  role: Role;
  name: string;
  companyName?: string;
  email: string;
  tenantId: string;
};

type Catalog = {
  banners: Array<{ duration: number; price: number; placement: string }>;
  promotions: Array<{ duration: number; price: number; scope: string }>;
  featured: Array<{
    id: string;
    label: string;
    price: number;
    durationHours: number;
    targetType: string;
  }>;
  payModes: Array<{ id: PayMode; label: string }>;
};

type Order = {
  id: string;
  label?: string;
  productKind?: string;
  payMode?: string;
  status?: string;
  price?: number;
  clientName?: string;
  checkoutUrl?: string | null;
  checkoutError?: string | null;
  commissionCreated?: boolean;
  createdAt?: string | null;
};

function money(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
}

function accountLabel(item: Account) {
  const who =
    item.companyName && item.companyName !== item.name
      ? `${item.companyName} · ${item.name}`
      : item.companyName || item.name || item.email;
  const role = item.role === 'seller' ? 'vendedor' : item.role === 'business' ? 'negocio' : 'dealer';
  return `${who} (${role})`;
}

function statusLabel(status?: string) {
  const map: Record<string, string> = {
    awaiting_client_payment: 'Esperando pago del cliente',
    awaiting_payment: 'Esperando pago (link/Checkout)',
    paid_pending_approval: 'Pagado · pendiente aprobación',
    active: 'Activo · comisión generada',
    queued: 'En cola',
    cancelled: 'Cancelado',
    expired: 'Expirado',
  };
  return map[String(status || '')] || status || '—';
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.setAttribute('readonly', '');
      el.style.position = 'fixed';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  }
}

export function SalesAdsPanel({
  accounts: initialAccounts,
  onDone,
}: {
  accounts: Account[];
  onDone?: () => void;
}) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts || []);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [lastCheckoutUrl, setLastCheckoutUrl] = useState('');

  const [accountId, setAccountId] = useState(initialAccounts[0]?.id || '');
  const [productKind, setProductKind] = useState<ProductKind>('banner');
  const [payMode, setPayMode] = useState<PayMode>('link');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [duration, setDuration] = useState<number | ''>('');
  const [featuredPlanId, setFeaturedPlanId] = useState('');
  const [vehicleId, setVehicleId] = useState('');

  const selectedAccount = useMemo(
    () => accounts.find((item) => item.id === accountId) || null,
    [accounts, accountId]
  );

  const load = useCallback(async (accId?: string) => {
    const q = accId ? `?accountId=${encodeURIComponent(accId)}` : '';
    const res = await fetch(`/api/sales/ads${q}`, { credentials: 'include' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'No se pudo cargar anuncios');
    setCatalog(json.catalog);
    setOrders(json.orders || []);
    if (Array.isArray(json.accounts) && json.accounts.length) {
      setAccounts(json.accounts);
      if (!accId && !accountId) setAccountId(json.accounts[0].id);
    }
  }, [accountId]);

  useEffect(() => {
    load(accountId || undefined).catch((err) => setError(err.message || 'Error'));
  }, [accountId, load]);

  useEffect(() => {
    if (!catalog) return;
    if (productKind === 'banner' && catalog.banners[0] && duration === '') {
      setDuration(catalog.banners[0].duration);
    }
    if (productKind === 'paid_promotion' && catalog.promotions[0] && duration === '') {
      setDuration(catalog.promotions[0].duration);
    }
    if (productKind === 'featured_promotion' && catalog.featured[0] && !featuredPlanId) {
      setFeaturedPlanId(catalog.featured[0].id);
    }
  }, [catalog, productKind, duration, featuredPlanId]);

  async function onUpload(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/sales/ads/upload', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudo subir la imagen');
      setImageUrl(json.url);
      setMessage('Imagen subida.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir');
    } finally {
      setUploading(false);
    }
  }

  async function handleCopy(url: string) {
    const ok = await copyText(url);
    setMessage(ok ? 'Link copiado al portapapeles.' : 'No se pudo copiar. Copia el link manualmente.');
  }

  async function regenerateCheckout(orderId: string) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/sales/ads', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate_checkout', orderId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudo regenerar el link');
      if (!json.checkoutUrl) throw new Error('Stripe no devolvió el link de pago');
      setLastCheckoutUrl(json.checkoutUrl);
      setMessage(`Link regenerado: ${json.checkoutUrl}`);
      await load(accountId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setBusy(true);
    setError('');
    setMessage('');
    setLastCheckoutUrl('');
    try {
      const res = await fetch('/api/sales/ads', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          productKind,
          payMode,
          title,
          description,
          imageUrl,
          duration: duration === '' ? undefined : Number(duration),
          featuredPlanId: featuredPlanId || undefined,
          vehicleId: vehicleId || undefined,
          name: title || undefined,
          promotionScope:
            productKind === 'paid_promotion'
              ? selectedAccount?.role === 'seller'
                ? 'seller'
                : 'dealer'
              : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudo crear');

      if (json.checkoutUrl) {
        setLastCheckoutUrl(json.checkoutUrl);
        setMessage(
          payMode === 'employee'
            ? 'Checkout listo. Ábrelo para cobrar o copia el link.'
            : 'Link de pago listo para copiar y enviar al cliente.'
        );
        if (payMode === 'employee') {
          window.open(json.checkoutUrl, '_blank', 'noopener,noreferrer');
        }
      } else if (json.checkoutError || json.warning) {
        setError(
          String(json.warning || json.checkoutError || 'No se pudo crear el link de pago')
        );
        setMessage(
          'El anuncio quedó asignado (pending). Puedes regenerar el link desde la lista de órdenes.'
        );
      } else {
        setMessage(
          'Asignado al cliente. Se envió notificación y email para que pague en su panel (Banners/Promociones).'
        );
      }

      setTitle('');
      setDescription('');
      setImageUrl('');
      await load(accountId);
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  if (!accounts.length) {
    return (
      <div className="rounded-xl border bg-white p-4 text-sm text-slate-600">
        Primero crea una cuenta de cliente en Membresías. Luego podrás asignarle banners, promociones
        o destacados.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-white p-4 space-y-3">
        <div>
          <h2 className="font-semibold text-slate-900">Vender anuncio / banner / promo</h2>
          <p className="text-sm text-slate-500">
            Solo lo que creas aquí genera comisión (25%). Si el cliente compra solo desde su panel, no
            hay comisión. Cancelar Checkout o pulsar Atrás en el navegador no borra el anuncio.
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {message && (
          <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800">
            {message}
          </div>
        )}

        {lastCheckoutUrl && (
          <div className="rounded-lg border border-slate-300 bg-slate-50 p-3 space-y-2">
            <p className="text-xs font-medium text-slate-700 uppercase tracking-wide">
              Link de pago
            </p>
            <p className="text-sm break-all text-slate-900">{lastCheckoutUrl}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleCopy(lastCheckoutUrl)}
                className="bg-slate-900 text-white text-sm px-3 py-1.5 rounded-lg"
              >
                Copiar link
              </button>
              <a
                href={lastCheckoutUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
              >
                Abrir Checkout
              </a>
            </div>
          </div>
        )}

        <label className="block text-sm">
          <span className="text-slate-600">Cliente</span>
          <select
            className="mt-1 w-full border rounded-lg px-3 py-2"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            {accounts.map((item) => (
              <option key={item.id} value={item.id}>
                {accountLabel(item)}
              </option>
            ))}
          </select>
        </label>

        <div className="grid sm:grid-cols-3 gap-2">
          {(
            [
              ['banner', 'Banner'],
              ['paid_promotion', 'Promoción'],
              ['featured_promotion', 'Destacado'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setProductKind(id);
                setDuration('');
                setFeaturedPlanId('');
              }}
              className={`rounded-lg border px-3 py-2 text-sm ${
                productKind === id ? 'border-slate-900 bg-slate-900 text-white' : 'bg-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {productKind === 'banner' && (
          <div className="space-y-2">
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Título"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Descripción"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="flex flex-wrap gap-2 items-center">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => onUpload(e.target.files?.[0] || null)}
                disabled={uploading}
              />
              {imageUrl && (
                <a href={imageUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-700 underline">
                  Ver imagen
                </a>
              )}
            </div>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            >
              {(catalog?.banners || []).map((item) => (
                <option key={item.duration} value={item.duration}>
                  {item.duration} días · {money(item.price)}
                </option>
              ))}
            </select>
          </div>
        )}

        {productKind === 'paid_promotion' && (
          <div className="space-y-2">
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Nombre de la promoción"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Descripción (opcional)"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            >
              {(catalog?.promotions || []).map((item) => (
                <option key={item.duration} value={item.duration}>
                  {item.duration} días · {money(item.price)} · {item.scope}
                </option>
              ))}
            </select>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="vehicleId (solo si aplica)"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
            />
          </div>
        )}

        {productKind === 'featured_promotion' && (
          <div className="space-y-2">
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={featuredPlanId}
              onChange={(e) => setFeaturedPlanId(e.target.value)}
            >
              {(catalog?.featured || []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label} · {money(item.price)}
                </option>
              ))}
            </select>
            {!(catalog?.featured || []).length && (
              <p className="text-sm text-amber-800">No hay planes de destacado para este tipo de cuenta.</p>
            )}
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="vehicleId (si el plan es de vehículo)"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
            />
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-800">Cómo se paga</p>
          <div className="grid gap-2">
            {(catalog?.payModes || []).map((mode) => (
              <label key={mode.id} className="flex items-start gap-2 text-sm border rounded-lg px-3 py-2">
                <input
                  type="radio"
                  name="payMode"
                  checked={payMode === mode.id}
                  onChange={() => setPayMode(mode.id)}
                />
                <span>{mode.label}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          type="button"
          disabled={busy || uploading}
          onClick={submit}
          className="bg-slate-900 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-60"
        >
          {busy ? 'Creando…' : 'Crear y asignar'}
        </button>
      </section>

      <section className="rounded-xl border bg-white p-4">
        <h3 className="font-semibold mb-3">Órdenes de anuncios</h3>
        <div className="space-y-2">
          {orders.length === 0 && (
            <p className="text-sm text-slate-500">Aún no hay anuncios vendidos desde Ventas.</p>
          )}
          {orders.map((order) => {
            const canPayLink =
              order.checkoutUrl &&
              order.status !== 'active' &&
              order.status !== 'cancelled';
            const canRegenerate =
              (order.payMode === 'link' || order.payMode === 'employee') &&
              order.status !== 'active' &&
              order.status !== 'cancelled';

            return (
              <div key={order.id} className="border rounded-lg p-3 text-sm space-y-2">
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="font-medium">{order.label || order.productKind}</p>
                  <p>{money(Number(order.price || 0))}</p>
                </div>
                <p className="text-slate-600">{order.clientName}</p>
                <p className="text-slate-500">
                  {statusLabel(order.status)} · pago: {order.payMode || '—'}
                  {order.commissionCreated ? ' · comisión OK' : ''}
                </p>
                {order.checkoutError && !order.checkoutUrl && (
                  <p className="text-amber-800 text-xs">Error link: {order.checkoutError}</p>
                )}
                {canPayLink && (
                  <div className="rounded-md bg-slate-50 border px-2 py-2 space-y-2">
                    <p className="text-xs text-slate-600 break-all">{order.checkoutUrl}</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(String(order.checkoutUrl))}
                        className="text-xs px-2 py-1 rounded bg-slate-900 text-white"
                      >
                        Copiar link
                      </button>
                      <a
                        href={String(order.checkoutUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs px-2 py-1 rounded border bg-white"
                      >
                        Abrir
                      </a>
                    </div>
                  </div>
                )}
                {canRegenerate && !order.checkoutUrl && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => regenerateCheckout(order.id)}
                    className="text-xs px-2 py-1 rounded border border-amber-400 bg-amber-50 text-amber-900"
                  >
                    Regenerar link de pago
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
