const feedService = require('../../services/feed.service');

/**
 * GET /dekho/video/feed
 * Query params: limit (default 20, max 50), cursor (base64)
 */
const getFeed = async (req, res) => {
  try {
    // 1. Parse and validate limit
    let limit = parseInt(req.query.limit, 10);
    if (isNaN(limit) || limit < 1) {
      limit = 20;
    } else if (limit > 50) {
      limit = 50;
    }

    // 2. Parse and validate cursor
    let cursor = null;
    if (req.query.cursor) {
      try {
        const decoded = Buffer.from(req.query.cursor, 'base64').toString('utf8');
        const parsed = JSON.parse(decoded);
        // Ensure required fields exist and are strings
        if (typeof parsed.created_at !== 'string' || typeof parsed.id !== 'string') {
          return res.status(400).json({ error: 'Invalid cursor format' });
        }
        cursor = { created_at: parsed.created_at, id: parsed.id };
      } catch {
        return res.status(400).json({ error: 'Malformed cursor' });
      }
    }

    // 3. (Optional) Get current user from JWT/session – for future personalisation
    const userId = null; // req.user?.id

    // 4. Call service
    const result = await feedService.getFeed({ limit, cursor, userId });

    // 5. Send response
    res.status(200).json({
      videos: result.videos,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore
    });

  } catch (err) {
    console.error('Feed error:', err);
    // Do NOT expose raw SQL errors or stack traces
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getFeed };