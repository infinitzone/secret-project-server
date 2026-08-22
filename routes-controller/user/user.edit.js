const express = require('express');
const Router = express.Router();
const connectDB = require("../../database/db");
const requireAuth = require("../../middleware/requireAuth");
const logger = require("../../logger");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

/**
 * Controller: Edit User Profile Details
 */
const editUser = async (req, res) => {
    try {
        const user = req.user;
        const updates = req.body;

        // Allowed fields safe for direct client update
        const allowedFields = [
            "display_name",
            "bio"
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

        // Always update updated_at timestamp on record changes
        fields.push("updated_at = CURRENT_TIMESTAMP");

        const db = await connectDB();

        values.push(user.id);
        await db.run(
            `UPDATE users
             SET ${fields.join(", ")}
             WHERE id = ?`,
            values
        );

        res.status(200).json({
            message: "User updated successfully",
            updatedFields: allowedFields.filter(f => Object.prototype.hasOwnProperty.call(updates, f))
        });

    } catch (error) {
        logger.error(`Error editing user: ${error.message}`);
        res.status(500).json({
            error: "Internal server error"
        });
    }
};

/**
 * Controller & Middleware Setup: Edit User Avatar
 */
const upload = multer({
    storage: multer.memoryStorage(),
});

const updateAvatar = async (req, res) => {
    try {
        const user = req.user;
        const avatarFile = req.file;

        if (!avatarFile) {
            return res.status(400).json({ error: "Avatar file is required" });
        }

        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!allowedTypes.includes(avatarFile.mimetype)) {
            return res.status(400).json({
                error: "Invalid avatar format. Allowed: JPEG, PNG, WebP",
            });
        }

        const db = await connectDB();

        // Determine directory using object-storage setup
        const avatarDir = path.join(
            process.cwd(),
            "object-storage",
            "users",
            String(user.id)
        );

        await fs.promises.mkdir(avatarDir, { recursive: true });

        const ext = avatarFile.mimetype === "image/png" ? ".png" : avatarFile.mimetype === "image/webp" ? ".webp" : ".jpg";
        const relativePath = `/users/${user.id}/avatar${ext}`;
        const fullPath = path.join(avatarDir, `avatar${ext}`);

        await fs.promises.writeFile(fullPath, avatarFile.buffer);

        await db.run(
            `UPDATE users SET avatar_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [relativePath, user.id]
        );

        res.status(200).json({
            message: "Avatar updated successfully",
            avatarPath: relativePath,
        });
    } catch (error) {
        logger.error(`Error updating avatar: ${error.message}`);
        res.status(500).json({ error: "Internal server error" });
    }
};

/**
 * @swagger
 * /user/edit:
 *   put:
 *     summary: Update user profile details
 *     description: Update profile fields like display_name and bio for the currently authenticated user.
 *     tags:
 *       - Manage user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               display_name:
 *                 type: string
 *                 description: New display name for the user.
 *                 example: John Doe
 *               bio:
 *                 type: string
 *                 nullable: true
 *                 description: Short bio or summary of the user.
 *                 example: Software engineer and Tech enthusiast.
 *     responses:
 *       200:
 *         description: Profile details updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User updated successfully
 *                 updatedFields:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example:
 *                     - display_name
 *                     - bio
 *       400:
 *         description: No valid fields provided.
 *       401:
 *         description: Authentication required.
 *       500:
 *         description: Internal server error.
 */
Router.put('/', requireAuth, editUser);

/**
 * @swagger
 * /user/edit/avatar:
 *   put:
 *     summary: Update user avatar
 *     description: Upload or replace the avatar image for the authenticated user.
 *     tags:
 *       - Manage user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - avatar
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Avatar image file (JPEG, PNG, or WebP).
 *     responses:
 *       200:
 *         description: Avatar updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Avatar updated successfully
 *                 avatarPath:
 *                   type: string
 *                   example: /users/1/avatar.jpg
 *       400:
 *         description: File missing or invalid file format.
 *       401:
 *         description: Authentication required.
 *       500:
 *         description: Internal server error.
 */
Router.put(
    "/avatar",
    requireAuth,
    upload.single("avatar"),
    updateAvatar
);

module.exports = Router;