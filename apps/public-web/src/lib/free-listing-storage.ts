const STORAGE_KEY = 'ad_free_listing_saved_v1';

export interface SavedFreeListing {
  id: string;
  managementToken: string;
  make?: string;
  model?: string;
  year?: number;
  savedAt: string;
}

export function saveFreeListingToDevice(entry: Omit<SavedFreeListing, 'savedAt'>): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list: SavedFreeListing[] = raw ? JSON.parse(raw) : [];
    const next: SavedFreeListing = { ...entry, savedAt: new Date().toISOString() };
    const filtered = list.filter((x) => x.id !== entry.id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([next, ...filtered].slice(0, 10)));
  } catch {
    /* ignore */
  }
}

export function getSavedFreeListings(): SavedFreeListing[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedFreeListing[]) : [];
  } catch {
    return [];
  }
}
