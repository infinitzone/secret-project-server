const crypto = require("crypto");
const connectDB = require("../../database/db");
const logger = require("../../logger");

const MAX_COMMENT_LENGTH = 2000;


// ======================================================
// LIKE VIDEO
// ======================================================

const likeVideo = async (req, res) => {
    try {
        const { videoId } = req.body;
        const userId = req.user.id;

        if (!videoId || typeof videoId !== "string") {
            return res.status(400).json({
                error: "Valid videoId is required"
            });
        }

        const db = await connectDB();

        await db.run("BEGIN TRANSACTION");

        try {
            const video = await db.get(
                `SELECT id
                 FROM videos
                 WHERE id = ?`,
                [videoId]
            );

            if (!video) {
                await db.run("ROLLBACK");

                return res.status(404).json({
                    error: "Video not found"
                });
            }

            const existingLike = await db.get(
                `SELECT 1
                 FROM video_likes
                 WHERE video_id = ?
                   AND user_id = ?`,
                [videoId, userId]
            );

            if (existingLike) {
                await db.run("ROLLBACK");

                return res.status(409).json({
                    error: "Video already liked"
                });
            }

            await db.run(
                `INSERT INTO video_likes
                 (video_id, user_id)
                 VALUES (?, ?)`,
                [videoId, userId]
            );

            await db.run(
                `INSERT INTO video_activity
                 (video_id, likes_count)
                 VALUES (?, 1)
                 ON CONFLICT(video_id)
                 DO UPDATE SET likes_count = likes_count + 1`,
                [videoId]
            );

            await db.run("COMMIT");

            return res.status(201).json({
                message: "Video liked successfully"
            });

        } catch (error) {
            await db.run("ROLLBACK");
            throw error;
        }

    } catch (error) {
        logger.error(`Error liking video: ${error.message}`);

        return res.status(500).json({
            error: "Internal server error"
        });
    }
};


// ======================================================
// UNLIKE VIDEO
// ======================================================

const unlikeVideo = async (req, res) => {
    try {
        const { videoId } = req.body;
        const userId = req.user.id;

        if (!videoId || typeof videoId !== "string") {
            return res.status(400).json({
                error: "Valid videoId is required"
            });
        }

        const db = await connectDB();

        await db.run("BEGIN TRANSACTION");

        try {
            const result = await db.run(
                `DELETE FROM video_likes
                 WHERE video_id = ?
                   AND user_id = ?`,
                [videoId, userId]
            );

            if (result.changes === 0) {
                await db.run("ROLLBACK");

                return res.status(404).json({
                    error: "Like not found"
                });
            }

            await db.run(
                `UPDATE video_activity
                 SET likes_count = MAX(likes_count - 1, 0)
                 WHERE video_id = ?`,
                [videoId]
            );

            await db.run("COMMIT");

            return res.status(200).json({
                message: "Video unliked successfully"
            });

        } catch (error) {
            await db.run("ROLLBACK");
            throw error;
        }

    } catch (error) {
        logger.error(`Error unliking video: ${error.message}`);

        return res.status(500).json({
            error: "Internal server error"
        });
    }
};


// ======================================================
// ADD COMMENT
// ======================================================

