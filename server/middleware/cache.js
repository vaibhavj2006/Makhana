// Simple in-memory TTL cache for GET routes. Good enough for a single-instance
// deploy (like your current Render setup); if you ever scale to multiple server
// instances, swap the Map for Redis — the two exported functions are the only
// things that would need to change.

const cacheStore = new Map(); // key -> { body, expiresAt }

// Wrap a GET route: router.get('/', cache(60), getProducts)
// ttlSeconds: how long a response stays cached before it's treated as stale.
function cache(ttlSeconds) {
  return (req, res, next) => {
    const key = req.originalUrl; // includes query string, so ?category=x is cached separately from ?category=y

    const hit = cacheStore.get(key);
    if (hit && hit.expiresAt > Date.now()) {
      res.set('X-Cache', 'HIT');
      return res.json(hit.body);
    }

    // Wrap res.json so we capture whatever the real handler sends, without
    // the handler needing to know caching exists at all.
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Only cache successful responses — never cache an error body.
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheStore.set(key, { body, expiresAt: Date.now() + ttlSeconds * 1000 });
      }
      res.set('X-Cache', 'MISS');
      return originalJson(body);
    };

    next();
  };
}

// Call this after any product create/update/delete so shoppers don't see
// stale listings for up to a full TTL window after an admin change.
// Clears everything under /api/products (listings, featured, individual
// slugs) rather than trying to selectively invalidate — simpler and cheap
// at this scale.
function clearProductsCache() {
  for (const key of cacheStore.keys()) {
    if (key.startsWith('/api/products')) {
      cacheStore.delete(key);
    }
  }
}

module.exports = { cache, clearProductsCache };
