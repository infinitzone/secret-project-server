const connectDB = require('../database/db');

/**
 * Fetch feed candidates using keyset pagination.
 *
 * @param {Object} params
 * @param {number} params.limit - number of rows to fetch (incl. one extra for hasMore detection)
 * @param {Object|null} params.cursor - { created_at, id } or null
 * @returns {Promise<Array>}
 */
const getFeedCandidates = async ({ limit, cursor }) => {
  const db = await connectDB();

  let sql = `
    SELECT
      id, user_id, title, description,
      video_path, thumbnail_path,
      mime_type, file_size,
      duration, width, height,
      views, likes_count,
      created_at
    FROM videos
    WHERE status = 'processing'
      AND visibility = 'public'
  `;

  const params = [];

  if (cursor) {
    sql += ` AND (created_at, id) < (?, ?)`;
    params.push(cursor.created_at, cursor.id);
  }

  sql += ` ORDER BY created_at DESC, id DESC LIMIT ?`;
  params.push(limit);

  const rows = await db.all(sql, params);
  return rows;
};


module.exports = { getFeedCandidates };