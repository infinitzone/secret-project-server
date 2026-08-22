const express = require("express");
const Router = express.Router();
const connectDB = require("../../database/db");

const requireAuth = require("../../middleware/requireAuth");

const {
    likeVideo,
    addComment,
    deleteComment,
    viewVideo,
    subscribeUser
} = require("./activity.controller");


/**
 * @swagger
 * /video/activity/like:
 *   post:
 *     summary: Toggle like on a video
 *     description: |
 *       If the user has not liked the video, a like is added.
 *       If the user already liked it, the like is removed (unlike).
 *       This acts as a toggle – one endpoint handles both actions.
 *     tags:
 *       - Video activity
 *     security:
 *       - bearerAuth: []
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - videoId
 *             properties:
 *               videoId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the video to like/unlike.
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *
 *     responses:
 *       201:
 *         description: Video liked successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Video liked successfully
 *
 *       200:
 *         description: Video unliked successfully (like was removed).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Video unliked successfully
 *
 *       400:
 *         description: Invalid videoId.
 *
 *       401:
 *         description: Authentication required.
 *
 *       404:
 *         description: Video not found.
 *
 *       500:
 *         description: Internal server error.
 */
Router.post("/like", requireAuth, likeVideo);


/**
 * @swagger
 * /video/activity/comment:
 *   post:
 *     summary: Add a comment to a video
 *     description: Add a comment to a video as the authenticated user. Comments are limited to 2000 characters.
 *     tags:
 *       - Video activity
 *     security:
 *       - bearerAuth: []
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - videoId
 *               - comment
 *             properties:
 *               videoId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the video to comment on.
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *
 *               comment:
 *                 type: string
 *                 maxLength: 2000
 *                 description: Comment text.
 *                 example: "This is a great video!"
 *
 *     responses:
 *       201:
 *         description: Comment added successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Comment added successfully
 *                 commentId:
 *                   type: string
 *                   format: uuid
 *                   example: "123e4567-e89b-12d3-a456-426614174000"
 *
 *       400:
 *         description: Invalid videoId or comment.
 *
 *       401:
 *         description: Authentication required.
 *
 *       404:
 *         description: Video not found.
 *
 *       500:
 *         description: Internal server error.
 */
Router.post("/comment", requireAuth, addComment);


/**
 * @swagger
 * /video/activity/comment:
 *   delete:
 *     summary: Delete a comment
 *     description: Delete a comment created by the authenticated user.
 *     tags:
 *       - Video activity
 *     security:
 *       - bearerAuth: []
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - commentId
 *             properties:
 *               commentId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the comment to delete.
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *
 *     responses:
 *       200:
 *         description: Comment deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Comment deleted successfully
 *
 *       400:
 *         description: Invalid commentId.
 *
 *       401:
 *         description: Authentication required.
 *
 *       404:
 *         description: Comment not found or user does not have permission to delete it.
 *
 *       500:
 *         description: Internal server error.
 */
Router.delete("/comment", requireAuth, deleteComment);


/**
 * @swagger
 * /video/activity/view:
 *   post:
 *     summary: Record a video view
 *     description: Record a unique view from the authenticated user. Each user can contribute only one view per video.
 *     tags:
 *       - Video activity
 *     security:
 *       - bearerAuth: []
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - videoId
 *             properties:
 *               videoId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the video being viewed.
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *
 *     responses:
 *       200:
 *         description: View processed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   enum:
 *                     - View recorded successfully
 *                     - View already recorded
 *                   example: View recorded successfully
 *                 counted:
 *                   type: boolean
 *                   description: Whether this request increased the view count.
 *                   example: true
 *
 *       400:
 *         description: Invalid videoId.
 *
 *       401:
 *         description: Authentication required.
 *
 *       404:
 *         description: Video not found.
 *
 *       500:
 *         description: Internal server error.
 */
Router.post("/view", requireAuth, viewVideo);

