const express = require("express");
const { getCommentsByVideoId } = require("./commentController");

const router = express.Router();

/**
 * @swagger
 * /video/comments:
 *   get:
 *     summary: Retrieve paginated comments for a video
 *     description: Fetches top-level comments ordered by newest first. Uses opaque Base64-encoded cursors for safe pagination and enforces a maximum limit server-side.
 *     tags:
 *       - Comments
 *     parameters:
 *       - in: query
 *         name: video_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique ID of the video
 *         example: "vid_98765"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 50
 *         description: Number of comments to return (server caps this at 50)
 *         example: 20
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: Opaque Base64-encoded string representing the pagination checkpoint
 *         example: "MjAyNi0wOC0yMlQwMjozMzozOS4wMDBa"
 *     responses:
 *       200:
 *         description: Successfully retrieved comments list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 comments:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       video_id:
 *                         type: string
 *                       comment:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       user:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           username:
 *                             type: string
 *                           display_name:
 *                             type: string
 *                           avatar_path:
 *                             type: string
 *                             nullable: true
 *                 nextCursor:
 *                   type: string
 *                   nullable: true
 *                   description: Base64-encoded cursor string to send for fetching the next page
 *                   example: "MjAyNi0wOC0yMlQwMjozMzozOS4wMDBa"
 *                 hasMore:
 *                   type: boolean
 *                   description: True if additional comments exist beyond the current page
 *                   example: true
 *       400:
 *         description: Missing `video_id` parameter or malformed cursor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid pagination cursor"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal server error"
 */
router.get("/", getCommentsByVideoId);

module.exports = router;