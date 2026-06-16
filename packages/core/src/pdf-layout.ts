/**
 * Motor de diseño PDF profesional con branding de tenant (dealer / vendedor).
 */

import { PDFDocument, PDFPage, PDFFont, RGB, rgb, StandardFonts } from 'pdf-lib';
import { getOrderedBrandingElements } from './document-branding';

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN_X = 48;
const HEADER_H = 92;
const FOOTER_H = 52;
const CONTENT_TOP = PAGE_H - HEADER_H - 24;
const CONTENT_BOTTOM = FOOTER_H + 16;

export interface PdfBrandingContext {
  tenantId: string;
  userId?: string;
  documentType: string;
  primaryColor?: string;
  tenantPhone?: string;
  tenantEmail?: string;
  tenantAddress?: string;
}

export interface PdfLogoSlot {
  type: string;
  url?: string;
  name?: string;
}

function parseHexColor(hex?: string): RGB {
  const h = (hex || '#1e40af').replace('#', '').trim();
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
      return rgb(r, g, b);
    }
  }
  return rgb(0.12, 0.25, 0.69);
}

function formatMoney(n: number | undefined | null, currency = 'USD'): string {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return new Intl.NumberFormat('es-US', { style: 'currency', currency }).format(Number(n));
}

function formatDate(d: Date = new Date()): string {
  return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
}

function sanitize(value: unknown): string {
  if (value == null || value === '') return '—';
  return String(value).trim();
}

async function fetchImageBytes(
  url: string
): Promise<{ bytes: Uint8Array; kind: 'png' | 'jpg' } | null> {
  try {
    const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(12000) });
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.length < 8 || buf.length > 800_000) return null;
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (ct.includes('png') || url.toLowerCase().includes('.png')) {
      return { bytes: buf, kind: 'png' };
    }
    return { bytes: buf, kind: 'jpg' };
  } catch {
    return null;
  }
}

function wrapLines(text: string, maxChars: number): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

export class ProfessionalPdfBuilder {
  private doc!: PDFDocument;
  private page!: PDFPage;
  private font!: PDFFont;
  private fontBold!: PDFFont;
  private y = CONTENT_TOP;
  private pageIndex = 0;
  private accent: RGB = rgb(0.12, 0.25, 0.69);
  private headerTitle = '';
  private headerSubtitle = '';
  private logos: PdfLogoSlot[] = [];
  private names: string[] = [];
  private footerLines: string[] = [];
  private confidential = true;

  private logoImages: Array<{ img: Awaited<ReturnType<PDFDocument['embedPng']>>; w: number; h: number }> =
    [];

  private constructor(private ctx: PdfBrandingContext) {}

  static async create(ctx: PdfBrandingContext): Promise<ProfessionalPdfBuilder> {
    const b = new ProfessionalPdfBuilder(ctx);
    await b.init();
    return b;
  }

  private async init(): Promise<void> {
    this.doc = await PDFDocument.create();
    this.doc.setTitle(this.ctx.documentType);
    this.doc.setProducer('AutoDealers Platform');
    this.font = await this.doc.embedFont(StandardFonts.Helvetica);
    this.fontBold = await this.doc.embedFont(StandardFonts.HelveticaBold);

    const db = (await import('@autodealers/shared')).getFirestore();
    const tenantSnap = await db.collection('tenants').doc(this.ctx.tenantId).get();
    const tenant = tenantSnap.data() as Record<string, unknown> | undefined;
    const branding = (tenant?.branding || {}) as Record<string, unknown>;
    this.accent = parseHexColor(
      (branding.primaryColor as string) || this.ctx.primaryColor
    );

    const elements = await getOrderedBrandingElements(
      this.ctx.tenantId,
      this.ctx.documentType,
      this.ctx.userId
    );
    this.logos = elements.logos.map((l) => ({
      type: l.type,
      url: l.url,
      name: l.name,
    }));
    this.names = elements.names.map((n) => n.text).filter(Boolean);

    for (const slot of this.logos.slice(0, 3)) {
      if (!slot.url) continue;
      const img = await fetchImageBytes(slot.url);
      if (!img) continue;
      try {
        const embedded =
          img.kind === 'png' ? await this.doc.embedPng(img.bytes) : await this.doc.embedJpg(img.bytes);
        const dims = embedded.scale(1);
        const maxH = 44;
        const maxW = 88;
        const scale = Math.min(maxW / dims.width, maxH / dims.height, 1);
        this.logoImages.push({
          img: embedded,
          w: dims.width * scale,
          h: dims.height * scale,
        });
      } catch {
        /* skip */
      }
    }

    const company =
      this.names.find((_, i) => elements.names[i]?.type === 'dealer') ||
      this.names[0] ||
      sanitize(tenant?.companyName || tenant?.name);
    this.footerLines = [
      company,
      [this.ctx.tenantPhone, this.ctx.tenantEmail].filter(Boolean).join(' · ') || '',
    ].filter(Boolean);

    this.addPage();
  }

