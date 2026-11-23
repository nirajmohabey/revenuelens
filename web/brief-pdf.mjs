import { jsPDF } from './vendor/jspdf.mjs';

const PAGE = { width: 612, height: 792, left: 46, right: 46, top: 65, bottom: 738 };
const PALETTE = {
  ink: [24, 34, 52], secondary: [77, 91, 113], accent: [68, 83, 190],
  pale: [245, 247, 252], border: [218, 224, 236], white: [255, 255, 255],
};
const IGNORE = new Set(['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'SVG', 'SCRIPT', 'STYLE', 'NOSCRIPT']);

/** Keep source meaning while making standard embedded PDF fonts deterministic. */
export function normalizePDFText(value) {
  return String(value ?? '').normalize('NFC')
    .replace(/[\u00a0\u2000-\u200b\u202f\u205f\u3000]/g, ' ')
    .replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2010-\u2015\u2212]/g, '-').replace(/\u2026/g, '...')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ').trim();
}

function nodeText(node) {
  if (!node || IGNORE.has(String(node.tagName || '').toUpperCase())) return '';
  if (String(node.tagName || '').toUpperCase() === 'BR') return ' ';
  if (node.nodeType === 3) return node.nodeValue || '';
  if (String(node.tagName || '').toUpperCase() === 'BR') return ' ';
  if (node.childNodes?.length) return [...node.childNodes].map(nodeText).join('');
  return node.textContent || '';
}

const text = node => normalizePDFText(nodeText(node));
const all = (root, selector) => root?.querySelectorAll ? [...root.querySelectorAll(selector)] : [];
const first = (root, selector) => root?.querySelector?.(selector) || null;

function blockFromElement(element, skipHeading) {
  const tag = String(element.tagName || '').toUpperCase();
  if (IGNORE.has(tag) || element === skipHeading) return [];
  if (tag === 'P') {
    const value = text(element);
    return value ? [{ type: element.classList?.contains('mono') ? 'source' : 'paragraph', text: value }] : [];
  }
  if (tag === 'UL' || tag === 'OL') {
    return [...(element.children || [])].filter(child => String(child.tagName).toUpperCase() === 'LI')
      .map(child => ({ type: 'listItem', text: text(child) })).filter(block => block.text);
  }
  if (tag === 'TABLE') {
    return all(element, 'tr').map(row => ({ type: 'paragraph', text: all(row, 'th,td').map(text).join(' | ') }))
      .filter(block => block.text);
  }
  if (/^H[1-6]$/.test(tag)) return [{ type: 'subheading', text: text(element) }];
  if (element.children?.length) return [...element.children].flatMap(child => blockFromElement(child, skipHeading));
  const value = text(element);
  return value ? [{ type: 'paragraph', text: value }] : [];
}

function normalizeStructuredBrief(input, options) {
  const list = value => (Array.isArray(value) ? value : value ? [value] : []).map(normalizePDFText).filter(Boolean);
  return {
    title: normalizePDFText(input.title || options.title || 'Decision brief'),
    documentTitle: normalizePDFText(options.title || input.documentTitle || input.title || 'Decision brief'),
    tag: normalizePDFText(input.tag || 'RevenueLens decision brief'),
    meta: list(input.meta || input.metadata),
    contextLines: [...list(input.contextLines), ...list(options.contextLines)],
    intro: list(input.intro),
    findings: (input.findings || []).map(f => ({ value: normalizePDFText(f.value), label: normalizePDFText(f.label) })),
    sections: (input.sections || []).map(section => ({
      heading: normalizePDFText(section.heading || section.title),
      blocks: section.blocks ? section.blocks.map(block => ({ type: block.type || 'paragraph', text: normalizePDFText(block.text) }))
        : list(section.paragraphs || section.text).map(value => ({ type: 'paragraph', text: value })),
    })),
    sourceNote: normalizePDFText(options.sourceNote || input.sourceNote),
  };
}

