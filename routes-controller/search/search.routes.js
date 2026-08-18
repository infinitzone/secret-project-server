const express = require("express");
const Router = express.Router();
const { searchVideos } = require("./search.controller");
const {optionalAuth} = require("../../middleware/optionalAuth");


/**
 * @swagger
 * /video/search:
 *   get:
 *     summary: Advanced video search (cursor‑based)
 *     description: |
 *       Search public videos by title, description, or category.
 *       Uses cursor pagination for stable, duplicate‑free results.
 *       If authenticated, videos from subscribed creators get a boost.
 *     tags:
 *       - Fetch videos
 *     security:
 *       - optionalAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query (multiple words supported).
 *         example: "funny cats"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: Number of results per page.
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: Cursor from previous response for next page.
 *     responses:
 *       200:
 *         description: Search results.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 videos:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       user_id:
 *                         type: integer
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       category:
 *                         type: string
 *                       video_path:
 *                         type: string
 *                       thumbnail_path:
 *                         type: string
 *                       mime_type:
 *                         type: string
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
 *                         format: date-time
 *                       username:
 *                         type: string
 *                       display_name:
 *                         type: string
 *                         nullable: true
 *                       avatar_path:
 *                         type: string
 *                         nullable: true
 *                       relevance:
 *                         type: number
 *                 nextCursor:
 *                   type: string
 *                   nullable: true
 *                 hasMore:
 *                   type: boolean
 *       400:
 *         description: Invalid or missing query.
 *       500:
 *         description: Internal server error.
 */
Router.get("/", optionalAuth, searchVideos);

module.exports = Router;