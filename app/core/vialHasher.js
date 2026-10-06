const crypto = require('crypto');

/**
 * Standardize and canonically stringify an object for cryptographic reproducibility.
 * Filters prototype keys to prevent prototype pollution.
 */
function canonicalStringify(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalStringify).join(',') + ']';
  }
  const keys = Object.getOwnPropertyNames(obj).filter(
    k => k !== '__proto__' && k !== 'constructor' && k !== 'prototype'
  ).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalStringify(obj[k])).join(',') + '}';
}

/**
 * Hash a canonical string using SHA-256
 */
function sha256(data) {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Compute manufacturer HMAC signature for an injectable vial
 */
function signVialPayload(vialData, manufacturerSecret) {
  const canonical = canonicalStringify(vialData);
  return crypto.createHmac('sha256', manufacturerSecret).update(canonical, 'utf8').digest('hex');
}

/**
 * Verify manufacturer signature
 */
function verifyVialSignature(vialData, signature, manufacturerSecret) {
  const expected = signVialPayload(vialData, manufacturerSecret);
  return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
}

/**
 * Hash vial payload into a cryptographically unique identifier
 */
function hashVial(vial) {
  const canonical = canonicalStringify({
    manufacturer: vial.manufacturer,
    productName: vial.productName,
    batchId: vial.batchId,
    serialNumber: vial.serialNumber,
    mfgDate: vial.mfgDate,
    expDate: vial.expDate,
    dosageMgOrUnits: vial.dosageMgOrUnits,
    tempWindowMinC: vial.tempWindowMinC || 2.0,
    tempWindowMaxC: vial.tempWindowMaxC || 8.0
  });
  return sha256(canonical);
}

module.exports = {
  canonicalStringify,
  sha256,
  signVialPayload,
  verifyVialSignature,
  hashVial
};
