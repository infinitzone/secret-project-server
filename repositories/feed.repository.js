const connectDB = require('../database/db');

/**
 * Build the SQL query and parameters for fetching feed candidates.
 *
 * @param {Object} options
 * @param {number} options.limit            - number of rows to fetch (incl. extra for hasMore)
 * @param {Object|null} options.cursor      - { created_at, id } or null
 * @param {Object} options.filters          - { categories: [], subscribedUsers: [], ... }
 * @param {string} options.orderBy          - SQL ORDER BY clause, e.g. "score DESC" or "created_at DESC, id DESC"
 * @returns {{ sql: string, params: Array }}
 */
const buildFeedQuery = ({ limit, cursor, filters = {}, orderBy = 'created_at DESC, id DESC' }) => {
  let sql = `
    SELECT
      v.id, v.user_id, v.title, v.description,
      v.video_path, v.thumbnail_path,
      v.mime_type, v.file_size,
      v.duration, v.width, v.height,
      v.views, v.likes_count,
      v.created_at,
      -- Compute a trending score (used when orderBy = 'score DESC')
      (v.likes_count * 2.0 + v.views * 0.5) / (julianday('now') - julianday(v.created_at) + 1.0) AS score
    FROM videos v
    WHERE v.status = 'processing'
      AND v.visibility = 'public'
  `;

  const params = [];

  // ---------- Category filter (multiple, comma‑separated in DB) ----------
  if (filters.categories && filters.categories.length) {
    // Use token matching: ensure the category appears as a whole token.
    // Example: category = "science,technology,programming"
    // To match "technology", we check if ",technology," is inside ",science,technology,programming,"
    const categoryConditions = filters.categories.map(() => 
      `(',' || v.category || ',' LIKE '%,' || ? || ',%')`
    );
    sql += ` AND (${categoryConditions.join(' OR ')})`;
    params.push(...filters.categories);
  }

  // ---------- Subscription filter (videos from followed users) ----------
  if (filters.subscribedUsers && filters.subscribedUsers.length) {
    sql += ` AND v.user_id IN (${filters.subscribedUsers.map(() => '?').join(',')})`;
    params.push(...filters.subscribedUsers);
  }

  // ---------- Cursor (keyset pagination) ----------
  if (cursor) {
    sql += ` AND (v.created_at, v.id) < (?, ?)`;
    params.push(cursor.created_at, cursor.id);
  }

  // ---------- Ordering ----------
  sql += ` ORDER BY ${orderBy} LIMIT ?`;
  params.push(limit);


  return { sql, params };
};

/**
 * Fetch feed candidates with flexible filters and ordering.
 *
 * @param {Object} options
 * @param {number} options.limit
 * @param {Object|null} options.cursor
 * @param {Object} [options.filters]      - { categories: [ 'science', ... ], subscribedUsers: [ 1, 2, ... ] }
 * @param {string} [options.orderBy]      - e.g., "score DESC" for trending, or "created_at DESC, id DESC"
 * @returns {Promise<Array>}
 */
const getFeedCandidates = async ({ limit, cursor, filters = {}, orderBy = 'created_at DESC, id DESC' }) => {
  const db = await connectDB();
  const { sql, params } = buildFeedQuery({ limit, cursor, filters, orderBy });
  const rows = await db.all(sql, params);
  return rows;
};

module.exports = { getFeedCandidates };