/**
 * @swagger
 * /video/activity/subscribe:
 *   post:
 *     summary: Subscribe or unsubscribe from a user
 *     description: |
 *       Toggles the authenticated user's subscription to another user.
 *       If not subscribed, the user is subscribed.
 *       If already subscribed, the subscription is removed.
 *     tags:
 *       - User subscription
 *     security:
 *       - bearerAuth: []
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: integer
 *                 description: ID of the creator/user to subscribe to.
 *                 example: 25
 *
 *     responses:
 *       201:
 *         description: Subscription created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Subscribed successfully
 *                 subscribed:
 *                   type: boolean
 *                   example: true
 *
 *       200:
 *         description: Subscription removed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Unsubscribed successfully
 *                 subscribed:
 *                   type: boolean
 *                   example: false
 *
 *       400:
 *         description: Invalid user ID or attempting to subscribe to yourself.
 *
 *       401:
 *         description: Authentication required.
 *
 *       404:
 *         description: User not found.
 *
 *       500:
 *         description: Internal server error.
 */
Router.post("/subscribe", requireAuth, subscribeUser);


/**
 * @swagger
 * /video/activity/status:
 *   get:
 *     summary: Get video activity status
 *     description: Returns whether the authenticated user has liked the video, subscribed to its channel, or owns the channel. Unauthenticated users receive false for all status fields.
 *     tags:
 *       - Video Activity
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the video
 *         example: 624b6d2f-eb93-4322-bc97-c55240a39e49
 *     responses:
 *       200:
 *         description: Video activity status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isLiked:
 *                   type: boolean
 *                   description: Whether the current user liked the video
 *                   example: true
 *                 isSubscribed:
 *                   type: boolean
 *                   description: Whether the current user is subscribed to the video owner's channel
 *                   example: false
 *                 isOwnChannel:
 *                   type: boolean
 *                   description: Whether the current user owns the video channel
 *                   example: false
 *       400:
 *         description: Missing videoId query parameter
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Missing videoId query parameter
 *       404:
 *         description: Video not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Video not found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Internal server error
 */
// ✅ Added requireAuth and fixed column name 'subscribed_to_id' (was 'channel_id')
Router.get("/status", requireAuth, async (req, res) => {
  try {
    const { videoId } = req.query;
    const userId = req.user?.id;

    if (!videoId) {
      return res.status(400).json({ error: "Missing videoId query parameter" });
    }

    const db = await connectDB();

    // 1. Fetch video metadata
    const videoRow = await db.get(
      "SELECT user_id FROM videos WHERE id = ?",
      [videoId]
    );

    if (!videoRow) {
      return res.status(404).json({ error: "Video not found" });
    }

    const channelOwnerId = videoRow.user_id;

    // If no authenticated user (should not happen with requireAuth, but keep safety)
    if (!userId) {
      return res.json({
        isLiked: false,
        isSubscribed: false,
        isOwnChannel: false,
      });
    }

    const isOwnChannel = String(userId) === String(channelOwnerId);

    // 2. Query video_likes with parameter order matching (video_id, user_id)
    const likeRow = await db.get(
      "SELECT 1 FROM video_likes WHERE video_id = ? AND user_id = ? LIMIT 1",
      [videoId, userId]
    );
    const isLiked = Boolean(likeRow);

    // 3. Query user_subscriptions (subscriber_id, subscribed_to_id) – column fixed!
    let isSubscribed = false;
    if (!isOwnChannel) {
      const subRow = await db.get(
        "SELECT 1 FROM user_subscriptions WHERE subscriber_id = ? AND subscribed_to_id = ? LIMIT 1",
        [userId, channelOwnerId]
      );
      isSubscribed = Boolean(subRow);
    }

    return res.json({
      isLiked,
      isSubscribed,
      isOwnChannel,
    });
  } catch (error) {
    console.error("Error fetching video status:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = Router;