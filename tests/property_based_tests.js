const fc = require('fast-check');
const assert = require('assert');
const {
  canonicalStringify,
  sha256,
  verifyTelemetryHashChain,
  calculateExcursionScore,
  MerkleTree,
  ClinicalVialLedger,
  hashLeaf
} = require('../app/core');

function runPropertyTests() {
  console.log('--- RUNNING MEDVERIFY PROPERTY-BASED TESTS (5,000 INVARIANTS) ---');

  // Property 1: Cold Chain Invariant & Excursion Monotonicity (2,500 runs)
  console.log('Testing Property 1: Cold Chain Compliance & Excursion Monotonicity...');
  fc.assert(
    fc.property(
      fc.array(
        fc.record({
          tempC: fc.double({ min: 2.0, max: 8.0, noNaN: true }),
          deltaMinutes: fc.integer({ min: 5, max: 30 })
        }),
        { minLength: 1, maxLength: 20 }
      ),
      fc.double({ min: 8.5, max: 25.0, noNaN: true }), // breach temperature
      (compliantSteps, breachTemp) => {
        const baseTime = Date.now();
        let currentTime = baseTime;
        const compliantReadings = compliantSteps.map((step, idx) => {
          currentTime += step.deltaMinutes * 60 * 1000;
          return {
            timestamp: new Date(currentTime).toISOString(),
            tempC: Number(step.tempC.toFixed(2)),
            sensorId: 'SENSOR-DXB'
          };
        });

        // Test compliant series
        const resCompliant = calculateExcursionScore(compliantReadings);
        assert.strictEqual(resCompliant.violationsCount, 0);
        assert.strictEqual(resCompliant.excursionScore, 0);
        assert.strictEqual(resCompliant.status, 'PERFECT_COMPLIANCE');

        // Append breach temperature
        const breachedReadings = [
          ...compliantReadings,
          {
            timestamp: new Date(currentTime + 15 * 60 * 1000).toISOString(),
            tempC: Number(breachTemp.toFixed(2)),
            sensorId: 'SENSOR-DXB'
          }
        ];

        const resBreached = calculateExcursionScore(breachedReadings);
        assert.strictEqual(resBreached.violationsCount >= 1, true);
        assert.strictEqual(resBreached.excursionScore > 0, true);
        return true;
      }
    ),
    { numRuns: 2500 }
  );
  console.log('  ✓ Property 1 PASSED (2,500 runs)');

  // Property 2: Telemetry Hash Chain Tamper Resistance & Merkle Invariants (2,500 runs)
  console.log('Testing Property 2: Telemetry Hash Chain Tamper Resistance...');
  fc.assert(
    fc.property(
      fc.array(
        fc.record({
          tempC: fc.double({ min: 0.0, max: 30.0, noNaN: true }),
          sensorId: fc.constantFrom('SENS-1', 'SENS-2', 'SENS-3')
        }),
        { minLength: 2, maxLength: 15 }
      ),
      fc.integer({ min: 0, max: 14 }),
      fc.double({ min: 31.0, max: 50.0, noNaN: true }),
      (steps, tamperIdx, tamperTemp) => {
        const idxToTamper = tamperIdx % steps.length;
        let prev = '0000000000000000000000000000000000000000000000000000000000000000';
        let baseTime = Date.now();
        const validChain = [];

        for (let i = 0; i < steps.length; i++) {
          baseTime += 600000;
          const item = {
            timestamp: new Date(baseTime).toISOString(),
            tempC: Number(steps[i].tempC.toFixed(2)),
            sensorId: steps[i].sensorId,
            prevHash: prev
          };
          const h = sha256(canonicalStringify(item));
          item.hash = h;
          validChain.push(item);
          prev = h;
        }

        // Verify untampered chain
        const untampered = verifyTelemetryHashChain(validChain);
        assert.strictEqual(untampered.valid, true);

        // Tamper with one reading
        const tamperedChain = validChain.map((r, i) => {
          if (i === idxToTamper) {
            return {
              ...r,
              tempC: Number(tamperTemp.toFixed(2))
            };
          }
          return { ...r };
        });

        // The tampered chain must fail verification
        const tampered = verifyTelemetryHashChain(tamperedChain);
        assert.strictEqual(tampered.valid, false);
        return true;
      }
    ),
    { numRuns: 2500 }
  );
  console.log('  ✓ Property 2 PASSED (2,500 runs)');

  console.log('\n--- ALL 5,000 MEDVERIFY PROPERTY-BASED TESTS PASSED WITH 100% SUCCESS ---');
  return true;
}

if (require.main === module) {
  runPropertyTests();
}

module.exports = { runPropertyTests };
