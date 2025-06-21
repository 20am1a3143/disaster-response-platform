// backend/utils/logger.js
function logAction(action, details = {}) {
  const log = {
    timestamp: new Date().toISOString(),
    action,
    ...details
  };
  console.log(JSON.stringify(log));
}

module.exports = { logAction };