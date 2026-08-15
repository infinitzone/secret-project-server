const jwt = require("jsonwebtoken");
const connectDB = require("../database/db");

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Connect to db
    const db = await connectDB();

    // No Authorization header
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    // Extract token
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    // Verify token
    let decoded;

    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );
    } catch (error) {
      return res.status(401).json({
        message:
          error.name === "TokenExpiredError"
            ? "Token expired"
            : "Invalid authentication token",
      });
    }

    // Get current user from database
    const user = await db.get(
      `SELECT
        id,
        username,
        display_name,
        email,
        avatar_path,
        role,
        is_verified
       FROM users
       WHERE id = ?`,
      [decoded.userId]
    );

    // User no longer exists
    if (!user) {
      return res.status(401).json({
        message: "User account not found",
      });
    }

    // Attach authenticated user to request
    req.user = {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      email: user.email,
      avatarPath: user.avatar_path,
      role: user.role,
      isVerified: user.is_verified,
    };

    // Continue to controller
    next();

  } catch (error) {
    console.error("Authentication middleware error:", error);

    return res.status(401).json({
      message: "Authentication failed",
    });
  }
};

module.exports = requireAuth;