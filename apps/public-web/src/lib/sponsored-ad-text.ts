/** Texto superpuesto en anuncios — solo campos que el anunciante completó en el formulario. */
export function hasSponsoredAdText(item: {
  title?: string | null;
  description?: string | null;
  campaignName?: string | null;
}): boolean {
  return !!(
    item.title?.trim() ||
    item.description?.trim() ||
    item.campaignName?.trim()
  );
}