  setHeader(title: string, subtitle?: string): this {
    this.headerTitle = title;
    this.headerSubtitle = subtitle || '';
    return this;
  }

  private addPage(): void {
    this.page = this.doc.addPage([PAGE_W, PAGE_H]);
    this.pageIndex += 1;
    this.y = CONTENT_TOP;
    this.drawPageChrome();
  }

  private ensureSpace(needed: number): void {
    if (this.y - needed < CONTENT_BOTTOM) {
      this.addPage();
    }
  }

  private drawPageChrome(): void {
    const { page } = this;
    page.drawRectangle({
      x: 0,
      y: PAGE_H - HEADER_H,
      width: PAGE_W,
      height: HEADER_H,
      color: this.accent,
    });

    page.drawRectangle({
      x: 0,
      y: PAGE_H - HEADER_H - 3,
      width: PAGE_W,
      height: 3,
      color: rgb(0.95, 0.95, 0.97),
    });

    let logoX = MARGIN_X;
    const logoY = PAGE_H - HEADER_H + 14;
    const maxH = 44;
    for (const { img, w, h } of this.logoImages) {
      page.drawImage(img, { x: logoX, y: logoY + (maxH - h) / 2, width: w, height: h });
      logoX += w + 12;
    }

    const titleX = PAGE_W - MARGIN_X;
    page.drawText(this.headerTitle, {
      x: titleX - this.fontBold.widthOfTextAtSize(this.headerTitle, 14),
      y: PAGE_H - 38,
      size: 14,
      font: this.fontBold,
      color: rgb(1, 1, 1),
    });
    if (this.headerSubtitle) {
      const subSize = 9;
      page.drawText(this.headerSubtitle, {
        x: titleX - this.font.widthOfTextAtSize(this.headerSubtitle, subSize),
        y: PAGE_H - 54,
        size: subSize,
        font: this.font,
        color: rgb(0.92, 0.94, 1),
      });
    }

    if (this.names.length) {
      const nameLine = this.names.join('  ·  ');
      page.drawText(nameLine, {
        x: MARGIN_X,
        y: PAGE_H - 72,
        size: 8,
        font: this.font,
        color: rgb(0.92, 0.94, 1),
        maxWidth: PAGE_W - MARGIN_X * 2,
      });
    }

    page.drawLine({
      start: { x: MARGIN_X, y: FOOTER_H + 28 },
      end: { x: PAGE_W - MARGIN_X, y: FOOTER_H + 28 },
      thickness: 0.5,
      color: rgb(0.82, 0.84, 0.88),
    });

    const footerY = FOOTER_H + 12;
    if (this.footerLines[0]) {
      page.drawText(this.footerLines[0], {
        x: MARGIN_X,
        y: footerY,
        size: 8,
        font: this.fontBold,
        color: rgb(0.35, 0.38, 0.42),
      });
    }
    if (this.footerLines[1]) {
      page.drawText(this.footerLines[1], {
        x: MARGIN_X,
        y: footerY - 11,
        size: 7.5,
        font: this.font,
        color: rgb(0.5, 0.52, 0.56),
      });
    }

    const pageLabel = `Página ${this.pageIndex}`;
    page.drawText(pageLabel, {
      x: PAGE_W - MARGIN_X - this.font.widthOfTextAtSize(pageLabel, 7.5),
      y: footerY,
      size: 7.5,
      font: this.font,
      color: rgb(0.5, 0.52, 0.56),
    });

    if (this.confidential) {
      const conf = 'Documento confidencial — uso exclusivo del destinatario autorizado.';
      page.drawText(conf, {
        x: PAGE_W - MARGIN_X - this.font.widthOfTextAtSize(conf, 7),
        y: footerY - 11,
        size: 7,
        font: this.font,
        color: rgb(0.55, 0.55, 0.58),
      });
    }
  }

