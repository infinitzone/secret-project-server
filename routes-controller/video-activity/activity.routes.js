const express = require("express");
const Router = express.Router();

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


module.exports = Router;