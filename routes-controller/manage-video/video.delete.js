const express = require('express');
const Router = express.Router();
const fs = require('fs/promises');

const connectDB = require("../../database/db");
const requireAuth = require("../../middleware/requireAuth");
const logger = require("../../logger");

const deleteVideo = async (req, res) => {
    try {
        const { videoId } = req.body;
        const user = req.user;

        if (!videoId) {
            return res.status(400).json({
                error: "videoId is required"
            });
        }

        const db = await connectDB();

        // Check video ownership
        const video = await db.get(
            `SELECT id, video_path, thumbnail_path
             FROM videos
             WHERE id = ? AND user_id = ?`,
            [videoId, user.id]
        );

        if (!video) {
            return res.status(404).json({
                error: "Video not found or you do not have permission to delete this video"
            });
        }

        // Delete database record
        await db.run(
            `DELETE FROM videos
             WHERE id = ? AND user_id = ?`,
            [videoId, user.id]
        );

        // Delete stored files if they exist
        const files = [
            video.video_path,
            video.thumbnail_path
        ].filter(Boolean);

        for (const file of files) {
            try {
                await fs.unlink(file);
            } catch (error) {
                // File may already be missing
                if (error.code !== "ENOENT") {
                    logger.warn(`Could not delete file ${file}: ${error.message}`);
                }
            }
        }

        res.status(200).json({
            message: "Video deleted successfully"
        });

    } catch (error) {
        logger.error(`Error deleting video: ${error.message}`);

        res.status(500).json({
            error: "Internal server error"
        });
    }
};

/**
 * @swagger
 * /video/delete:
 *   delete:
 *     summary: Delete a video
 *     description: Permanently delete a video owned by the authenticated user, including its stored video and thumbnail files.
 *     tags:
 *       - Manage video
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
 *                 description: ID of the video to delete.
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *
 *     responses:
 *       200:
 *         description: Video deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Video deleted successfully
 *
 *       400:
 *         description: Missing videoId.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: videoId is required
 *
 *       401:
 *         description: Authentication required.
 *
 *       404:
 *         description: Video not found or user does not have permission to delete it.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Video not found or you do not have permission to delete this video
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
Router.delete('/video/delete', requireAuth, deleteVideo);
Router.delete('/', requireAuth, deleteVideo);

module.exports = Router;