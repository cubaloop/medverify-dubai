const crypto = require('crypto');
const { sha256, canonicalStringify } = require('./vialHasher');

/**
 * Standard Cold-Chain Storage Parameters according to WHO & DHA guidelines for aesthetic biologics:
 * Normal Range: 2.0°C to 8.0°C
 * Critical Upper Limit: > 12.0°C (protein denaturing risk)
 * Critical Freezing Limit: < 0.0°C (emulsion breakage / protein precipitation)
 */
const STORAGE_LIMITS = {
  MIN_C: 2.0,
  MAX_C: 8.0,
  MAX_ALLOWED_DEGREE_MINUTES: 15.0 // Maximum allowable transient temperature excursion
};

/**
 * Verify IoT Temperature Hash Chain
 * Each reading contains { timestamp, tempC, sensorId, prevHash }
 * hash = SHA256(canonical({ timestamp, tempC, sensorId, prevHash }))
 */
function verifyTelemetryHashChain(readings, genesisHash = '0000000000000000000000000000000000000000000000000000000000000000') {
  if (!Array.isArray(readings) || readings.length === 0) {
    return { valid: false, reason: 'Empty telemetry series' };
  }

  let currentHash = genesisHash;
  for (let i = 0; i < readings.length; i++) {
    const r = readings[i];
    if (r.prevHash !== currentHash) {
      return {
        valid: false,
        reason: 'Broken hash chain at index ' + i,
        index: i,
        expectedPrevHash: currentHash,
        actualPrevHash: r.prevHash
      };
    }
    const payload = {
      timestamp: r.timestamp,
      tempC: Number(r.tempC.toFixed(2)),
      sensorId: r.sensorId,
      prevHash: r.prevHash
    };
    currentHash = sha256(canonicalStringify(payload));
    if (r.hash && r.hash !== currentHash) {
      return {
        valid: false,
        reason: 'Hash mismatch at index ' + i,
        index: i,
        expectedHash: currentHash,
        actualHash: r.hash
      };
    }
  }

  return { valid: true, terminalHash: currentHash, count: readings.length };
}

/**
 * Compute Cumulative Excursion Score
 * Calculates duration and magnitude of temperature violation.
 * Degree-minutes = sum( abs(tempC - limit) * deltaMinutes ) for each out-of-range interval.
 */
function calculateExcursionScore(readings, limits = STORAGE_LIMITS) {
  if (!Array.isArray(readings) || readings.length === 0) {
    return {
      status: 'INVALID',
      excursionScore: 0,
      totalHoursLogged: 0,
      minTemp: null,
      maxTemp: null,
      violationsCount: 0
    };
  }

  let excursionScore = 0;
  let violationsCount = 0;
  let minTemp = readings[0].tempC;
  let maxTemp = readings[0].tempC;
  let totalMinutes = 0;

  for (let i = 0; i < readings.length; i++) {
    const r = readings[i];
    const t = r.tempC;
    if (t < minTemp) minTemp = t;
    if (t > maxTemp) maxTemp = t;

    // Estimate step duration (assume 10 min sampling if single reading or delta)
    let deltaMinutes = 10;
    if (i > 0) {
      const dtMs = new Date(r.timestamp).getTime() - new Date(readings[i - 1].timestamp).getTime();
      deltaMinutes = Math.max(1, Math.min(60, dtMs / (1000 * 60)));
    }
    totalMinutes += deltaMinutes;

    if (t < limits.MIN_C) {
      const under = limits.MIN_C - t;
      excursionScore += under * deltaMinutes;
      violationsCount++;
    } else if (t > limits.MAX_C) {
      const over = t - limits.MAX_C;
      excursionScore += over * deltaMinutes;
      violationsCount++;
    }
  }

  const roundedScore = parseFloat(excursionScore.toFixed(3));
  let status = 'PERFECT_COMPLIANCE';
  if (violationsCount > 0) {
    if (roundedScore <= limits.MAX_ALLOWED_DEGREE_MINUTES && minTemp >= 0 && maxTemp <= 12) {
      status = 'ACCEPTABLE_TRANSIENT_EXCURSION';
    } else {
      status = 'CRITICAL_COLD_CHAIN_BREACH';
    }
  }

  return {
    status,
    isCompliant: status !== 'CRITICAL_COLD_CHAIN_BREACH',
    excursionScore: roundedScore,
    totalHoursLogged: parseFloat((totalMinutes / 60).toFixed(1)),
    minTemp: parseFloat(minTemp.toFixed(2)),
    maxTemp: parseFloat(maxTemp.toFixed(2)),
    violationsCount,
    limits
  };
}

/**
 * Generate cryptographic cold-chain certificate
 */
function certifyColdChain(vialSerial, readings, clinicKey) {
  const chainCheck = verifyTelemetryHashChain(readings);
  if (!chainCheck.valid) {
    throw new Error('Cannot certify cold chain: ' + chainCheck.reason);
  }

  const excursion = calculateExcursionScore(readings);
  const certPayload = {
    vialSerial,
    terminalTelemetryHash: chainCheck.terminalHash,
    readingsCount: chainCheck.count,
    isCompliant: excursion.isCompliant,
    status: excursion.status,
    excursionScore: excursion.excursionScore,
    minTemp: excursion.minTemp,
    maxTemp: excursion.maxTemp,
    certifiedAt: new Date().toISOString()
  };

  const certificateHash = sha256(canonicalStringify(certPayload));
  const signature = crypto.createHmac('sha256', clinicKey).update(certificateHash, 'utf8').digest('hex');

  return {
    certificateId: 'MED-CERT-' + certificateHash.substring(0, 12).toUpperCase(),
    payload: certPayload,
    certificateHash,
    signature
  };
}

module.exports = {
  STORAGE_LIMITS,
  verifyTelemetryHashChain,
  calculateExcursionScore,
  certifyColdChain
};
