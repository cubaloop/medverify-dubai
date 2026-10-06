const assert = require('assert');
const {
  canonicalStringify,
  sha256,
  signVialPayload,
  verifyVialSignature,
  hashVial,
  verifyTelemetryHashChain,
  calculateExcursionScore,
  certifyColdChain,
  MerkleTree,
  ClinicalVialLedger,
  hashLeaf
} = require('../app/core');

function runUnitTests() {
  console.log('--- RUNNING MEDVERIFY UNIT TESTS ---');

  // Test 1: Canonical hashing & HMAC
  const vial = {
    manufacturer: 'Allergan Aesthetics',
    productName: 'Botox Cosmetic 100U',
    batchId: 'B77291-DXB',
    serialNumber: 'BTX-99482-UAE',
    mfgDate: '2026-01-10',
    expDate: '2027-01-10',
    dosageMgOrUnits: '100 Units',
    tempWindowMinC: 2.0,
    tempWindowMaxC: 8.0
  };
  const secretKey = 'Allergan-DHA-Secure-Root-Key-2026';
  const sig = signVialPayload(vial, secretKey);
  assert.strictEqual(typeof sig, 'string');
  assert.strictEqual(sig.length, 64);
  assert.strictEqual(verifyVialSignature(vial, sig, secretKey), true);
  console.log('  ✓ VialHasher: Hashes and verifies manufacturer HMAC signature correctly');

  // Test 2: Cold-Chain Telemetry Hash-Chain and Excursion Check
  const genesisHash = '0000000000000000000000000000000000000000000000000000000000000000';
  const readings = [];
  let prev = genesisHash;
  const baseTime = new Date('2026-10-01T08:00:00Z').getTime();

  for (let i = 0; i < 5; i++) {
    const time = new Date(baseTime + i * 10 * 60 * 1000).toISOString();
    const tempC = 4.2 + (i * 0.1); // Well within 2-8 C
    const item = {
      timestamp: time,
      tempC: Number(tempC.toFixed(2)),
      sensorId: 'SENS-COLD-99',
      prevHash: prev
    };
    const h = sha256(canonicalStringify(item));
    item.hash = h;
    readings.push(item);
    prev = h;
  }

  const chainResult = verifyTelemetryHashChain(readings);
  assert.strictEqual(chainResult.valid, true);
  assert.strictEqual(chainResult.count, 5);

  const excursion = calculateExcursionScore(readings);
  assert.strictEqual(excursion.isCompliant, true);
  assert.strictEqual(excursion.violationsCount, 0);
  assert.strictEqual(excursion.status, 'PERFECT_COMPLIANCE');

  const cert = certifyColdChain(vial.serialNumber, readings, 'Clinic-Secret-Key');
  assert.strictEqual(cert.payload.isCompliant, true);
  console.log('  ✓ ColdChainEngine: Verifies telemetry hash-chain & certifies unbroken cold chain');

  // Test 3: Clinical Vial Ledger & Double-Administration Prevention
  const ledger = new ClinicalVialLedger();
  ledger.registerVial(vial);
  assert.strictEqual(ledger.getVial(vial.serialNumber).status, 'VERIFIED_IN_VAULT');

  // Administer vial
  const receipt = ledger.administerVial({
    serialNumber: vial.serialNumber,
    physicianDhaLicense: 'DHA-P-44829',
    anonymizedPatientHash: sha256('PATIENT-EMIRATES-ID-784-1988-1234567-1'),
    anatomicalSite: 'Glabellar Complex & Frontalis',
    unitsAdministered: 50,
    coldChainCertId: cert.certificateId
  });

  assert.strictEqual(typeof receipt.receiptId, 'string');
  assert.strictEqual(ledger.getVial(vial.serialNumber).status, 'ADMINISTERED_AND_BURNED');

  // Attempt double-administration (must fail with critical error)
  assert.throws(() => {
    ledger.administerVial({
      serialNumber: vial.serialNumber,
      physicianDhaLicense: 'DHA-P-44829',
      anonymizedPatientHash: sha256('PATIENT-EMIRATES-ID-999-1990-7654321-2'),
      anatomicalSite: 'Masseter',
      unitsAdministered: 50,
      coldChainCertId: cert.certificateId
    });
  }, /CRITICAL_REUSE_DETECTED/);

  console.log('  ✓ InjectionLedger: Enforces single-use invariant and rejects reuse of burned vials');

  // Test 4: Merkle Tree Inclusion Proof
  const root = ledger.getMerkleRoot();
  assert.strictEqual(typeof root, 'string');
  assert.strictEqual(root.length, 64);
  console.log('  ✓ MerkleTree: Emits cryptographic Merkle root for clinic audit log');

  console.log('MEDVERIFY UNIT TESTS: All 4 passed, 0 failed.');
  return true;
}

if (require.main === module) {
  runUnitTests();
}

module.exports = { runUnitTests };
