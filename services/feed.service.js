const feedRepository = require('../repositories/feed.repository');
const { rankVideos } = require('./ranking');

// ---------- Dummy user‑interest fetcher (replace with real DB) ----------
const getUserInterests = async (userId) => {
  if (!userId) return null;

  // Simulate fetching from a user_interests table.
  // For now, return dummy categories for user 123.
  // In production, query: SELECT categories, subscribed_users FROM user_preferences WHERE user_id = ?
  // Categories are stored as comma-separated strings, or you can store as JSON.
  const dummyData = {
    123: {
      categories: ['science', 'technology', 'programming'],
      subscribedUsers: [101, 102]
    }
  };
  return dummyData[userId] || null;
};

/**
 * Personalisation hook – decides filters and ordering based on user.
 *
 * @param {number|null} userId
 * @returns {Promise<{ filters: Object, orderBy: string }>}
 */
const applyPersonalization = async (userId) => {
  // Default: no filters, chronological order
  let filters = {};
  let orderBy = 'created_at DESC, id DESC';

  if (userId) {
    const interests = await getUserInterests(userId);
    if (interests && (interests.categories?.length || interests.subscribedUsers?.length)) {
      // If user has interests, apply filters
      if (interests.categories?.length) {
        filters.categories = interests.categories;
      }
      if (interests.subscribedUsers?.length) {
        filters.subscribedUsers = interests.subscribedUsers;
      }
      // Optionally, you can also order by a personalised score (SQL computed)
      // orderBy = 'score DESC';  // if you want trending within interests
    } else {
      // User exists but has no interests → show trending (most scored)
      orderBy = 'score DESC';
    }
  } else {
    // No user (not logged in) → show trending
    orderBy = 'score DESC';
  }

  return { filters, orderBy };
};

/**
 * Get a paginated feed.
 */
const getFeed = async ({ limit, cursor, userId }) => {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
  const fetchLimit = safeLimit + 1;

  // 1. Personalise the query (fetch user interests & set filters/order)
  const { filters, orderBy } = await applyPersonalization(userId);

  // 2. Fetch candidates from repository
  const rows = await feedRepository.getFeedCandidates({
    limit: fetchLimit,
    cursor,
    filters,
    orderBy
  });

  // 3. Determine hasMore and slice
  let hasMore = false;
  let videos = rows;
  if (rows.length > safeLimit) {
    hasMore = true;
    videos = rows.slice(0, safeLimit);
  }

  // 4. Optional: apply advanced ranking (post‑fetch)
  //    Currently a no‑op; you can later add ML scoring, diversifying, etc.
  const user = userId ? { id: userId } : null;
  const ranked = rankVideos(videos, user);

  // 5. Generate next cursor (based on the last video after ranking)
  let nextCursor = null;
  if (hasMore && ranked.length > 0) {
    const last = ranked[ranked.length - 1];
    const payload = { created_at: last.created_at, id: last.id };
    nextCursor = Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  return { videos: ranked, nextCursor, hasMore };
};

module.exports = { getFeed };