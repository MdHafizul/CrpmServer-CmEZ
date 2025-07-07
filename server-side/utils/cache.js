const NodeCache = require('node-cache');

// Create a single shared instance of NodeCache
const cache = new NodeCache({ stdTTL: 600 }); // Cache TTL of 5 minutes

module.exports = cache;