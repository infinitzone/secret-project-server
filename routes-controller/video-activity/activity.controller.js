const crypto = require("crypto");
const connectDB = require("../../database/db");
const logger = require("../../logger");

const MAX_COMMENT_LENGTH = 2000;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isValidUUID = (id) => typeof id === "string" && UUID_REGEX.test(id);

// Robust check for SQLite Foreign Key violations across driver variations
const isForeignKeyError = (error) => {
  return (
    error.code === "SQLITE_CONSTRAINT_FOREIGNKEY" ||
    (error.code === "SQLITE_CONSTRAINT" && error.message && error.message.includes("FOREIGN KEY"))
  );
};

// Record user interest log inside the active transaction
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
      // 1. Try inserting the like into video_likes
      const insertResult = await db.run(
        `INSERT OR IGNORE INTO video_likes (video_id, user_id) VALUES (?, ?)`,
        [videoId, userId]
      );

      if (insertResult.changes === 1) {
        // 2a. New like – increment likes_count on the videos table
        const updateResult = await db.run(
          `UPDATE videos SET likes_count = likes_count + 1 WHERE id = ?`,
          [videoId]
        );

        if (updateResult.changes === 0) {
          throw new Error("VIDEO_NOT_FOUND");
        }

        await saveUserInterest(db, userId, videoId, "like");
        await db.run("COMMIT");
        return res.status(201).json({ message: "Video liked successfully" });
      } else {
        // 2b. Already liked – remove like and decrement likes_count
        await db.run(
          `DELETE FROM video_likes WHERE video_id = ? AND user_id = ?`,
          [videoId, userId]
        );

        await db.run(
          `UPDATE videos SET likes_count = MAX(likes_count - 1, 0) WHERE id = ?`,
          [videoId]
        );

        await saveUserInterest(db, userId, videoId, "unlike");
        await db.run("COMMIT");
        return res.status(200).json({ message: "Video unliked successfully" });
      }
    } catch (error) {
      await db.run("ROLLBACK");
      if (error.message === "VIDEO_NOT_FOUND" || isForeignKeyError(error)) {
        return res.status(404).json({ error: "Video or User not found" });
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
      // 1. Insert comment record
      await db.run(
        `INSERT INTO video_comments (id, video_id, user_id, comment)
         VALUES (?, ?, ?, ?)`,
        [commentId, videoId, userId, cleanComment]
      );

      // 2. Increment comments_count on videos table
      const updateResult = await db.run(
        `UPDATE videos SET comments_count = comments_count + 1 WHERE id = ?`,
        [videoId]
      );

      if (updateResult.changes === 0) {
        throw new Error("VIDEO_NOT_FOUND");
      }

      // 3. Log activity
      await saveUserInterest(db, userId, videoId, "comment");

      await db.run("COMMIT");
      return res.status(201).json({ message: "Comment added successfully", commentId });
    } catch (error) {
      await db.run("ROLLBACK");
      if (error.message === "VIDEO_NOT_FOUND" || isForeignKeyError(error)) {
        return res.status(404).json({ error: "Video or User not found" });
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

      // 1. Delete comment
      await db.run(
        `DELETE FROM video_comments WHERE id = ? AND user_id = ?`,
        [commentId, userId]
      );

      // 2. Decrement comments_count on videos table
      await db.run(
        `UPDATE videos SET comments_count = MAX(comments_count - 1, 0) WHERE id = ?`,
        [comment.video_id]
      );

      // 3. Log activity
      await saveUserInterest(db, userId, comment.video_id, "comment_delete");

      await db.run("COMMIT");
      return res.status(200).json({ message: "Comment deleted successfully" });
    } catch (error) {
      await db.run("ROLLBACK");
      if (isForeignKeyError(error)) {
        return res.status(404).json({ error: "Related resource not found" });
      }
      throw error;
    }
  } catch (error) {
    logger.error(`Unexpected error deleting comment: ${error.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ======================================================
// RECORD VIDEO VIEW
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
      // 1. Record view in video_views table
      const result = await db.run(
        `INSERT OR IGNORE INTO video_views (video_id, user_id) VALUES (?, ?)`,
        [videoId, userId]
      );

      if (result.changes === 1) {
        // 2. Increment views_count on videos table
        const updateResult = await db.run(
          `UPDATE videos SET views_count = views_count + 1 WHERE id = ?`,
          [videoId]
        );

        if (updateResult.changes === 0) {
          throw new Error("VIDEO_NOT_FOUND");
        }

        await saveUserInterest(db, userId, videoId, "view");
        await db.run("COMMIT");
        return res.status(200).json({
          message: "View recorded successfully",
          counted: true,
        });
      } else {
        await db.run("COMMIT");
        return res.status(200).json({
          message: "View already recorded",
          counted: false,
        });
      }
    } catch (error) {
      await db.run("ROLLBACK");
      if (error.message === "VIDEO_NOT_FOUND" || isForeignKeyError(error)) {
        return res.status(404).json({ error: "Video or User not found" });
      }
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

    if (subscriberId === targetUserId) {
      return res.status(400).json({
        error: "You cannot subscribe to yourself",
      });
    }

    const db = await connectDB();
    await db.run("BEGIN TRANSACTION");

    try {
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

      const result = await db.run(
        `INSERT OR IGNORE INTO user_subscriptions (subscriber_id, subscribed_to_id) VALUES (?, ?)`,
        [subscriberId, targetUserId]
      );

      if (result.changes === 1) {
        const updateResult = await db.run(
          `UPDATE users SET sub_count = sub_count + 1 WHERE id = ?`,
          [targetUserId]
        );

        if (updateResult.changes === 0) {
          throw new Error("USER_NOT_FOUND");
        }

        await db.run("COMMIT");
        return res.status(201).json({
          message: "Subscribed successfully",
          subscribed: true,
        });
      }

      const deleteResult = await db.run(
        `DELETE FROM user_subscriptions WHERE subscriber_id = ? AND subscribed_to_id = ?`,
        [subscriberId, targetUserId]
      );

      if (deleteResult.changes === 1) {
        await db.run(
          `UPDATE users SET sub_count = MAX(sub_count - 1, 0) WHERE id = ?`,
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
      if (error.message === "USER_NOT_FOUND" || isForeignKeyError(error)) {
        return res.status(404).json({ error: "User not found" });
      }
      throw error;
    }
  } catch (error) {
    logger.error(`Unexpected error toggling subscription: ${error.message}`);
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
