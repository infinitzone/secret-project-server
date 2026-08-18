const connectDB = require("../../database/db");
const logger = require("../../logger");

// ======================================================
// GET OWN PROFILE
// ======================================================
const getOwnProfile = async (req, res) => {
  try {
    const userId = req.user.id; // from requireAuth middleware

    const db = await connectDB();

    const user = await db.get(
      `SELECT
        id,
        username,
        email,
        display_name,
        bio,
        avatar_path,
        role,
        is_verified,
        sub_count,
        created_at,
        updated_at
      FROM users
      WHERE id = ?`,
      [userId]
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ user });
  } catch (error) {
    logger.error(`Error fetching own profile: ${error.message}`);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ======================================================
// GET PUBLIC PROFILE BY USERNAME
// ======================================================
const getUserByUsername = async (req, res) => {
  try {
    const { username } = req.params;

    if (!username?.trim()) {
      return res.status(400).json({ error: "Username is required" });
    }

    const db = await connectDB();

    const user = await db.get(
      `SELECT
        id,
        username,
        display_name,
        bio,
        avatar_path,
        role,
        is_verified,
        sub_count,
        created_at
      FROM users
      WHERE username = ?`,
      [username.trim()]
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ user });
  } catch (error) {
    logger.error(`Error fetching user by username: ${error.message}`);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ======================================================
// GET PUBLIC PROFILE (other user)
// ======================================================
const getPublicProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate userId is integer
    const id = parseInt(userId, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const db = await connectDB();

    const user = await db.get(
      `SELECT
        id,
        username,
        display_name,
        bio,
        avatar_path,
        role,
        is_verified,
        sub_count,
        created_at
        -- updated_at is omitted for public view
      FROM users
      WHERE id = ?`,
      [id]
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ user });
  } catch (error) {
    logger.error(`Error fetching public profile: ${error.message}`);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ======================================================
// GET SUBSCRIBERS (people who follow the authenticated user)
// ======================================================
const getSubscribers = async (req, res) => {
  try {
    const userId = req.user.id; // from requireAuth

    const db = await connectDB();

    const subscribers = await db.all(
      `SELECT
        u.id,
        u.username,
        u.display_name,
        u.bio,
        u.avatar_path,
        u.role,
        u.is_verified,
        u.sub_count,
        u.created_at
      FROM user_subscriptions us
      JOIN users u ON u.id = us.subscriber_id
      WHERE us.subscribed_to_id = ?
      ORDER BY us.created_at DESC`,
      [userId]
    );

    res.status(200).json({ subscribers });
  } catch (error) {
    logger.error(`Error fetching subscribers: ${error.message}`);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getOwnProfile,
  getPublicProfile,
  getSubscribers,
  getUserByUsername,
};