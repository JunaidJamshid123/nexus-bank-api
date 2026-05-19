const catchAsync = require('../../utils/catchAsync');
const statementService = require('../../services/statement/statement.service');
const { buildStatementCsv } = require('../../utils/csvStatement');
const { streamStatementPdf } = require('../../utils/pdfStatement');

const buildFilename = (accountNumberMasked, period, ext) => {
  const safe = (accountNumberMasked || 'account').replace(/[^A-Za-z0-9]/g, '');
  const f = new Date(period.from).toISOString().slice(0, 10);
  const t = new Date(period.to).toISOString().slice(0, 10);
  return `statement_${safe}_${f}_to_${t}.${ext}`;
};

// GET /api/statement/:accountId
const getStatement = catchAsync(async (req, res) => {
  const data = await statementService.getStatement(req.user.id, req.params.accountId, {
    from: req.query.from,
    to: req.query.to,
    page: req.query.page,
    limit: req.query.limit,
  });
  res.json({ success: true, data });
});

// GET /api/statement/:accountId/summary
const getStatementSummary = catchAsync(async (req, res) => {
  const data = await statementService.getStatementSummary(req.user.id, req.params.accountId, {
    from: req.query.from,
    to: req.query.to,
  });
  res.json({ success: true, data });
});

// GET /api/statement/:accountId/download?format=csv|pdf|json
const downloadStatement = catchAsync(async (req, res) => {
  const format = (req.query.format || 'pdf').toLowerCase();
  const statement = await statementService.getStatementForDownload(
    req.user.id,
    req.params.accountId,
    { from: req.query.from, to: req.query.to }
  );

  if (format === 'json') {
    return res.json({ success: true, data: statement });
  }

  if (format === 'csv') {
    const csv = buildStatementCsv(statement);
    const filename = buildFilename(statement.account.accountNumberMasked, statement.period, 'csv');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csv);
  }

  // Default: PDF
  const filename = buildFilename(statement.account.accountNumberMasked, statement.period, 'pdf');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  streamStatementPdf(statement, res);
});

module.exports = {
  getStatement,
  getStatementSummary,
  downloadStatement,
};