/** Extract the selected, already rendered memo, without controls or a DOM dependency in pure tests. */
export function extractBriefContent(rootOrBrief, options = {}) {
  if (!rootOrBrief) throw new Error('The selected decision brief is unavailable.');
  if (!rootOrBrief.querySelector && Array.isArray(rootOrBrief.sections)) return normalizeStructuredBrief(rootOrBrief, options);
  const root = rootOrBrief.matches?.('.memo') ? rootOrBrief : first(rootOrBrief, '.memo') || rootOrBrief;
  const cover = first(root, '.memo-cover') || root;
  const owner = options.document || root.ownerDocument || (root.nodeType === 9 ? root : null);
  const inferredContext = options.contextLines?.length ? [] : [first(owner, '.lab-banner'), first(owner, '.currency-note')]
    .map(text).filter(Boolean);
  const result = {
    title: text(first(cover, 'h2')) || text(first(root, 'h1,h2')) || normalizePDFText(options.title) || 'Decision brief',
    documentTitle: normalizePDFText(options.title) || text(first(cover, 'h2')) || 'Decision brief',
    tag: text(first(cover, '.memo-tag')) || 'RevenueLens decision brief',
    meta: all(cover, '.memo-meta > span').map(text).filter(Boolean),
    contextLines: [...inferredContext, ...(options.contextLines || []).map(normalizePDFText)].filter(Boolean),
    intro: all(cover, '.memo-intro').map(text).filter(Boolean),
    findings: all(cover, '.memo-finding').map(card => ({ value: text(first(card, 'strong')), label: text(first(card, 'small')) })),
    sections: all(root, '.memo-section').map(section => {
      const heading = first(section, 'h2,h3');
      return { heading: text(heading), blocks: [...(section.children || [])].flatMap(child => blockFromElement(child, heading)) };
    }),
    sourceNote: normalizePDFText(options.sourceNote),
  };
  if (!result.sections.length) throw new Error('The selected decision brief has no report sections.');
  return result;
}

function font(doc, size = 10.75, bold = false, color = PALETTE.ink) {
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setFontSize(size);
  doc.setTextColor(...color);
}

