const feedRepository = require('../repositories/feed.repository');

/**
 * Ranking function – currently a no‑op (chronological order).
 * In the future, replace this with personalised ranking.
 *
 * @param {Array} videos - raw video rows
 * @param {Object|null} user - user context (interests, history, etc.)
 * @returns {Array} ranked videos
 */
const rankVideos = (videos, user) => {
  // For now: keep the order from the database (created_at DESC, id DESC)
  return videos;
};

/**
 * Get a paginated feed of public, ready videos.
 * 
 * @param {Object} params
 * @param {number} params.limit - page size (must be integer, 1-50)
 * @param {Object|null} params.cursor - { created_at, id } or null
 * @param {number|null} params.userId - optional for future personalisation
 * @returns {Promise<{ videos: Array, nextCursor: string|null, hasMore: boolean }>}
 */
const getFeed = async ({ limit, cursor, userId }) => {
  // Extra safety: clamp limit to [1, 50] in case controller missed it
  let safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
  // If controller already validated, this is a double-check.

  // Fetch one extra record to detect if there's a next page
  const fetchLimit = safeLimit + 1;
  const rows = await feedRepository.getFeedCandidates({ 
    limit: fetchLimit, 
    cursor 
  });

  let hasMore = false;
  let videos = rows;
  if (rows.length > safeLimit) {
    hasMore = true;
    videos = rows.slice(0, safeLimit);
  }

  // Apply ranking (currently no‑op)
  const ranked = rankVideos(videos, userId);

  // Generate cursor for next page (if any)
  let nextCursor = null;
  if (hasMore && ranked.length > 0) {
    const last = ranked[ranked.length - 1];
    const payload = { created_at: last.created_at, id: last.id };
    nextCursor = Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  return { videos: ranked, nextCursor, hasMore };
};

module.exports = { getFeed };