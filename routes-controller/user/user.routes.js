const express = require("express");
const Router = express.Router();
const requireAuth = require("../../middleware/requireAuth");
const {
  getOwnProfile,
  getPublicProfile,
  getSubscribers,
  getUserByUsername,
} = require("./user.controller");

/**
 * @swagger
 * /user/me:
 *   get:
 *     summary: Get authenticated user's profile
 *     description: Returns the full profile of the currently logged-in user (excluding password_hash).
 *     tags:
 *       - User
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     display_name:
 *                       type: string
 *                       nullable: true
 *                     bio:
 *                       type: string
 *                       nullable: true
 *                     avatar_path:
 *                       type: string
 *                       nullable: true
 *                     role:
 *                       type: string
 *                       example: user
 *                     is_verified:
 *                       type: integer
 *                       example: 0
 *                     sub_count:
 *                       type: integer
 *                       example: 5
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Authentication required.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 */
Router.get("/me", requireAuth, getOwnProfile);

/**
 * @swagger
 * /user/subscribers:
 *   get:
 *     summary: Get all subscribers (followers) of the authenticated user
 *     description: Returns a list of users who are following the currently logged-in user.
 *     tags:
 *       - User
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of subscribers retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 subscribers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       username:
 *                         type: string
 *                       display_name:
 *                         type: string
 *                         nullable: true
 *                       bio:
 *                         type: string
 *                         nullable: true
 *                       avatar_path:
 *                         type: string
 *                         nullable: true
 *                       role:
 *                         type: string
 *                       is_verified:
 *                         type: integer
 *                       sub_count:
 *                         type: integer
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Authentication required.
 *       500:
 *         description: Internal server error.
 */
Router.get("/subscribers", requireAuth, getSubscribers);

/**
 * @swagger
 * /user/username/{username}:
 *   get:
 *     summary: Get public profile by username
 *     description: Fetch a user's public profile using their unique username.
 *     tags:
 *       - User
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: The username of the user to fetch.
 *         example: johndoe
 *     responses:
 *       200:
 *         description: Public profile retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     username:
 *                       type: string
 *                     display_name:
 *                       type: string
 *                       nullable: true
 *                     bio:
 *                       type: string
 *                       nullable: true
 *                     avatar_path:
 *                       type: string
 *                       nullable: true
 *                     role:
 *                       type: string
 *                     is_verified:
 *                       type: integer
 *                     sub_count:
 *                       type: integer
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Username missing.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 */
Router.get("/username/:username", getUserByUsername);

/**
 * @swagger
 * /user/{userId}:
 *   get:
 *     summary: Get public profile of another user
 *     description: Returns public information of any user (excludes email, updated_at, etc.).
 *     tags:
 *       - User
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the user to fetch.
 *         example: 25
 *     responses:
 *       200:
 *         description: Public profile retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     username:
 *                       type: string
 *                     display_name:
 *                       type: string
 *                       nullable: true
 *                     bio:
 *                       type: string
 *                       nullable: true
 *                     avatar_path:
 *                       type: string
 *                       nullable: true
 *                     role:
 *                       type: string
 *                       example: user
 *                     is_verified:
 *                       type: integer
 *                       example: 0
 *                     sub_count:
 *                       type: integer
 *                       example: 5
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid user ID.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 */
Router.get("/:userId", getPublicProfile);

module.exports = Router;