  drawSection(title: string): this {
    this.ensureSpace(36);
    this.y -= 8;
    this.page.drawText(title.toUpperCase(), {
      x: MARGIN_X,
      y: this.y,
      size: 10,
      font: this.fontBold,
      color: this.accent,
    });
    this.y -= 4;
    this.page.drawLine({
      start: { x: MARGIN_X, y: this.y },
      end: { x: PAGE_W - MARGIN_X, y: this.y },
      thickness: 1.2,
      color: this.accent,
    });
    this.y -= 18;
    return this;
  }

  drawFieldGrid(rows: Array<{ label: string; value: string }>, columns = 2): this {
    const colW = (PAGE_W - MARGIN_X * 2 - 16) / columns;
    for (let i = 0; i < rows.length; i += columns) {
      this.ensureSpace(34);
      for (let c = 0; c < columns; c++) {
        const row = rows[i + c];
        if (!row) continue;
        const x = MARGIN_X + c * (colW + 16);
        this.page.drawText(row.label, {
          x,
          y: this.y,
          size: 8,
          font: this.font,
          color: rgb(0.45, 0.48, 0.52),
        });
        const valLines = wrapLines(sanitize(row.value), 42);
        let vy = this.y - 12;
        for (const line of valLines.slice(0, 2)) {
          this.page.drawText(line, {
            x,
            y: vy,
            size: 10,
            font: this.fontBold,
            color: rgb(0.12, 0.14, 0.18),
          });
          vy -= 12;
        }
      }
      this.y -= 34;
    }
    return this;
  }

  drawParagraph(text: string, opts?: { size?: number; bold?: boolean }): this {
    const size = opts?.size ?? 10;
    const font = opts?.bold ? this.fontBold : this.font;
    const maxChars = 92;
    const lines = wrapLines(text, maxChars);
    for (const line of lines) {
      this.ensureSpace(size + 6);
      this.page.drawText(line, {
        x: MARGIN_X,
        y: this.y,
        size,
        font,
        color: rgb(0.15, 0.17, 0.2),
      });
      this.y -= size + 6;
    }
    this.y -= 4;
    return this;
  }

  drawSpacer(h = 12): this {
    this.y -= h;
    return this;
  }

  drawHighlightBox(title: string, lines: string[]): this {
    this.ensureSpace(20 + lines.length * 14);
    const boxH = 18 + lines.length * 14;
    this.page.drawRectangle({
      x: MARGIN_X,
      y: this.y - boxH + 8,
      width: PAGE_W - MARGIN_X * 2,
      height: boxH,
      color: rgb(0.96, 0.97, 0.99),
      borderColor: rgb(0.85, 0.88, 0.92),
      borderWidth: 0.5,
    });
    this.page.drawText(title, {
      x: MARGIN_X + 12,
      y: this.y - 4,
      size: 9,
      font: this.fontBold,
      color: this.accent,
    });
    let ly = this.y - 18;
    for (const line of lines) {
      this.page.drawText(line, {
        x: MARGIN_X + 12,
        y: ly,
        size: 9.5,
        font: this.font,
        color: rgb(0.2, 0.22, 0.26),
      });
      ly -= 14;
    }
    this.y -= boxH + 8;
    return this;
  }

  drawSignatureBlock(label: string): this {
    this.ensureSpace(64);
    this.y -= 16;
    this.page.drawLine({
      start: { x: MARGIN_X, y: this.y },
      end: { x: MARGIN_X + 220, y: this.y },
      thickness: 0.75,
      color: rgb(0.3, 0.32, 0.36),
    });
    this.page.drawText(label, {
      x: MARGIN_X,
      y: this.y - 14,
      size: 8.5,
      font: this.font,
      color: rgb(0.45, 0.48, 0.52),
    });
    this.page.drawText(`Fecha: ${formatDate()}`, {
      x: MARGIN_X + 280,
      y: this.y - 14,
      size: 8.5,
      font: this.font,
      color: rgb(0.45, 0.48, 0.52),
    });
    this.y -= 36;
    return this;
  }

  async finalize(): Promise<Buffer> {
    const bytes = await this.doc.save();
    return Buffer.from(bytes);
  }
}

export { formatMoney, formatDate, sanitize };
