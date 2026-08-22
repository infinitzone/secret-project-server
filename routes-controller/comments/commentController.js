const connectDB = require("../../database/db");

// Constants to enforce safe limit bounds on the server
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

// Helper functions for cursor encoding/decoding
const encodeCursor = (dateString) => {
  return Buffer.from(dateString).toString("base64");
};

const decodeCursor = (cursorString) => {
  try {
    return Buffer.from(cursorString, "base64").toString("utf-8");
  } catch (err) {
    return null;
  }
};

const getCommentsByVideoId = async (req, res) => {
  try {
    const { video_id, limit, cursor } = req.query;

    if (!video_id) {
      return res.status(400).json({ error: "video_id query parameter is required" });
    }

    // 1. Strict limit clamping on the server
    let parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      parsedLimit = DEFAULT_LIMIT;
    } else {
      parsedLimit = Math.min(parsedLimit, MAX_LIMIT); // Enforce ceiling
    }

    const db = await connectDB();

    let query = `
      SELECT 
        c.id,
        c.video_id,
        c.user_id,
        c.comment,
        c.created_at,
        c.updated_at,
        u.username,
        u.display_name,
        u.avatar_path
      FROM video_comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.video_id = ?
    `;

    const params = [video_id];

    // 2. Unhash and validate the incoming cursor
    if (cursor) {
      const decodedDate = decodeCursor(cursor);
      if (!decodedDate || isNaN(Date.parse(decodedDate))) {
        return res.status(400).json({ error: "Invalid pagination cursor" });
      }
      query += ` AND c.created_at < ?`;
      params.push(decodedDate);
    }

    query += ` ORDER BY c.created_at DESC LIMIT ?`;
    params.push(parsedLimit + 1);

    const comments = await db.all(query, ...params);

    let hasMore = false;
    let nextCursor = null;

    // 3. Hash the outgoing nextCursor for security
    if (comments.length > parsedLimit) {
      hasMore = true;
      comments.pop();
      const lastItemDate = comments[comments.length - 1].created_at;
      nextCursor = encodeCursor(lastItemDate);
    }

    const formattedComments = comments.map((row) => ({
      id: row.id,
      video_id: row.video_id,
      comment: row.comment,
      created_at: row.created_at,
      updated_at: row.updated_at,
      user: {
        id: row.user_id,
        username: row.username,
        display_name: row.display_name,
        avatar_path: row.avatar_path,
      },
    }));

    return res.json({
      comments: formattedComments,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getCommentsByVideoId,
};