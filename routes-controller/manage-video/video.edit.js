const express = require('express');
const Router = express.Router();
const connectDB = require("../../database/db");
const requireAuth = require("../../middleware/requireAuth");
const logger = require("../../logger");

const editVideo = async (req, res) => {
    try {
        const { videoId, ...updates } = req.body;
        const user = req.user; // Assuming user info is attached to req by requireAuth middleware

        if (!videoId) {
            return res.status(400).json({
                error: "videoId is required"
            });
        }

        // Only allow fields that are safe to update
        const allowedFields = [
            "title",
            "description",
            "category",
            "visibility"
        ];

        const fields = [];
        const values = [];

        for (const field of allowedFields) {
            if (Object.prototype.hasOwnProperty.call(updates, field)) {
                fields.push(`${field} = ?`);
                values.push(updates[field]);
            }
        }

        if (fields.length === 0) {
            return res.status(400).json({
                error: "No fields to update"
            });
        }

        const db = await connectDB();

        // Check ownership
        const video = await db.get(
            "SELECT id FROM videos WHERE id = ? AND user_id = ?",
            [videoId, user.id]
        );

        if (!video) {
            return res.status(404).json({
                error: "Video not found or you do not have permission to edit this video"
            });
        }

        values.push(videoId, user.id);
        await db.run(
            `UPDATE videos
             SET ${fields.join(", ")}
             WHERE id = ? AND user_id = ?`,
            values
        );

        res.status(200).json({
            message: "Video updated successfully",
            updatedFields: fields.map(field => field.split(" = ")[0])
        });

    } catch (error) {
        logger.error(`Error editing video: ${error.message}`);

        res.status(500).json({
            error: "Internal server error"
        });
    }
};

/**
 * @swagger
 * /video/edit:
 *   put:
 *     summary: Update video details
 *     description: Update one or multiple editable fields of an existing video. Only the owner of the video can update it.
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
 *                 description: ID of the video to update.
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *
 *               title:
 *                 type: string
 *                 description: New video title.
 *                 example: My Updated Video
 *
 *               description:
 *                 type: string
 *                 nullable: true
 *                 description: New video description.
 *                 example: This is my updated video description.
 *
 *               category:
 *                 type: string
 *                 description: Comma-separated category names.
 *                 example: technology,programming
 *
 *               visibility:
 *                 type: string
 *                 enum:
 *                   - public
 *                   - private
 *                 description: Video visibility.
 *                 example: public
 *
 *
 *     responses:
 *       200:
 *         description: Video updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Video updated successfully
 *                 updatedFields:
 *                   type: array
 *                   description: List of fields that were updated.
 *                   items:
 *                     type: string
 *                   example:
 *                     - title
 *                     - description
 *
 *       400:
 *         description: Invalid request or no fields provided for update.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   examples:
 *                     missingVideoId:
 *                       value: videoId is required
 *                     noFields:
 *                       value: No fields to update
 *
 *       401:
 *         description: Authentication required.
 *
 *       404:
 *         description: Video not found or user does not have permission to edit it.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Video not found or you do not have permission to edit this video
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
Router.put('/', requireAuth, editVideo);

module.exports = Router;