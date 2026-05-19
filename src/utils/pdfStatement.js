const PDFDocument = require('pdfkit');

// ─── APP THEME COLORS ──────────────────────────────────────
const COLORS = {
  primary: '#0F5132',      // deep green (app primary)
  primaryDark: '#0a3d24',
  accent: '#198754',       // mid green
  pillBg: '#d1e7dd',       // light green pill background
  pillText: '#0F5132',
  text: '#1f2937',
  muted: '#6b7280',
  border: '#e5e7eb',
  rowAlt: '#f9fafb',
  credit: '#16a34a',
  debit: '#dc2626',
  white: '#ffffff',
  summaryBg: '#f3faf6',
};

const PAGE = {
  margin: 40,
  width: 595,           // A4 width in points
  contentWidth: 515,    // width - 2*margin
  bottom: 780,          // bottom of content area (before footer)
};

/**
 * Stream a PDF bank account statement to the given writable response.
 *
 * @param {object} statement  Statement payload from statement.service
 * @param {import('express').Response} res
 */
const streamStatementPdf = (statement, res) => {
  const doc = new PDFDocument({ size: 'A4', margin: PAGE.margin, bufferPages: true });
  doc.pipe(res);

  const {
    account, period, openingBalance, closingBalance, currentBalance, summary, transactions,
  } = statement;

  // ─── FORMATTERS ──────────────────────────────────────────
  const fmtMoney = (n, ccy) => {
    const v = Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return ccy ? `${ccy} ${v}` : v;
  };
  const fmtDate = (d) => {
    const dt = new Date(d);
    const pad = (x) => String(x).padStart(2, '0');
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  };
  const fmtTime = (d) => {
    const dt = new Date(d);
    const pad = (x) => String(x).padStart(2, '0');
    return `${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  };
  const fmtDateTime = (d) => `${fmtDate(d)}  ${fmtTime(d)}`;

  // ════════════════════════════════════════════════════════
  // HEADER BAND
  // ════════════════════════════════════════════════════════
  doc.rect(0, 0, PAGE.width, 90).fill(COLORS.primary);

  doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(22)
    .text('Nexus Bank', PAGE.margin, 28, { lineBreak: false });
  doc.font('Helvetica').fontSize(11).fillColor(COLORS.pillBg)
    .text('Account Statement', PAGE.margin, 56, { lineBreak: false });

  // Generated label (right side of header)
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.pillBg)
    .text('Generated', PAGE.margin, 30, { width: PAGE.contentWidth, align: 'right', lineBreak: false });
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.white)
    .text(fmtDateTime(new Date()), PAGE.margin, 44, { width: PAGE.contentWidth, align: 'right', lineBreak: false });

  // ════════════════════════════════════════════════════════
  // ACCOUNT HOLDER CARD
  // ════════════════════════════════════════════════════════
  const cardY = 110;
  const cardH = 92;
  doc.roundedRect(PAGE.margin, cardY, PAGE.contentWidth, cardH, 6)
    .fillAndStroke(COLORS.white, COLORS.border);

  // Holder name
  doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(13)
    .text(account.holderName || '-', PAGE.margin + 16, cardY + 12, { width: 300, lineBreak: false });

  // Masked account number
  doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(15)
    .text(account.accountNumberMasked || '-', PAGE.margin + 16, cardY + 32, { width: 300, lineBreak: false });

  // Pills row
  const pillY = cardY + 60;
  let pillX = PAGE.margin + 16;
  const drawPill = (text) => {
    doc.font('Helvetica-Bold').fontSize(8);
    const padX = 8;
    const w = doc.widthOfString(text) + padX * 2;
    doc.roundedRect(pillX, pillY, w, 18, 9).fill(COLORS.pillBg);
    doc.fillColor(COLORS.pillText).font('Helvetica-Bold').fontSize(8)
      .text(text, pillX + padX, pillY + 5, { lineBreak: false });
    pillX += w + 6;
  };
  drawPill(account.accountType);
  drawPill(account.currency);
  drawPill(account.status);

  // Right-side period block inside the card
  const periodBoxW = 200;
  const periodX = PAGE.margin + PAGE.contentWidth - periodBoxW - 16;
  doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8)
    .text('STATEMENT PERIOD', periodX, cardY + 16, { width: periodBoxW, align: 'right', lineBreak: false });
  doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(11)
    .text(`${fmtDate(period.from)}  →  ${fmtDate(period.to)}`,
      periodX, cardY + 32, { width: periodBoxW, align: 'right', lineBreak: false });
  doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8)
    .text(`${Math.round((new Date(period.to) - new Date(period.from)) / 86400000) + 1} days`,
      periodX, cardY + 50, { width: periodBoxW, align: 'right', lineBreak: false });

  // ════════════════════════════════════════════════════════
  // BALANCE TILES (Opening / Closing / Current)
  // ════════════════════════════════════════════════════════
  const tilesY = cardY + cardH + 14;
  const tileGap = 10;
  const tileW = (PAGE.contentWidth - tileGap * 2) / 3;
  const tileH = 60;

  const drawTile = (x, label, value, accent) => {
    doc.roundedRect(x, tilesY, tileW, tileH, 6).fillAndStroke(COLORS.white, COLORS.border);
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(7.5)
      .text(label.toUpperCase(), x + 12, tilesY + 11, { width: tileW - 24, characterSpacing: 0.5, lineBreak: false });
    doc.fillColor(accent || COLORS.text).font('Helvetica-Bold').fontSize(13)
      .text(fmtMoney(value, account.currency), x + 12, tilesY + 28, { width: tileW - 24, lineBreak: false });
  };
  drawTile(PAGE.margin, 'Opening Balance', openingBalance, COLORS.text);
  drawTile(PAGE.margin + tileW + tileGap, 'Closing Balance', closingBalance,
    closingBalance < 0 ? COLORS.debit : COLORS.primary);
  drawTile(PAGE.margin + (tileW + tileGap) * 2, 'Current Balance', currentBalance, COLORS.accent);

  // ════════════════════════════════════════════════════════
  // SUMMARY ROW (Credits / Debits / Fees / Count)
  // ════════════════════════════════════════════════════════
  const sumY = tilesY + tileH + 12;
  const sumH = 56;
  doc.roundedRect(PAGE.margin, sumY, PAGE.contentWidth, sumH, 6)
    .fillAndStroke(COLORS.summaryBg, COLORS.border);

  const sumCols = [
    { label: 'Total Credits', value: fmtMoney(summary.totalCredits, account.currency), color: COLORS.credit },
    { label: 'Total Debits',  value: fmtMoney(summary.totalDebits, account.currency),  color: COLORS.debit  },
    { label: 'Total Fees',    value: fmtMoney(summary.totalFees, account.currency),    color: COLORS.text   },
    { label: 'Transactions',  value: String(summary.count),                            color: COLORS.primary},
  ];
  const colW = PAGE.contentWidth / sumCols.length;
  sumCols.forEach((c, i) => {
    const x = PAGE.margin + i * colW;
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(7.5)
      .text(c.label.toUpperCase(), x + 12, sumY + 12, { width: colW - 16, characterSpacing: 0.5, lineBreak: false });
    doc.fillColor(c.color).font('Helvetica-Bold').fontSize(11)
      .text(c.value, x + 12, sumY + 28, { width: colW - 16, lineBreak: false });
    if (i < sumCols.length - 1) {
      doc.moveTo(x + colW, sumY + 10).lineTo(x + colW, sumY + sumH - 10)
        .strokeColor(COLORS.border).lineWidth(1).stroke();
    }
  });

  // ════════════════════════════════════════════════════════
  // TRANSACTIONS TABLE
  // ════════════════════════════════════════════════════════
  const TABLE_START = sumY + sumH + 22;

  // Column layout (sum = 515)
  const COLS = [
    { key: 'date',    label: 'Date',         x: PAGE.margin,        w: 70,  align: 'left'  },
    { key: 'ref',     label: 'Reference',    x: PAGE.margin + 70,   w: 95,  align: 'left'  },
    { key: 'party',   label: 'Counterparty', x: PAGE.margin + 165,  w: 140, align: 'left'  },
    { key: 'type',    label: 'Type',         x: PAGE.margin + 305,  w: 50,  align: 'left'  },
    { key: 'amount',  label: 'Amount',       x: PAGE.margin + 355,  w: 75,  align: 'right' },
    { key: 'balance', label: 'Balance',      x: PAGE.margin + 430,  w: 85,  align: 'right' },
  ];

  const ROW_H = 24;
  const HEADER_H = 22;

  let cursorY = TABLE_START;

  // Section title
  doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(11)
    .text('Transactions', PAGE.margin, cursorY, { lineBreak: false });
  doc.fillColor(COLORS.muted).font('Helvetica').fontSize(9)
    .text(`${transactions.length} record${transactions.length === 1 ? '' : 's'}`,
      PAGE.margin, cursorY, { width: PAGE.contentWidth, align: 'right', lineBreak: false });
  cursorY += 18;

  const drawTableHeader = () => {
    doc.rect(PAGE.margin, cursorY, PAGE.contentWidth, HEADER_H).fill(COLORS.primary);
    doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(9);
    for (const c of COLS) {
      doc.text(c.label, c.x + 6, cursorY + 7, {
        width: c.w - 12,
        align: c.align,
        lineBreak: false,
      });
    }
    cursorY += HEADER_H;
  };

  drawTableHeader();

  if (transactions.length === 0) {
    doc.fillColor(COLORS.muted).font('Helvetica-Oblique').fontSize(10)
      .text('No transactions in this period.', PAGE.margin, cursorY + 14, {
        width: PAGE.contentWidth, align: 'center', lineBreak: false,
      });
    cursorY += 40;
  } else {
    transactions.forEach((t, idx) => {
      // Page break
      if (cursorY + ROW_H > PAGE.bottom) {
        doc.addPage();
        cursorY = PAGE.margin;
        doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(11)
          .text('Transactions (cont.)', PAGE.margin, cursorY, { lineBreak: false });
        cursorY += 18;
        drawTableHeader();
      }

      // Alternating row background
      if (idx % 2 === 1) {
        doc.rect(PAGE.margin, cursorY, PAGE.contentWidth, ROW_H).fill(COLORS.rowAlt);
      }

      const isDebit = t.direction === 'DEBIT';
      const amountStr = `${isDebit ? '-' : '+'} ${fmtMoney(t.amount)}`;
      const amountColor = isDebit ? COLORS.debit : COLORS.credit;

      // Date column (date on top, time below)
      doc.fillColor(COLORS.text).font('Helvetica').fontSize(8.5)
        .text(fmtDate(t.date), COLS[0].x + 6, cursorY + 5,
          { width: COLS[0].w - 12, align: COLS[0].align, lineBreak: false });
      doc.fillColor(COLORS.muted).fontSize(7.5)
        .text(fmtTime(t.date), COLS[0].x + 6, cursorY + 15,
          { width: COLS[0].w - 12, align: COLS[0].align, lineBreak: false });

      // Reference
      doc.fillColor(COLORS.text).font('Helvetica').fontSize(8)
        .text(t.referenceNumber || '-', COLS[1].x + 6, cursorY + 9,
          { width: COLS[1].w - 12, align: COLS[1].align, lineBreak: false, ellipsis: true });

      // Counterparty (name on top, masked account below)
      doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(8.5)
        .text(t.counterpartyName || '-', COLS[2].x + 6, cursorY + 5,
          { width: COLS[2].w - 12, align: COLS[2].align, lineBreak: false, ellipsis: true });
      doc.fillColor(COLORS.muted).font('Helvetica').fontSize(7.5)
        .text(t.counterpartyAccountNumberMasked || '-', COLS[2].x + 6, cursorY + 15,
          { width: COLS[2].w - 12, align: COLS[2].align, lineBreak: false, ellipsis: true });

      // Type
      doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8)
        .text(t.transferType, COLS[3].x + 6, cursorY + 9,
          { width: COLS[3].w - 12, align: COLS[3].align, lineBreak: false });

      // Amount
      doc.fillColor(amountColor).font('Helvetica-Bold').fontSize(9.5)
        .text(amountStr, COLS[4].x + 6, cursorY + 8,
          { width: COLS[4].w - 12, align: COLS[4].align, lineBreak: false });

      // Balance
      doc.fillColor(COLORS.text).font('Helvetica').fontSize(8.5)
        .text(fmtMoney(t.runningBalance), COLS[5].x + 6, cursorY + 8,
          { width: COLS[5].w - 12, align: COLS[5].align, lineBreak: false });

      // Row bottom border
      doc.moveTo(PAGE.margin, cursorY + ROW_H)
        .lineTo(PAGE.margin + PAGE.contentWidth, cursorY + ROW_H)
        .strokeColor(COLORS.border).lineWidth(0.5).stroke();

      cursorY += ROW_H;
    });
  }

  // Truncated note
  if (statement.truncated) {
    cursorY += 10;
    doc.fillColor(COLORS.debit).font('Helvetica-Oblique').fontSize(8)
      .text('Note: Result truncated. Narrow your date range to view the complete statement.',
        PAGE.margin, cursorY, { width: PAGE.contentWidth, align: 'center', lineBreak: false });
  }

  // ════════════════════════════════════════════════════════
  // FOOTER on every page (uses bufferPages)
  // ════════════════════════════════════════════════════════
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const footerY = 800;
    doc.moveTo(PAGE.margin, footerY)
      .lineTo(PAGE.margin + PAGE.contentWidth, footerY)
      .strokeColor(COLORS.border).lineWidth(0.5).stroke();

    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(7.5)
      .text('Nexus Bank • This is a system-generated statement and does not require a signature.',
        PAGE.margin, footerY + 8, { width: PAGE.contentWidth, align: 'left', lineBreak: false });
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(7.5)
      .text(`Page ${i - range.start + 1} of ${range.count}`,
        PAGE.margin, footerY + 8, { width: PAGE.contentWidth, align: 'right', lineBreak: false });
  }

  doc.end();
};

module.exports = { streamStatementPdf };
