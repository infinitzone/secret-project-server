const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
require("dotenv").config();

// Adjust this path to wherever your SQLite connection is located
const connectDB = require("../../database/db");
const logger = require("../../logger");

const SALT_ROUNDS = 12;

// Generate JWT
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      username: user.username,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

// ========================
// Register
// ========================
const register = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      display_name,
    } = req.body;

    // Connect to db
    const db = await connectDB();

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Username, email and password are required",
      });
    }

    // Basic validation
    if (username.length < 3) {
      return res.status(400).json({
        message: "Username must be at least 3 characters",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters",
      });
    }

    // Check existing username/email
    const existingUser = await db.get(
      `SELECT id FROM users
       WHERE username = ? OR email = ?`,
      [username, email]
    );

    if (existingUser) {
      return res.status(409).json({
        message: "Username or email already exists",
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(
      password,
      SALT_ROUNDS
    );

    // Insert user
    const result = await db.run(
      `INSERT INTO users (
        username,
        email,
        password_hash,
        display_name
      )
      VALUES (?, ?, ?, ?)`,
      [
        username,
        email,
        passwordHash,
        display_name || username,
      ]
    );

    // Get created user
    const user = await db.get(
      `SELECT
        id,
        username,
        email,
        display_name,
        role,
        is_verified,
        created_at
       FROM users
       WHERE id = ?`,
      [result.lastID]
    );

    // Generate JWT
    const token = generateToken(user);

    return res.status(201).json({
      message: "Registration successful",
      token,
      user,
    });

  } catch (error) {
    logger.error("Register error:", error);

    return res.status(500).json({
      message: "Registration failed",
    });
  }
};

// ========================
// Login
// ========================
const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // Connect to db
    const db = await connectDB();

    if (!identifier || !password) {
      return res.status(400).json({
        message: "Username/email and password are required",
      });
    }

    const user = await db.get(
      `SELECT *
       FROM users
       WHERE username = ? OR email = ?`,
      [identifier, identifier]
    );

    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const passwordValid = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordValid) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const token = generateToken(user);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        display_name: user.display_name,
        avatar_path: user.avatar_path,
        role: user.role,
        is_verified: user.is_verified,
      },
    });

  } catch (error) {
    logger.error("Login error:", error);

    return res.status(500).json({
      message: "Login failed",
    });
  }
};

module.exports = {
  register,
  login,
};