const addComment = async (req, res) => {
    try {
        const { videoId, comment } = req.body;
        const userId = req.user.id;

        if (!videoId || typeof videoId !== "string") {
            return res.status(400).json({
                error: "Valid videoId is required"
            });
        }

        if (typeof comment !== "string") {
            return res.status(400).json({
                error: "Comment is required"
            });
        }

        const cleanComment = comment.trim();

        if (!cleanComment) {
            return res.status(400).json({
                error: "Comment cannot be empty"
            });
        }

        if (cleanComment.length > MAX_COMMENT_LENGTH) {
            return res.status(400).json({
                error: `Comment cannot exceed ${MAX_COMMENT_LENGTH} characters`
            });
        }

        const db = await connectDB();

        await db.run("BEGIN TRANSACTION");

        try {
            const video = await db.get(
                `SELECT id
                 FROM videos
                 WHERE id = ?`,
                [videoId]
            );

            if (!video) {
                await db.run("ROLLBACK");

                return res.status(404).json({
                    error: "Video not found"
                });
            }

            const commentId = crypto.randomUUID();

            await db.run(
                `INSERT INTO video_comments
                 (id, video_id, user_id, comment)
                 VALUES (?, ?, ?, ?)`,
                [
                    commentId,
                    videoId,
                    userId,
                    cleanComment
                ]
            );

            await db.run(
                `INSERT INTO video_activity
                 (video_id, comments_count)
                 VALUES (?, 1)
                 ON CONFLICT(video_id)
                 DO UPDATE SET comments_count = comments_count + 1`,
                [videoId]
            );

            await db.run("COMMIT");

            return res.status(201).json({
                message: "Comment added successfully",
                commentId
            });

        } catch (error) {
            await db.run("ROLLBACK");
            throw error;
        }

    } catch (error) {
        logger.error(`Error adding comment: ${error.message}`);

        return res.status(500).json({
            error: "Internal server error"
        });
    }
};


// ======================================================
// DELETE COMMENT
// ======================================================

const deleteComment = async (req, res) => {
    try {
        const { commentId } = req.body;
        const userId = req.user.id;

        if (!commentId || typeof commentId !== "string") {
            return res.status(400).json({
                error: "Valid commentId is required"
            });
        }

        const db = await connectDB();

        await db.run("BEGIN TRANSACTION");

        try {
            const comment = await db.get(
                `SELECT id, video_id
                 FROM video_comments
                 WHERE id = ?
                   AND user_id = ?`,
                [commentId, userId]
            );

            if (!comment) {
                await db.run("ROLLBACK");

                return res.status(404).json({
                    error: "Comment not found or you do not have permission to delete it"
                });
            }

            await db.run(
                `DELETE FROM video_comments
                 WHERE id = ?
                   AND user_id = ?`,
                [commentId, userId]
            );

            await db.run(
                `UPDATE video_activity
                 SET comments_count = MAX(comments_count - 1, 0)
                 WHERE video_id = ?`,
                [comment.video_id]
            );

            await db.run("COMMIT");

            return res.status(200).json({
                message: "Comment deleted successfully"
            });

        } catch (error) {
            await db.run("ROLLBACK");
            throw error;
        }

    } catch (error) {
        logger.error(`Error deleting comment: ${error.message}`);

        return res.status(500).json({
            error: "Internal server error"
        });
    }
};


// ======================================================
// RECORD VIDEO VIEW
// ======================================================

const viewVideo = async (req, res) => {
    try {
        const { videoId } = req.body;
        const userId = req.user.id;

        if (!videoId || typeof videoId !== "string") {
            return res.status(400).json({
                error: "Valid videoId is required"
            });
        }

        const db = await connectDB();

        await db.run("BEGIN TRANSACTION");

        try {
            const video = await db.get(
                `SELECT id
                 FROM videos
                 WHERE id = ?`,
                [videoId]
            );

            if (!video) {
                await db.run("ROLLBACK");

                return res.status(404).json({
                    error: "Video not found"
                });
            }

            const result = await db.run(
                `INSERT INTO video_views
                 (video_id, user_id)
                 VALUES (?, ?)
                 ON CONFLICT(video_id, user_id)
                 DO NOTHING`,
                [videoId, userId]
            );

            let counted = false;

            if (result.changes > 0) {
                await db.run(
                    `INSERT INTO video_activity
                     (video_id, views_count)
                     VALUES (?, 1)
                     ON CONFLICT(video_id)
                     DO UPDATE SET views_count = views_count + 1`,
                    [videoId]
                );

                counted = true;
            }

            await db.run("COMMIT");

            return res.status(200).json({
                message: counted
                    ? "View recorded successfully"
                    : "View already recorded",
                counted
            });

        } catch (error) {
            await db.run("ROLLBACK");
            throw error;
        }

    } catch (error) {
        logger.error(`Error recording video view: ${error.message}`);

        return res.status(500).json({
            error: "Internal server error"
        });
    }
};


module.exports = {
    likeVideo,
    unlikeVideo,
    addComment,
    deleteComment,
    viewVideo
};