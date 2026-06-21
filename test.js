/**
 * test.js
 * Dependency-free test suite for calc.js. Run with: node test.js
 * Uses Node's built-in assert module only — no test framework required to install.
 */
const assert = require('assert');
const { FACTORS, DAILY_TARGET, computeEntry, biggestLever, classifyTotal } = require('./calc.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('PASS: ' + name);
  } catch (err) {
    failed++;
    console.error('FAIL: ' + name);
    console.error('  ' + err.message);
  }
}

test('zero travel and a recycled, vegan day produces a small total', () => {
  const r = computeEntry({
    carKm: 0, transitKm: 0, elecKwh: 0, cookingFactor: 0.3,
    dietFactor: 1.5, flightKmMonth: 0, recycled: true, singleUse: false
  });
  // 0 + 0 + 0 + 0.3 + 1.5 + 0 - 0.25 = 1.55, rounded to 1 decimal = 1.6
  assert.strictEqual(r.total, 1.6, 'expected 1.6, got ' + r.total);
});

test('car travel scales linearly with the car emission factor', () => {
  const base = computeEntry({ carKm: 0, transitKm: 0, elecKwh: 0, cookingFactor: 0, dietFactor: 0, flightKmMonth: 0, recycled: false, singleUse: false });
  const withCar = computeEntry({ carKm: 50, transitKm: 0, elecKwh: 0, cookingFactor: 0, dietFactor: 0, flightKmMonth: 0, recycled: false, singleUse: false });
  const expectedDelta = 50 * FACTORS.car;
  assert.ok(Math.abs((withCar.total - base.total) - expectedDelta) < 0.05,
    `expected delta ~${expectedDelta}, got ${withCar.total - base.total}`);
});

test('total is never negative even when waste credit exceeds other categories', () => {
  const r = computeEntry({
    carKm: 0, transitKm: 0, elecKwh: 0, cookingFactor: 0,
    dietFactor: 0, flightKmMonth: 0, recycled: true, singleUse: false
  });
  assert.ok(r.total >= 0, 'total should never be negative, got ' + r.total);
});

test('negative or non-numeric inputs are treated as zero, not NaN', () => {
  const r = computeEntry({
    carKm: -10, transitKm: 'abc', elecKwh: undefined, cookingFactor: 0.3,
    dietFactor: 1.5, flightKmMonth: null, recycled: false, singleUse: false
  });
  assert.ok(Number.isFinite(r.total), 'total should be a finite number, got ' + r.total);
  assert.ok(r.total >= 0);
});

test('recycling lowers the total relative to an identical non-recycling day', () => {
  const without = computeEntry({ carKm: 10, transitKm: 0, elecKwh: 2, cookingFactor: 0.9, dietFactor: 2.5, flightKmMonth: 0, recycled: false, singleUse: false });
  const withRecycling = computeEntry({ carKm: 10, transitKm: 0, elecKwh: 2, cookingFactor: 0.9, dietFactor: 2.5, flightKmMonth: 0, recycled: true, singleUse: false });
  assert.ok(withRecycling.total < without.total, 'recycling should reduce the total');
});

test('biggestLever correctly identifies the dominant category', () => {
  const breakdown = { car: 1, transit: 0.2, elec: 0.5, cook: 0.3, diet: 5.4, flight: 0, waste: 0.2, total: 7.6 };
  const lever = biggestLever(breakdown);
  assert.strictEqual(lever.key, 'diet', 'expected diet to be the dominant lever');
});

test('biggestLever picks flight when a flight dominates the day', () => {
  const breakdown = { car: 0.5, transit: 0.1, elec: 0.5, cook: 0.3, diet: 2.5, flight: 12, waste: 0.2, total: 16.1 };
  const lever = biggestLever(breakdown);
  assert.strictEqual(lever.key, 'flight');
});

test('DAILY_TARGET is exposed for the UI to compare readings against', () => {
  assert.strictEqual(typeof DAILY_TARGET, 'number');
  assert.ok(DAILY_TARGET > 0);
});

test('classifyTotal returns good at or under the daily target', () => {
  assert.strictEqual(classifyTotal(DAILY_TARGET), 'good');
  assert.strictEqual(classifyTotal(1.0), 'good');
});

test('classifyTotal returns mid between the target and 5kg', () => {
  assert.strictEqual(classifyTotal(3.5), 'mid');
  assert.strictEqual(classifyTotal(5), 'mid');
});

test('classifyTotal returns warn above 5kg', () => {
  assert.strictEqual(classifyTotal(5.1), 'warn');
  assert.strictEqual(classifyTotal(20), 'warn');
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exitCode = 1;
