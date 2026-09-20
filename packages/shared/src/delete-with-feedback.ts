export type DeleteActionResult =
  | { ok: true; data?: unknown }
  | { ok: false; error: string };

export async function confirmAndDelete(params: {
  url: string;
  confirmMessage: string;
  method?: 'DELETE' | 'POST' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
  fetchFn?: typeof fetch;
}): Promise<DeleteActionResult> {
  if (typeof window !== 'undefined' && !window.confirm(params.confirmMessage)) {
    return { ok: false, error: 'cancelled' };
  }

  const fetchFn = params.fetchFn ?? fetch;
  const hasBody = params.body !== undefined;

  try {
    const res = await fetchFn(params.url, {
      method: params.method ?? 'DELETE',
      credentials: params.credentials ?? 'include',
      headers: {
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        ...params.headers,
      },
      ...(hasBody ? { body: JSON.stringify(params.body) } : {}),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error =
        typeof (data as { error?: unknown }).error === 'string'
          ? (data as { error: string }).error
          : 'No se pudo eliminar';
      if (error !== 'cancelled') {
        alert(error);
      }
      return { ok: false, error };
    }

    return { ok: true, data };
  } catch {
    const error = 'Error de red';
    alert(error);
    return { ok: false, error };
  }
}

export function isCancelledPlatformStatus(status?: string | null): boolean {
  return (status || 'active') === 'cancelled';
}

export function filterPlatformRecords<T extends { status?: string | null }>(
  rows: T[],
  options?: { status?: string; includeCancelled?: boolean }
): T[] {
  if (options?.status) {
    return rows.filter((row) => (row.status || 'active') === options.status);
  }
  if (options?.includeCancelled) {
    return rows;
  }
  return rows.filter((row) => !isCancelledPlatformStatus(row.status));
}
