import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const close = (actual, expected, label, tolerance = 0.02) => {
  assert.ok(Number.isFinite(actual) && Number.isFinite(expected), `${label}: finite amounts required`);
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} != ${expected}`);
};
async function files(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await files(path));
    else if (/\.m?js$/.test(entry.name)) result.push(path);
  }
  return result;
}
const sources = [...await files(join(root, 'web')), ...await files(join(root, 'scripts'))];
for (const path of sources) {
  const result = spawnSync(process.execPath, ['--check', path], { stdio: 'inherit' });
  assert.equal(result.status, 0, `JavaScript syntax failed: ${path}`);
}
for (const name of ['index.html', 'market.js', 'market-model.mjs', 'lab.html', 'styles.css', 'app.js', 'model.mjs']) {
  assert.ok((await stat(join(root, 'dist', name))).isFile(), `Missing built ${name}; run npm run build`);
}
const report = JSON.parse(await readFile(join(root, 'dist/data/dashboard.json'), 'utf8'));
assert.ok(report.meta && report.periods.length && report.countries.length, 'Missing report metadata or filter options');
assert.match(report.meta.sourceSha256, /^[a-f0-9]{64}$/, 'Missing source workbook identity');
assert.equal(report.meta.sheets.reduce((sum, sheet) => sum + sheet.rows, 0), report.meta.rowCount, 'Sheet counts must cover the workbook');
assert.ok(report.countries.includes('All markets'), 'An unfiltered report must be available');
assert.ok(Array.isArray(report.monthly) && report.monthly.length, 'Monthly export is empty');
for (const month of report.monthly) {
  assert.ok(month.month <= report.meta.completeThrough.slice(0, 7), 'Trend export must exclude partial or future months');
}
let comparisons = 0;
for (const period of report.periods) {
  assert.match(period.id, /^\d{4}-\d{2}$/, 'Invalid report month');
  assert.equal(Number(period.id.slice(0, 4)) - Number(period.previous.slice(0, 4)), 1, 'Comparison must be year over year');
  assert.equal(period.id.slice(5), period.previous.slice(5), 'Comparison calendar months differ');
  for (const country of report.countries) {
    const key = `${period.id}|${country}`;
    const comparison = report.comparisons[key];
    assert.ok(comparison, `Missing comparison: ${key}`);
    for (const side of ['current', 'previous']) {
      const metric = comparison[side];
      assert.ok(Number.isInteger(metric.rows) && metric.rows >= 0, `${key} ${side} fact row count`);
      if (metric.rows === 0) {
        // A missing eligible population cannot be displayed as an observed zero.
        for (const name of ['sales', 'cancellations', 'net', 'aov', 'knownSales', 'anonymousSales', 'anonymousShare']) {
          assert.equal(metric[name], null, `${key} ${side} ${name} must be unavailable without eligible rows`);
        }
        for (const name of ['invoices', 'customers', 'knownInvoices', 'units']) {
          assert.equal(metric[name], 0, `${key} ${side} ${name} must have no qualifying records`);
        }
        continue;
      }
      close(metric.sales - metric.cancellations, metric.net, `${key} ${side} net`);
      assert.ok(metric.invoices >= 0 && Number.isInteger(metric.invoices), `${key} invoice count`);
      if (metric.invoices) close(metric.sales / metric.invoices, metric.aov, `${key} ${side} AOV`);
      else assert.equal(metric.aov, null, `${key} AOV must be unavailable without invoices`);
      close(metric.knownSales + metric.anonymousSales, metric.sales, `${key} ${side} customer coverage`);
      if (metric.sales > 0) close(metric.anonymousSales / metric.sales, metric.anonymousShare, `${key} ${side} anonymous share`, 0.000001);
      else assert.equal(metric.anonymousShare, null, `${key} ${side} anonymous share has no denominator`);
    }
    const hasComparison = comparison.current.sales !== null && comparison.previous.sales !== null;
    if (hasComparison) close(comparison.current.sales - comparison.previous.sales, comparison.delta.sales, `${key} sales change`);
    else {
      for (const name of ['sales', 'salesPct', 'net', 'netPct', 'aov', 'aovPct', 'cancellations', 'cancellationsPct']) {
        assert.equal(comparison.delta[name], null, `${key} ${name} comparison requires both period populations`);
      }
      assert.equal(comparison.shapley, null, `${key} cannot decompose an unavailable comparison`);
    }
    if (comparison.shapley) {
      close(comparison.shapley.reduce((sum, item) => sum + item.contribution, 0),
        comparison.current.knownSales - comparison.previous.knownSales, `${key} Shapley identity`);
    }
    for (const name of ['countryBridge', 'productBridge']) {
      assert.ok(Array.isArray(comparison[name]), `${key} missing ${name}`);
      for (const item of comparison[name]) close(item.current - item.previous, item.delta, `${key} ${name} ${item.name}`);
      // Segments preserve observed sales using zero for absent segment records;
      // that arithmetic does not make a missing headline period available.
      const observedMovement = (comparison.current.sales ?? 0) - (comparison.previous.sales ?? 0);
      close(comparison[name].reduce((sum, item) => sum + item.delta, 0), observedMovement, `${key} ${name} observed movement`);
    }
    comparisons += 1;
  }
}
for (const [country, cohorts] of Object.entries(report.cohorts)) {
  for (const cohort of cohorts) {
    assert.ok(cohort.size > 0, `${country} empty cohort`);
    assert.ok(cohort.mature90 >= cohort.repeat90 && cohort.mature90 <= cohort.size, `${country} repurchase denominator`);
    if (!cohort.mature90) assert.equal(cohort.repeat90Rate, null, `${country} immature rate must be unavailable`);
    else close(cohort.repeat90 / cohort.mature90, cohort.repeat90Rate, `${country} mature repurchase rate`, 0.000001);
    for (const cell of cohort.cells) {
      if (cell.rate === null) {
        assert.equal(cell.buyers, null, `${country} unavailable cohort count`);
        assert.ok(cell.month > report.meta.completeThrough.slice(0, 7), `${country} only incomplete/future cells may be unavailable`);
        continue;
      }
      assert.ok(cell.buyers >= 0 && cell.buyers <= cohort.size, `${country} cohort buyer count`);
      close(cell.buyers / cohort.size, cell.rate, `${country} cohort retention`, 0.000001);
      if (cell.offset === 0) close(cell.rate, 1, `${country} month-zero retention`, 0.000001);
    }
  }
}
const reconciliation = report.quality.reconciliation;
assert.equal(reconciliation.differenceUnits, 0, 'Exact raw-to-classified reconciliation');
assert.equal(reconciliation.rawNumericMovementUnits, reconciliation.classifiedMovementUnits, 'Exact movement identity');
assert.equal(report.quality.counts.reduce((sum, item) => sum + item.amountUnits, 0), reconciliation.rawNumericMovementUnits, 'Disposition amounts must cover raw parsed movement');
assert.equal(report.quality.counts.reduce((sum, item) => sum + item.rows, 0), report.meta.rowCount, 'Every raw row must have one disposition');
assert.ok(Number.isInteger(reconciliation.unparsedAmountRows) && reconciliation.unparsedAmountRows >= 0, 'Unparsed count must remain explicit');

// The primary current-US report uses a separate source, population, and currency.
// It must never inherit the historical lab's fixed GBP conversion.
const market = JSON.parse(await readFile(join(root, 'dist/data/market.json'), 'utf8'));
assert.equal(market.meta.currency, 'USD', 'Current US source must be native USD');
assert.equal(market.meta.unit, 'USD millions', 'Source units must remain explicit');
assert.equal(market.meta.valueScale, 1_000_000, 'Dollar display must scale millions, not apply FX');
assert.equal(market.meta.nominal, true, 'Seasonal adjustment must not imply price adjustment');
assert.equal(market.meta.geography, 'United States', 'Current source population must be the United States');
assert.match(market.meta.releaseDate, /^\d{4}-\d{2}-\d{2}$/, 'Missing release vintage');
assert.match(market.meta.latestMonth, /^\d{4}-\d{2}$/, 'Missing latest observation month');
assert.ok(market.meta.files.length > 0, 'Current report needs frozen official source identities');
const marketSourceIds = new Set(market.meta.files.map((source) => source.id));
assert.equal(marketSourceIds.size, market.meta.files.length, 'Current source identities must be unique');
for (const source of market.meta.files) {
  assert.match(source.sha256, /^[a-f0-9]{64}$/, 'Missing current-source SHA-256');
  const sourceURL = new URL(source.url);
  assert.ok(source.bytes > 0 && sourceURL.protocol === 'https:' && (sourceURL.hostname === 'census.gov' || sourceURL.hostname.endsWith('.census.gov')), 'Current source must identify an official Census file');
}
const additiveIds = ['441', '442', '443', '444', '445', '446', '447', '448', '451', '452', '453', '454', '722'];
const actualAdditive = market.categories.filter((category) => category.additive).map((category) => category.id).sort();
assert.deepEqual(actualAdditive, [...additiveIds].sort(), 'Use 13 non-overlapping sectors; never mix nested parents and children');
assert.equal(market.categories.find((category) => category.id === 'total')?.additive, false, 'National total is not another additive sector');
assert.equal(new Set(market.categories.map((category) => category.id)).size, market.categories.length, 'Category identities must be unique');
assert.equal(market.periods[0], market.meta.latestMonth, 'The default observation must be the latest frozen month');
for (let i = 0; i < market.periods.length; i += 1) {
  assert.match(market.periods[i], /^\d{4}-\d{2}$/, 'Invalid current-report month');
  if (i) assert.ok(market.periods[i] < market.periods[i - 1], 'Periods must be unique and descending');
}
const monthBefore = (month, years = 0) => {
  const [year, number] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year - years, number - (years ? 1 : 2), 1));
  return date.toISOString().slice(0, 7);
};
const finite = (value) => typeof value === 'number' && Number.isFinite(value);
const delta = (current, previous) => finite(current) && finite(previous) ? current - previous : null;
const compareNullable = (actual, expected, label, tolerance = 0.000001) => {
  if (expected === null) assert.equal(actual, null, `${label} must remain unavailable`);
  else close(actual, expected, label, tolerance);
};
let marketPointCount = 0;
for (const [key, point] of Object.entries(market.points)) {
  assert.equal(key, `${point.category}|${point.month}`, 'Current point identity must preserve category and month');
  assert.ok(market.categories.some((category) => category.id === point.category), 'Point category is outside the declared model');
  for (const basis of ['sa', 'nsa']) {
    assert.ok(point[basis] === null || Number.isInteger(point[basis]), `${key} ${basis} source level must be integer USD millions or unavailable`);
    if (point[basis] !== null) {
      const reference = point.source[basis];
      assert.ok(reference && marketSourceIds.has(reference.file) && reference.sheet && Number.isInteger(reference.row) && reference.row > 0 && reference.column !== null && reference.column !== undefined,
        `${key} ${basis} must retain its source coordinates`);
    }
  }
  assert.ok(['advance', 'preliminary', 'revised', 'historical'].includes(point.status), `${key} estimate status`);
  assert.equal(point.vintage, market.meta.releaseDate, `${key} must preserve the frozen release vintage`);
  if (point.reported) {
    const official = point.reported;
    assert.equal(official.confidenceLevel, 0.9, `${key} official confidence level`);
    for (const change of ['mom', 'yoy']) {
      const estimate = official[`${change}Pct`];
      const halfWidth = official[`${change}HalfWidth`];
      if (finite(estimate) && finite(halfWidth)) {
        assert.ok(halfWidth >= 0, `${key} ${change} uncertainty margin`);
        const includesZero = estimate - halfWidth <= 0 && estimate + halfWidth >= 0;
        assert.equal(official[`${change}Significant`], !includesZero, `${key} ${change} significance must respect the official interval`);
        if (official[`${change}Interval`]) {
          close(official[`${change}Interval`][0], estimate - halfWidth, `${key} ${change} interval lower bound`, 0.000001);
          close(official[`${change}Interval`][1], estimate + halfWidth, `${key} ${change} interval upper bound`, 0.000001);
        }
      }
    }
  }
  marketPointCount += 1;
}
let marketBridgeCount = 0;
for (const [key, bridge] of Object.entries(market.bridges)) {
  const [month, basis] = key.split('|');
  assert.ok(['sa', 'nsa'].includes(basis), `${key} adjustment basis`);
  const total = market.points[`total|${month}`];
  assert.ok(total, `${key} current national estimate`);
  compareNullable(bridge.current, total[basis], `${key} matching current basis`);
  const previous = market.points[`total|${monthBefore(month)}`];
  const yearEarlier = market.points[`total|${monthBefore(month, 1)}`];
  if (previous) compareNullable(bridge.previous, previous[basis], `${key} matching prior basis`);
  if (yearEarlier) compareNullable(bridge.yoyPrevious, yearEarlier[basis], `${key} matching year-earlier basis`);
  compareNullable(bridge.delta, delta(bridge.current, bridge.previous), `${key} monthly difference`);
  compareNullable(bridge.yoyDelta, delta(bridge.current, bridge.yoyPrevious), `${key} annual difference`);
  assert.deepEqual(bridge.sectors.map((sector) => sector.id).sort(), [...additiveIds].sort(), `${key} non-overlapping sector bridge`);
  assert.ok(bridge.residual, `${key} requires an explicit aggregation residual`);
  for (const sector of bridge.sectors) {
    const point = market.points[`${sector.id}|${month}`];
    assert.ok(point, `${key} ${sector.id} source estimate`);
    compareNullable(sector.current, point[basis], `${key} ${sector.id} current basis`);
    compareNullable(sector.delta, delta(sector.current, sector.previous), `${key} ${sector.id} monthly difference`);
    compareNullable(sector.yoyDelta, delta(sector.current, sector.yoyPrevious), `${key} ${sector.id} annual difference`);
    const sectorPrevious = market.points[`${sector.id}|${monthBefore(month)}`];
    const sectorYearEarlier = market.points[`${sector.id}|${monthBefore(month, 1)}`];
    if (sectorPrevious) compareNullable(sector.previous, sectorPrevious[basis], `${key} ${sector.id} matching previous basis`);
    if (sectorYearEarlier) compareNullable(sector.yoyPrevious, sectorYearEarlier[basis], `${key} ${sector.id} matching annual basis`);
    const momPp = finite(sector.delta) && bridge.previous ? 100 * sector.delta / bridge.previous : null;
    const yoyPp = finite(sector.yoyDelta) && bridge.yoyPrevious ? 100 * sector.yoyDelta / bridge.yoyPrevious : null;
    compareNullable(sector.momContributionPp, momPp, `${key} ${sector.id} national monthly denominator`);
    compareNullable(sector.yoyContributionPp, yoyPp, `${key} ${sector.id} national annual denominator`);
  }
  for (const field of ['current', 'previous', 'delta', 'yoyPrevious', 'yoyDelta']) {
    if (finite(bridge[field]) && finite(bridge.residual[field]) && bridge.sectors.every((sector) => finite(sector[field]))) {
      close(bridge.sectors.reduce((sum, sector) => sum + sector[field], 0) + bridge.residual[field], bridge[field], `${key} ${field} sectors plus residual`, 0.000001);
    }
  }
  marketBridgeCount += 1;
}
assert.ok(market.quality.checks.length > 0 && market.quality.checks.every((check) => check.passed === true), 'Current snapshot release checks must pass');
const latestTotal = market.points[`total|${market.meta.latestMonth}`];
assert.ok(latestTotal?.reported, 'Latest national headline must retain official reported uncertainty');
if (market.meta.latestMonth === '2026-10' && market.meta.releaseDate === '2026-11-17') {
  assert.equal(latestTotal.sa, 748220, 'Frozen official October 2026 level');
  assert.equal(latestTotal.reported.momPct, 0.2, 'Frozen official monthly estimate');
  assert.equal(latestTotal.reported.momHalfWidth, 0.4, 'Frozen official 90% margin in percentage points');
  assert.equal(latestTotal.reported.momSignificant, false, 'The latest monthly interval includes zero');
}
let tests = [];
try { tests = (await readdir(join(root, 'tests'))).filter((name) => name.endsWith('.test.mjs')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
if (tests.length) {
  const result = spawnSync(process.execPath, ['--test', ...tests.map((name) => join(root, 'tests', name))], { stdio: 'inherit' });
  assert.equal(result.status, 0, 'Browser model tests failed');
}
console.log(`Checked ${sources.length} JavaScript files, ${marketPointCount} current US points, ${marketBridgeCount} SA/NSA bridges, ${comparisons} historical comparisons, cohort boundaries, and reconciliation.`);
