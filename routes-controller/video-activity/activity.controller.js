const crypto = require("crypto");
const connectDB = require("../../database/db");
const logger = require("../../logger");

const MAX_COMMENT_LENGTH = 2000;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isValidUUID = (id) => typeof id === "string" && UUID_REGEX.test(id);

// Record user interest – can be offloaded to a queue later
const saveUserInterest = async (db, userId, videoId, activityType) => {
  await db.run(
    `INSERT INTO user_interest (user_id, video_id, activity_type)
     VALUES (?, ?, ?)`,
    [userId, videoId, activityType]
  );
};

// ======================================================
// LIKE / UNLIKE TOGGLE
// ======================================================
const likeVideo = async (req, res) => {
  try {
    const { videoId } = req.body;
    const userId = req.user.id;

    if (!isValidUUID(videoId)) {
      return res.status(400).json({ error: "Valid videoId (UUID) is required" });
    }

    const db = await connectDB();
    await db.run("BEGIN TRANSACTION");

    try {
      // Try to insert the like – if it already exists, ignore
      const insertResult = await db.run(
        `INSERT OR IGNORE INTO video_likes (video_id, user_id) VALUES (?, ?)`,
        [videoId, userId]
      );

      if (insertResult.changes === 1) {
        // New like – increment counter
        await db.run(
          `INSERT INTO video_activity (video_id, likes_count)
           VALUES (?, 1)
           ON CONFLICT(video_id) DO UPDATE SET likes_count = likes_count + 1`,
          [videoId]
        );
        await saveUserInterest(db, userId, videoId, "like");
        await db.run("COMMIT");
        return res.status(201).json({ message: "Video liked successfully" });
      } else {
        // Already liked – remove the like (unlike)
        await db.run(
          `DELETE FROM video_likes WHERE video_id = ? AND user_id = ?`,
          [videoId, userId]
        );
        await db.run(
          `UPDATE video_activity
           SET likes_count = MAX(likes_count - 1, 0)
           WHERE video_id = ?`,
          [videoId]
        );
        await saveUserInterest(db, userId, videoId, "unlike");
        await db.run("COMMIT");
        return res.status(200).json({ message: "Video unliked successfully" });
      }
    } catch (error) {
      await db.run("ROLLBACK");
      if (error.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
        return res.status(404).json({ error: "Video not found" });
      }
      throw error;
    }
  } catch (error) {
    logger.error(`Unexpected error toggling like: ${error.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ======================================================
// ADD COMMENT
// ======================================================
const addComment = async (req, res) => {
  try {
    const { videoId, comment } = req.body;
    const userId = req.user.id;

    if (!isValidUUID(videoId)) {
      return res.status(400).json({ error: "Valid videoId (UUID) is required" });
    }

    if (typeof comment !== "string") {
      return res.status(400).json({ error: "Comment is required" });
    }

    const cleanComment = comment.trim();
    if (!cleanComment) {
      return res.status(400).json({ error: "Comment cannot be empty" });
    }
    if (cleanComment.length > MAX_COMMENT_LENGTH) {
      return res.status(400).json({
        error: `Comment cannot exceed ${MAX_COMMENT_LENGTH} characters`,
      });
    }

    const commentId = crypto.randomUUID();
    const db = await connectDB();
    await db.run("BEGIN TRANSACTION");

    try {
      await db.run(
        `INSERT INTO video_comments (id, video_id, user_id, comment)
         VALUES (?, ?, ?, ?)`,
        [commentId, videoId, userId, cleanComment]
      );

      await db.run(
        `INSERT INTO video_activity (video_id, comments_count)
         VALUES (?, 1)
         ON CONFLICT(video_id) DO UPDATE SET comments_count = comments_count + 1`,
        [videoId]
      );

      await saveUserInterest(db, userId, videoId, "comment");

      await db.run("COMMIT");
      return res.status(201).json({ message: "Comment added successfully", commentId });
    } catch (error) {
      await db.run("ROLLBACK");
      if (error.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
        return res.status(404).json({ error: "Video not found" });
      }
      throw error;
    }
  } catch (error) {
    logger.error(`Unexpected error adding comment: ${error.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ======================================================
// DELETE COMMENT
// ======================================================
const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.body;
    const userId = req.user.id;

    if (!isValidUUID(commentId)) {
      return res.status(400).json({ error: "Valid commentId (UUID) is required" });
    }

    const db = await connectDB();
    await db.run("BEGIN TRANSACTION");

    try {
      const comment = await db.get(
        `SELECT video_id FROM video_comments WHERE id = ? AND user_id = ?`,
        [commentId, userId]
      );

      if (!comment) {
        await db.run("ROLLBACK");
        return res.status(404).json({
          error: "Comment not found or you do not have permission to delete it",
        });
      }

      await db.run(
        `DELETE FROM video_comments WHERE id = ? AND user_id = ?`,
        [commentId, userId]
      );

      await db.run(
        `UPDATE video_activity
         SET comments_count = MAX(comments_count - 1, 0)
         WHERE video_id = ?`,
        [comment.video_id]
      );

      await saveUserInterest(db, userId, comment.video_id, "comment_delete");

      await db.run("COMMIT");
      return res.status(200).json({ message: "Comment deleted successfully" });
    } catch (error) {
      await db.run("ROLLBACK");
      throw error;
    }
  } catch (error) {
    logger.error(`Unexpected error deleting comment: ${error.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ======================================================
// RECORD VIDEO VIEW (Safe – duplicate returns 200)
// ======================================================
const viewVideo = async (req, res) => {
  try {
    const { videoId } = req.body;
    const userId = req.user.id;

    if (!isValidUUID(videoId)) {
      return res.status(400).json({ error: "Valid videoId (UUID) is required" });
    }

    const db = await connectDB();
    await db.run("BEGIN TRANSACTION");

    try {
      // Attempt to insert a new view – ignore if already exists
      const result = await db.run(
        `INSERT OR IGNORE INTO video_views (video_id, user_id) VALUES (?, ?)`,
        [videoId, userId]
      );

      if (result.changes === 1) {
        // New view – increment the counter and log interest
        await db.run(
          `INSERT INTO video_activity (video_id, views_count)
           VALUES (?, 1)
           ON CONFLICT(video_id) DO UPDATE SET views_count = views_count + 1`,
          [videoId]
        );
        await saveUserInterest(db, userId, videoId, "view");
        await db.run("COMMIT");
        return res.status(200).json({
          message: "View recorded successfully",
          counted: true,
        });
      } else {
        // Already viewed – no changes needed
        await db.run("COMMIT");
        return res.status(200).json({
          message: "View already recorded",
          counted: false,
        });
      }
    } catch (error) {
      await db.run("ROLLBACK");
      // Foreign key constraint – video does not exist
      if (error.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
        return res.status(404).json({ error: "Video not found" });
      }
      // Unexpected DB error
      throw error;
    }
  } catch (error) {
    logger.error(`Unexpected error recording video view: ${error.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ======================================================
// SUBSCRIBE / UNSUBSCRIBE TO CREATOR
// ======================================================
const subscribeUser = async (req, res) => {
  try {
    const { userId: creatorId } = req.body;
    const subscriberId = req.user.id;

    if (!Number.isInteger(Number(creatorId))) {
      return res.status(400).json({
        error: "Valid userId is required",
      });
    }

    const targetUserId = Number(creatorId);

    // Prevent subscribing to yourself
    if (subscriberId === targetUserId) {
      return res.status(400).json({
        error: "You cannot subscribe to yourself",
      });
    }

    const db = await connectDB();

    await db.run("BEGIN TRANSACTION");

    try {
      // Make sure creator exists
      const creator = await db.get(
        `SELECT id FROM users WHERE id = ?`,
        [targetUserId]
      );

      if (!creator) {
        await db.run("ROLLBACK");

        return res.status(404).json({
          error: "User not found",
        });
      }

      // Try to subscribe
      const result = await db.run(
        `INSERT OR IGNORE INTO user_subscriptions
         (subscriber_id, subscribed_to_id)
         VALUES (?, ?)`,
        [subscriberId, targetUserId]
      );

      if (result.changes === 1) {
        // New subscription
        await db.run(
          `UPDATE users
           SET sub_count = sub_count + 1
           WHERE id = ?`,
          [targetUserId]
        );

        await db.run("COMMIT");

        return res.status(201).json({
          message: "Subscribed successfully",
          subscribed: true,
        });
      }

      // Already subscribed → unsubscribe
      const deleteResult = await db.run(
        `DELETE FROM user_subscriptions
         WHERE subscriber_id = ?
           AND subscribed_to_id = ?`,
        [subscriberId, targetUserId]
      );

      if (deleteResult.changes === 1) {
        await db.run(
          `UPDATE users
           SET sub_count = MAX(sub_count - 1, 0)
           WHERE id = ?`,
          [targetUserId]
        );
      }

      await db.run("COMMIT");

      return res.status(200).json({
        message: "Unsubscribed successfully",
        subscribed: false,
      });

    } catch (error) {
      await db.run("ROLLBACK");
      throw error;
    }

  } catch (error) {
    logger.error(
      `Unexpected error toggling subscription: ${error.message}`
    );

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};


module.exports = {
  likeVideo,  
  addComment,
  deleteComment,
  viewVideo,
  subscribeUser,
};