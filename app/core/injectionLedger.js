const crypto = require('crypto');
const { sha256, canonicalStringify } = require('./vialHasher');

function hashLeaf(leafData) {
  return sha256(canonicalStringify(leafData));
}

class MerkleTree {
  constructor(leaves) {
    this.leaves = leaves.map(l => (typeof l === 'string' ? l : hashLeaf(l)));
    this.layers = [];
    this.build();
  }

  build() {
    let current = [...this.leaves];
    if (current.length === 0) {
      this.layers = [['0000000000000000000000000000000000000000000000000000000000000000']];
      return;
    }
    this.layers.push(current);
    while (current.length > 1) {
      const next = [];
      for (let i = 0; i < current.length; i += 2) {
        if (i + 1 < current.length) {
          const combined = current[i] < current[i + 1]
            ? current[i] + current[i + 1]
            : current[i + 1] + current[i];
          next.push(sha256(combined));
        } else {
          next.push(current[i]);
        }
      }
      this.layers.push(next);
      current = next;
    }
  }

  getRoot() {
    return this.layers[this.layers.length - 1][0];
  }

  getProof(leafIndex) {
    if (leafIndex < 0 || leafIndex >= this.leaves.length) {
      throw new Error('Index out of bounds');
    }
    const proof = [];
    let index = leafIndex;
    for (let layerIndex = 0; layerIndex < this.layers.length - 1; layerIndex++) {
      const layer = this.layers[layerIndex];
      const isRightNode = index % 2 === 1;
      const pairIndex = isRightNode ? index - 1 : index + 1;
      if (pairIndex < layer.length) {
        proof.push({
          position: isRightNode ? 'left' : 'right',
          hash: layer[pairIndex]
        });
      }
      index = Math.floor(index / 2);
    }
    return proof;
  }

  static verifyProof(leafHash, proof, root) {
    let currentHash = leafHash;
    for (const p of proof) {
      const combined = p.position === 'left'
        ? p.hash + currentHash
        : currentHash + p.hash;
      const sorted = p.position === 'left'
        ? (p.hash < currentHash ? p.hash + currentHash : currentHash + p.hash)
        : (currentHash < p.hash ? currentHash + p.hash : p.hash + currentHash);
      currentHash = sha256(sorted);
    }
    return currentHash === root;
  }
}

class ClinicalVialLedger {
  constructor() {
    this.vials = new Map();
    this.administrationReceipts = [];
  }

  registerVial(vial) {
    if (!vial.serialNumber) {
      throw new Error('Missing vial serialNumber');
    }
    if (this.vials.has(vial.serialNumber)) {
      throw new Error('Vial serial already exists: ' + vial.serialNumber);
    }
    const record = {
      ...vial,
      status: 'VERIFIED_IN_VAULT',
      registeredAt: new Date().toISOString()
    };
    this.vials.set(vial.serialNumber, record);
    return record;
  }

  getVial(serialNumber) {
    return this.vials.get(serialNumber) || null;
  }

  administerVial(params) {
    const {
      serialNumber,
      physicianDhaLicense,
      anonymizedPatientHash,
      anatomicalSite,
      unitsAdministered,
      coldChainCertId
    } = params;

    const vial = this.vials.get(serialNumber);
    if (!vial) {
      throw new Error('Vial not found in registry');
    }
    if (vial.status === 'ADMINISTERED_AND_BURNED') {
      throw new Error('CRITICAL_REUSE_DETECTED: Vial ' + serialNumber + ' was already administered and burned');
    }
    if (vial.status !== 'VERIFIED_IN_VAULT') {
      throw new Error('Invalid vial state: ' + vial.status);
    }

    const receiptPayload = {
      serialNumber,
      productName: vial.productName,
      batchId: vial.batchId,
      physicianDhaLicense,
      anonymizedPatientHash,
      anatomicalSite,
      unitsAdministered,
      coldChainCertId,
      timestamp: new Date().toISOString()
    };

    const receiptHash = sha256(canonicalStringify(receiptPayload));
    vial.status = 'ADMINISTERED_AND_BURNED';
    vial.burnedReceiptHash = receiptHash;
    vial.burnTimestamp = receiptPayload.timestamp;

    const receipt = {
      receiptId: 'INJ-PROOF-' + receiptHash.substring(0, 10).toUpperCase(),
      receiptHash,
      payload: receiptPayload
    };
    this.administrationReceipts.push(receipt);
    return receipt;
  }

  getMerkleRoot() {
    const leaves = Array.from(this.vials.values()).map(v => hashLeaf({
      serialNumber: v.serialNumber,
      batchId: v.batchId,
      status: v.status,
      burnReceiptHash: v.burnedReceiptHash || null
    }));
    const tree = new MerkleTree(leaves);
    return tree.getRoot();
  }

  getAllVials() {
    return Array.from(this.vials.values());
  }

  getAllReceipts() {
    return [...this.administrationReceipts];
  }
}

module.exports = {
  MerkleTree,
  ClinicalVialLedger,
  hashLeaf
};
