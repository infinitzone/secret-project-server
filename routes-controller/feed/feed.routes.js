const express = require('express');
const { getFeed } = require('./feed.controller');

const router = express.Router();

/**
 * @swagger
 * /video/fetch/feed:
 *   get:
 *     summary: Get video feed
 *     description: |
 *       Returns a paginated list of public videos.
 *       The feed supports cursor-based pagination.
 *       Videos may be ordered chronologically or by trending score.
 *     tags:
 *       - Fetch videos
 *     security:
 *       - bearerAuth: [] 
 *
 *     parameters:
 *       - name: limit
 *         in: query
 *         required: false
 *         description: Number of videos to return. Maximum is 50.
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         example: 20
 *
 *       - name: cursor
 *         in: query
 *         required: false
 *         description: Base64-encoded cursor returned by the previous request.
 *         schema:
 *           type: string
 *         example: eyJjcmVhdGVkX2F0IjoiMjAyNi0wOC0xN1QxMDowMDowMC4wMDBaIiwiaWQiOiI4ODM5NzIwZC1lYzQzLTRiZTYtYmYwNC0wNDc4NDA1MDM2N2U1In0=
 *
 *     responses:
 *       200:
 *         description: Video feed retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - videos
 *                 - nextCursor
 *                 - hasMore
 *               properties:
 *                 videos:
 *                   type: array
 *                   description: List of videos in the feed.
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: 8839720d-ec43-4be6-bf04-4784050367e5
 *                       user_id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       video_path:
 *                         type: string
 *                       thumbnail_path:
 *                         type: string
 *                       mime_type:
 *                         type: string
 *                         example: video/mp4
 *                       file_size:
 *                         type: integer
 *                       duration:
 *                         type: number
 *                         nullable: true
 *                       width:
 *                         type: integer
 *                         nullable: true
 *                       height:
 *                         type: integer
 *                         nullable: true
 *                       views:
 *                         type: integer
 *                       likes_count:
 *                         type: integer
 *                       created_at:
 *                         type: string
 *
 *                 nextCursor:
 *                   type: string
 *                   nullable: true
 *                   description: Cursor to use for the next page.
 *
 *                 hasMore:
 *                   type: boolean
 *                   description: Indicates whether more videos are available.
 *                   example: true
 *
 *       400:
 *         description: Invalid cursor format.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Invalid cursor format
 *
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Internal server error
 */
router.get('/feed', getFeed);

module.exports = router;