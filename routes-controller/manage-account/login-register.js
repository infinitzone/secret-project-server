const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const connectDB = require("../../database/db");
const logger = require("../../logger");

const SALT_ROUNDS = 12;

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

// ============================================================
// Register User
// ============================================================

/**
 * @swagger
 * /user/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user account and returns an authentication token.
 *     tags:
 *       - Authentication
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 example: hridoy
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 format: password
 *                 example: secret123
 *               display_name:
 *                 type: string
 *                 example: Hridoy
 *
 *     responses:
 *       201:
 *         description: Registration successful.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Registration successful
 *                 token:
 *                   type: string
 *                   description: JWT authentication token.
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                       format: email
 *                     display_name:
 *                       type: string
 *                     role:
 *                       type: string
 *                     is_verified:
 *                       type: boolean
 *                     created_at:
 *                       type: string
 *
 *       400:
 *         description: Invalid or missing input.
 *
 *       409:
 *         description: Username or email already exists.
 *
 *       500:
 *         description: Registration failed.
 */
const register = async (req, res) => {
  try {
    let {
      username,
      email,
      password,
      display_name,
    } = req.body;

    // Normalize input
    username = username?.trim();
    email = email?.trim().toLowerCase();
    display_name = display_name?.trim();

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Username, email and password are required",
      });
    }

    // Validate username
    if (username.length < 3) {
      return res.status(400).json({
        message: "Username must be at least 3 characters",
      });
    }

    // Validate password
    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters",
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: "Invalid email address",
      });
    }

    const db = await connectDB();

    // Check existing username/email
    const existingUser = await db.get(
      `SELECT id
       FROM users
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

    // Fetch created user
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

    if (!user) {
      throw new Error("User was created but could not be retrieved");
    }

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


// ============================================================
// Login User
// ============================================================

/**
 * @swagger
 * /user/login:
 *   post:
 *     summary: Login user
 *     description: Authenticate a user using their username or email and password.
 *     tags:
 *       - Authentication
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *               - password
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Username or email address.
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: secret123
 *
 *     responses:
 *       200:
 *         description: Login successful.
 *
 *       400:
 *         description: Username/email and password are required.
 *
 *       401:
 *         description: Invalid credentials.
 *
 *       500:
 *         description: Login failed.
 */
const login = async (req, res) => {
  try {
    let { identifier, password } = req.body;

    identifier = identifier?.trim();

    if (!identifier || !password) {
      return res.status(400).json({
        message: "Username/email and password are required",
      });
    }

    const db = await connectDB();

    // Don't use SELECT * in production APIs.
    const user = await db.get(
      `SELECT
        id,
        username,
        email,
        password_hash,
        display_name,
        avatar_path,
        role,
        is_verified
       FROM users
       WHERE username = ? OR email = ?`,
      [identifier, identifier.toLowerCase()]
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