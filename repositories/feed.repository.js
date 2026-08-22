const connectDB = require('../database/db');

/**
 * Build the SQL query and parameters for fetching feed candidates.
 */
const buildFeedQuery = ({ limit, cursor, filters = {}, orderBy = 'created_at DESC, id DESC' }) => {
  let sql = `
    SELECT
      v.id, v.user_id, v.title, v.description,
      v.video_path, v.thumbnail_path,
      v.mime_type, v.file_size,
      v.duration, v.width, v.height,
      v.views_count, v.likes_count, v.comments_count,
      v.created_at,
      u.username, u.display_name, u.avatar_path,
      u.is_verified, u.sub_count,
      -- Compute a trending score (used when orderBy = 'score DESC')
      (v.likes_count * 2.0 + v.views_count * 0.5) / (julianday('now') - julianday(v.created_at) + 1.0) AS score
    FROM videos v
    JOIN users u ON v.user_id = u.id
    WHERE v.status IN ('ready', 'processing')
      AND v.visibility = 'public'
  `;

  const params = [];

  // ---------- Category filter ----------
  if (filters.categories && filters.categories.length) {
    const categoryConditions = filters.categories.map(() => 
      `(',' || v.category || ',' LIKE '%,' || ? || ',%')`
    );
    sql += ` AND (${categoryConditions.join(' OR ')})`;
    params.push(...filters.categories);
  }

  // ---------- Subscription filter ----------
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
 */
const getFeedCandidates = async ({ limit, cursor, filters = {}, orderBy = 'created_at DESC, id DESC' }) => {
  const db = await connectDB();
  const { sql, params } = buildFeedQuery({ limit, cursor, filters, orderBy });
  const rows = await db.all(sql, params);

  // Format each row to nest channel/publisher info neatly inside the video object
  return rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    description: row.description,
    video_path: row.video_path,
    thumbnail_path: row.thumbnail_path,
    mime_type: row.mime_type,
    file_size: row.file_size,
    duration: row.duration,
    width: row.width,
    height: row.height,
    views_count: row.views_count,
    likes_count: row.likes_count,
    comments_count: row.comments_count,
    created_at: row.created_at,
    score: row.score,
    channel: {
      id: row.user_id,
      username: row.username,
      display_name: row.display_name || row.username,
      avatar_path: row.avatar_path,
      is_verified: Boolean(row.is_verified),
      sub_count: row.sub_count
    }
  }));
};

module.exports = { getFeedCandidates };
