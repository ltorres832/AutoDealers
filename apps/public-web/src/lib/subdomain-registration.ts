import type { Firestore } from 'firebase-admin/firestore';
import { PLATFORM_APP_SUBDOMAINS } from './public-production-hosts';

export const RESERVED_SUBDOMAINS = new Set<string>(PLATFORM_APP_SUBDOMAINS);
