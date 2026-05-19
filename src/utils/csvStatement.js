/**
 * Build a CSV string for a bank account statement (no external deps).
 */

const escapeCsv = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const row = (...fields) => fields.map(escapeCsv).join(',');

const buildStatementCsv = (statement) => {
  const lines = [];
  const { account, period, openingBalance, closingBalance, summary, transactions } = statement;

  // ── Header section ──
  lines.push(row('Nexus Bank — Account Statement'));
  lines.push(row('Account Holder', account.holderName || ''));
  lines.push(row('Account Number', account.accountNumberMasked));
  lines.push(row('Account Type', account.accountType));
  lines.push(row('Currency', account.currency));
  lines.push(row('Period From', new Date(period.from).toISOString()));
  lines.push(row('Period To', new Date(period.to).toISOString()));
  lines.push(row('Opening Balance', openingBalance.toFixed(2)));
  lines.push(row('Closing Balance', closingBalance.toFixed(2)));
  lines.push(row('Total Credits', summary.totalCredits.toFixed(2)));
  lines.push(row('Total Debits', summary.totalDebits.toFixed(2)));
  lines.push(row('Total Fees', summary.totalFees.toFixed(2)));
  lines.push(row('Transaction Count', summary.count));
  lines.push('');

  // ── Transactions table ──
  lines.push(row(
    'Date',
    'Reference',
    'Type',
    'Direction',
    'Counterparty',
    'Counterparty A/C',
    'Purpose',
    'Remarks',
    'Amount',
    'Fee',
    'Net Amount',
    'Currency',
    'Running Balance',
    'Status'
  ));

  for (const t of transactions) {
    lines.push(row(
      new Date(t.date).toISOString(),
      t.referenceNumber,
      t.transferType,
      t.direction,
      t.counterpartyName || '',
      t.counterpartyAccountNumberMasked || '',
      t.purpose || '',
      t.remarks || '',
      Number(t.amount).toFixed(2),
      Number(t.fee).toFixed(2),
      Number(t.netAmount).toFixed(2),
      t.currency,
      Number(t.runningBalance).toFixed(2),
      t.status
    ));
  }

  return lines.join('\r\n');
};

module.exports = { buildStatementCsv };