/** Return a jsPDF document. All values come from the supplied rendered memo/fixture. */
export function createBriefPDF(rootOrBrief, options = {}) {
  const brief = extractBriefContent(rootOrBrief, options);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter', compress: true, putOnlyUsedFonts: true });
  doc.setProperties({
    title: `RevenueLens - ${brief.documentTitle || brief.title}`,
    subject: [brief.tag, ...brief.meta].join(' | '),
    author: 'RevenueLens', creator: 'RevenueLens selected report export',
    keywords: 'RevenueLens, decision brief, selected filters, source evidence',
  });
  const width = PAGE.width - PAGE.left - PAGE.right;
  let y = PAGE.top;
  function header() {
    font(doc, 14, true, PALETTE.accent);
    doc.text('RevenueLens', PAGE.left, 34);
    font(doc, 9.5, false, PALETTE.secondary);
    doc.text('SELECTED DECISION BRIEF', PAGE.width - PAGE.right, 34, { align: 'right' });
    doc.setDrawColor(...PALETTE.border); doc.setLineWidth(0.7);
    doc.line(PAGE.left, 47, PAGE.width - PAGE.right, 47);
  }
  function newPage() { doc.addPage(); y = PAGE.top; header(); }
  function ensure(height) { if (y + height > PAGE.bottom) newPage(); }
  function wrapped(value, size, bold = false, maxWidth = width) {
    font(doc, size, bold);
    return doc.splitTextToSize(normalizePDFText(value), maxWidth);
  }
  function paragraph(value, { size = 10.75, leading = 15.2, color = PALETTE.ink, indent = 0, gap = 10, bold = false, marker = '' } = {}) {
    const lines = wrapped(value, size, bold, width - indent);
    let index = 0;
    while (index < lines.length) {
      const capacity = Math.floor((PAGE.bottom - y) / leading);
      if (capacity < Math.min(2, lines.length - index)) { newPage(); continue; }
      let count = Math.min(capacity, lines.length - index);
      // Avoid a single final line carried onto another page.
      if (lines.length - index - count === 1 && count > 2) count -= 1;
      font(doc, size, bold, color);
      if (marker && index === 0) doc.text(marker, PAGE.left, y);
      doc.text(lines.slice(index, index + count), PAGE.left + indent, y, { lineHeightFactor: leading / size });
      y += count * leading;
      index += count;
      if (index < lines.length) newPage();
    }
    y += gap;
  }
  function sectionHeading(value) {
    ensure(49);
    y += 2;
    paragraph(value, { size: 12.5, leading: 16, bold: true, color: PALETTE.accent, gap: 7 });
  }
  header();
  paragraph(brief.tag.toUpperCase(), { size: 9.3, leading: 12.5, bold: true, color: PALETTE.accent, gap: 9 });
  paragraph(brief.title, { size: 20, leading: 25, bold: true, gap: 12 });
  if (brief.meta.length) paragraph(brief.meta.join('  |  '), { size: 9.5, leading: 13.2, color: PALETTE.secondary, gap: 12 });
  if (brief.contextLines.length) {
    const lines = brief.contextLines.flatMap(line => wrapped(line, 9.8, false, width - 22));
    const height = lines.length * 13.5 + 18;
    ensure(height + 12);
    doc.setFillColor(...PALETTE.pale); doc.setDrawColor(...PALETTE.border);
    doc.roundedRect(PAGE.left, y - 4, width, height, 5, 5, 'FD');
    font(doc, 9.8, false, PALETTE.secondary);
    doc.text(lines, PAGE.left + 11, y + 9, { lineHeightFactor: 13.5 / 9.8 });
    y += height + 12;
  }
  for (const intro of brief.intro) paragraph(intro, { gap: 12 });
  if (brief.findings.length) {
    const columns = Math.min(3, brief.findings.length);
    const gap = 11;
    const cardWidth = (width - gap * (columns - 1)) / columns;
    for (let start = 0; start < brief.findings.length; start += columns) {
      const row = brief.findings.slice(start, start + columns).map(f => ({
        ...f, values: wrapped(f.value, 14.5, true, cardWidth - 20), labels: wrapped(f.label, 9.5, false, cardWidth - 20),
      }));
      const height = Math.max(...row.map(f => f.values.length * 18 + f.labels.length * 12.5)) + 24;
      ensure(height + 13);
      row.forEach((f, index) => {
        const x = PAGE.left + index * (cardWidth + gap);
        doc.setFillColor(...PALETTE.pale); doc.setDrawColor(...PALETTE.border);
        doc.roundedRect(x, y - 2, cardWidth, height, 5, 5, 'FD');
        font(doc, 14.5, true);
        doc.text(f.values, x + 10, y + 17, { lineHeightFactor: 18 / 14.5 });
        font(doc, 9.5, false, PALETTE.secondary);
        doc.text(f.labels, x + 10, y + 20 + f.values.length * 18, { lineHeightFactor: 12.5 / 9.5 });
      });
      y += height + 13;
    }
  }
  for (const section of brief.sections) {
    if (section.heading) sectionHeading(section.heading);
    for (const block of section.blocks) {
      if (!block.text) continue;
      if (block.type === 'subheading') sectionHeading(block.text);
      else if (block.type === 'listItem') paragraph(block.text, { indent: 12, marker: '-', gap: 10 });
      else if (block.type === 'source') paragraph(block.text, { size: 9.5, leading: 13.4, color: PALETTE.secondary, gap: 9 });
      else paragraph(block.text);
    }
  }
  if (brief.sourceNote) { sectionHeading('Export context'); paragraph(brief.sourceNote, { size: 9.5, leading: 13.4, color: PALETTE.secondary }); }
  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...PALETTE.border); doc.setLineWidth(0.7);
    doc.line(PAGE.left, PAGE.height - 29, PAGE.width - PAGE.right, PAGE.height - 29);
    font(doc, 9, false, PALETTE.secondary);
    doc.text('RevenueLens | Selected report evidence', PAGE.left, PAGE.height - 15);
    doc.text(`Page ${page} of ${total}`, PAGE.width - PAGE.right, PAGE.height - 15, { align: 'right' });
  }
  return doc;
}

export async function downloadBriefPDF(rootOrBrief, options = {}) {
  const pdf = createBriefPDF(rootOrBrief, options);
  const owner = options.document || rootOrBrief?.ownerDocument || globalThis.document;
  if (!owner?.createElement || !globalThis.URL?.createObjectURL) throw new Error('PDF download is unavailable in this browser.');
  const filename = String(options.filename || 'RevenueLens_Decision_Brief.pdf').replace(/[\\/:*?"<>|]/g, '-').replace(/\.pdf$/i, '') + '.pdf';
  const blob = new Blob([pdf.output('arraybuffer')], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = owner.createElement('a');
  link.href = url; link.download = filename;
  owner.body?.appendChild(link); link.click();
  setTimeout(() => { link.remove(); URL.revokeObjectURL(url); }, 1500);
  return { filename, pages: pdf.getNumberOfPages(), bytes: blob.size };
}
