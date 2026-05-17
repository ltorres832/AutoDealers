/**
 * Estado OAuth Meta (Facebook / Instagram) para seller/dealer:
 * incluye quién conectó la cuenta → se guarda como leadOwnerUserId en la integración.
 */

export interface SocialOAuthStatePayload {
  type: string;
  tenantId: string;
  /** UID Firebase del usuario que conectó (vendedor o dealer que paga / opera el canal) */
  leadOwnerUserId: string;
}

function toBase64Url(json: string): string {
  return Buffer.from(json, 'utf8').toString('base64url');
}

function fromBase64Url(s: string): string {
  return Buffer.from(s, 'base64url').toString('utf8');
}

/** Genera el query param `state` para la URL de autorización de Meta. */
export function encodeSocialOAuthState(payload: SocialOAuthStatePayload): string {
  return toBase64Url(JSON.stringify(payload));
}

/**
 * Decodifica `state` desde OAuth callback.
 * Compatible con el formato legado `type_tenantId` (sin dueño explícito).
 */
export function decodeSocialOAuthState(state: string): SocialOAuthStatePayload | { type: string; tenantId: string; leadOwnerUserId?: undefined } {
  const trimmed = (state || '').trim();
  if (!trimmed) {
    throw new Error('missing_state');
  }
  try {
    const parsed = JSON.parse(fromBase64Url(trimmed)) as Partial<SocialOAuthStatePayload>;
    if (parsed && typeof parsed.type === 'string' && typeof parsed.tenantId === 'string') {
      return {
        type: parsed.type,
        tenantId: parsed.tenantId,
        leadOwnerUserId: typeof parsed.leadOwnerUserId === 'string' ? parsed.leadOwnerUserId : '',
      };
    }
  } catch {
    /* formato legado */
  }
  const idx = trimmed.indexOf('_');
  if (idx <= 0) {
    throw new Error('invalid_state');
  }
  return {
    type: trimmed.slice(0, idx),
    tenantId: trimmed.slice(idx + 1),
  };
}
