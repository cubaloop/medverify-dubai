const http = require('http');

/**
 * Wake-Lock Daemon: sends a heartbeat pulse to /healthz every 5 minutes
 * to prevent container idling/sleep on Render.
 */
function startWakeLockDaemon() {
  const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  console.log('[MedVerify WakeLock] Daemon started. Pulse interval: 300 seconds.');

  setInterval(() => {
    const port = process.env.PORT || 3000;
    const req = http.get(`http://127.0.0.1:${port}/healthz`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`[MedVerify WakeLock] Pulse OK at ${new Date().toISOString()} (HTTP ${res.statusCode})`);
      });
    });

    req.on('error', (err) => {
      console.warn('[MedVerify WakeLock] Pulse request failed:', err.message);
    });
  }, INTERVAL_MS);
}

module.exports = { startWakeLockDaemon };
