const connectDB = require("../../database/db");
const logger = require("../../logger");

const searchVideos = async (req, res) => {
  try {
    let { q, limit = 20, cursor } = req.query;
    const user = req.user || null;

    q = (q || "").trim();
    if (!q) return res.status(400).json({ error: "Search query is required" });

    limit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);

    let lastRelevance = null;
    let lastCreatedAt = null;
    let lastId = null;
    if (cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(cursor, "base64").toString("utf-8"));
        lastRelevance = decoded.relevance;
        lastCreatedAt = decoded.created_at;
        lastId = decoded.id;
        if (typeof lastRelevance !== "number" ||
            typeof lastCreatedAt !== "string" ||
            typeof lastId !== "string") {
          throw new Error("Invalid cursor format");
        }
      } catch (e) {
        return res.status(400).json({ error: "Invalid cursor" });
      }
    }

    const words = q.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) {
      return res.status(400).json({ error: "Search query must contain at least one word" });
    }

    const db = await connectDB();

    const whereClauses = [];
    const scoreClauses = [];
    const whereParams = [];
    const scoreParams = [];

    for (const word of words) {
      const pattern = `%${word}%`;
      whereClauses.push(
        `(v.title LIKE ? OR v.description LIKE ? OR v.category LIKE ?)`
      );
      scoreClauses.push(
        `(CASE WHEN v.title LIKE ? THEN 5 ELSE 0 END +
          CASE WHEN v.description LIKE ? THEN 2 ELSE 0 END +
          CASE WHEN v.category LIKE ? THEN 3 ELSE 0 END)`
      );
      whereParams.push(pattern, pattern, pattern);
      scoreParams.push(pattern, pattern, pattern);
    }

    const whereCondition = whereClauses.join(" AND ");
    const scoreExpression = scoreClauses.join(" + ");


    let subscriptionBoost = "";
    let boostParam = [];
    if (user) {
      subscriptionBoost = `+ COALESCE((SELECT 2 FROM user_subscriptions 
                             WHERE subscriber_id = ? AND subscribed_to_id = v.user_id), 0)`;
      boostParam = [user.id];
    }

    const relevanceExpr = `(${scoreExpression} ${subscriptionBoost})`;

    // Build the CTE query
    let sql;
    let params = [];

    // Common parameters: score, boost, where
    params.push(...scoreParams);
    if (user) params.push(...boostParam);
    params.push(...whereParams);

    const ctePart = `
          WITH ranked AS (
            SELECT
              v.id, v.user_id, v.title, v.description, v.video_path, v.thumbnail_path,
              v.mime_type, v.file_size, v.duration, v.width, v.height,
              v.views_count, v.likes_count, v.comments_count, v.created_at, v.category,
              u.username, u.display_name, u.avatar_path,
              ${relevanceExpr} AS relevance
            FROM videos v
            LEFT JOIN users u ON u.id = v.user_id
            WHERE v.status IN ('ready', 'processing')
              AND v.visibility = 'public'
              AND (${whereCondition})
          )
        `;

    if (cursor) {
      sql = `
        ${ctePart}
        SELECT *
        FROM ranked
        WHERE (relevance, created_at, id) < (?, ?, ?)
        ORDER BY relevance DESC, created_at DESC, id DESC
        LIMIT ?
      `;
      params.push(lastRelevance, lastCreatedAt, lastId);
    } else {
      sql = `
        ${ctePart}
        SELECT *
        FROM ranked
        ORDER BY relevance DESC, created_at DESC, id DESC
        LIMIT ?
      `;
    }
    params.push(limit + 1);

    const videos = await db.all(sql, params);

    let hasMore = false;
    let results = videos;
    if (videos.length > limit) {
      hasMore = true;
      results = videos.slice(0, limit);
    }

    let nextCursor = null;
    if (hasMore && results.length > 0) {
      const last = results[results.length - 1];
      const payload = {
        relevance: last.relevance,
        created_at: last.created_at,
        id: last.id
      };
      nextCursor = Buffer.from(JSON.stringify(payload)).toString("base64");
    }

    res.status(200).json({
      videos: results,
      nextCursor,
      hasMore
    });

  } catch (error) {
    logger.error(`Search error: ${error.message}`);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { searchVideos };
