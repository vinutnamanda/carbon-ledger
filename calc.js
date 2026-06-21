/**
 * calc.js
 * Pure calculation logic for Carbon Ledger, isolated from the DOM so it can be
 * unit-tested with plain Node (see test.js) and reused by index.html in the browser.
 * No dependencies, no side effects, no I/O.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CarbonCalc = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // kg CO2e per unit. See README "Emission factors" for sourcing notes.
  const FACTORS = Object.freeze({
    car: 0.21,      // kg CO2e / km, average petrol car
    transit: 0.09,  // kg CO2e / km, bus/metro/train blended
    elec: 0.82,     // kg CO2e / kWh, India grid average
    flight: 0.15    // kg CO2e / km, short-haul
  });

  const DAILY_TARGET = 2.3; // kg CO2e, illustrative sustainable daily target

  /**
   * @param {Object} inputs
   * @param {number} inputs.carKm
   * @param {number} inputs.transitKm
   * @param {number} inputs.elecKwh
   * @param {number} inputs.cookingFactor   - kg CO2e/day, preset by cooking level
   * @param {number} inputs.dietFactor      - kg CO2e/day, preset by diet selection
   * @param {number} inputs.flightKmMonth   - km flown this month, prorated to a day
   * @param {boolean} inputs.recycled
   * @param {boolean} inputs.singleUse
   * @returns {Object} breakdown by category plus a non-negative total
   */
  function computeEntry(inputs) {
    const carKm = toNonNegativeNumber(inputs.carKm);
    const transitKm = toNonNegativeNumber(inputs.transitKm);
    const elecKwh = toNonNegativeNumber(inputs.elecKwh);
    const cookingFactor = toNonNegativeNumber(inputs.cookingFactor);
    const dietFactor = toNonNegativeNumber(inputs.dietFactor);
    const flightKmMonth = toNonNegativeNumber(inputs.flightKmMonth);

    const car = carKm * FACTORS.car;
    const transit = transitKm * FACTORS.transit;
    const elec = elecKwh * FACTORS.elec;
    const cook = cookingFactor;
    const diet = dietFactor;
    const flight = (flightKmMonth / 30) * FACTORS.flight;
    const waste = (inputs.recycled ? -0.25 : 0.2) + (inputs.singleUse ? 0.15 : 0);

    const rawTotal = car + transit + elec + cook + diet + flight + waste;

    return {
      car, transit, elec, cook, diet, flight, waste,
      total: Math.max(0, round1(rawTotal))
    };
  }

  /**
   * Identifies the single largest contributing category in a breakdown,
   * so the UI can surface one ranked action instead of a generic tip list.
   * @param {Object} breakdown - output of computeEntry()
   * @returns {Object} the highest-impact category descriptor
   */
  function biggestLever(breakdown) {
    const items = [
      { key: 'car', label: 'cutting car/bike travel', val: breakdown.car,
        advice: 'Swap one car trip for transit or carpooling — even 10 km saved cuts roughly 2.1 kg CO2e.' },
      { key: 'elec', label: 'reducing home electricity use', val: breakdown.elec,
        advice: 'Shift heavy appliance use outside peak hours and unplug idle devices.' },
      { key: 'diet', label: 'shifting your diet', val: breakdown.diet,
        advice: 'One plant-based meal swapped in today saves roughly 1-2 kg CO2e.' },
      { key: 'flight', label: 'flight travel', val: breakdown.flight,
        advice: 'Flights dominate footprints fast — bundle trips or choose direct routes.' },
      { key: 'transit', label: 'transit travel', val: breakdown.transit,
        advice: 'Your transit footprint is already efficient — keep favoring it over car trips.' }
    ];
    return items.reduce((max, item) => (item.val > max.val ? item : max), items[0]);
  }

  function toNonNegativeNumber(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return 0;
    return n;
  }

  function round1(n) {
    return Math.round(n * 10) / 10;
  }

  return { FACTORS, DAILY_TARGET, computeEntry, biggestLever };
});
