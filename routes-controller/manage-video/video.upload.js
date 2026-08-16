const express = require("express");
const Router = express.Router();
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

const connectDB = require("../../database/db");
const requireAuth = require("../../middleware/requireAuth");

// ========================
// Multer
// ========================

const upload = multer({
  storage: multer.memoryStorage(),
});

// ========================
// Upload Video
// ========================

const uploadVideo = async (req, res) => {
  let videoDir = null;

  try {
    // ========================
    // All incoming data
    // ========================

    const user = req.user;

    const {
      title,
      description,
      visibility,
    } = req.body;

    const video = req.files?.video?.[0];
    const thumbnail = req.files?.thumbnail?.[0];

    // ========================
    // Required fields
    // ========================

    if (!user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    if (!title?.trim()) {
      return res.status(400).json({
        message: "Title is required",
      });
    }

    if (!description?.trim()) {
      return res.status(400).json({
        message: "Description is required",
      });
    }

    if (!visibility) {
      return res.status(400).json({
        message: "Visibility is required",
      });
    }

    if (!video) {
      return res.status(400).json({
        message: "Video file is required",
      });
    }

    if (!thumbnail) {
      return res.status(400).json({
        message: "Thumbnail is required",
      });
    }

    // ========================
    // Validate visibility
    // ========================

    if (!["public", "private"].includes(visibility)) {
      return res.status(400).json({
        message: "Visibility must be public or private",
      });
    }

    // ========================
    // Validate video
    // ========================

    if (video.mimetype !== "video/mp4") {
      return res.status(400).json({
        message: "Only MP4 videos are supported",
      });
    }

    // ========================
    // Validate thumbnail
    // ========================

    const allowedThumbnailTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedThumbnailTypes.includes(thumbnail.mimetype)) {
      return res.status(400).json({
        message: "Invalid thumbnail format",
      });
    }

    // ========================
    // Generate video ID
    // ========================

    const videoId = crypto.randomUUID();

    // ========================
    // Video directory
    // ========================

    videoDir = path.join(
      process.cwd(),
      "object-storage",
      "videos",
      videoId
    );

    await fs.promises.mkdir(videoDir, {
      recursive: true,
    });

    // ========================
    // Save video
    // ========================

    const videoFilePath = path.join(
      videoDir,
      "video.mp4"
    );

    await fs.promises.writeFile(
      videoFilePath,
      video.buffer
    );

    // ========================
    // Save thumbnail
    // ========================

    const thumbnailFilePath = path.join(
      videoDir,
      "thumbnail.jpg"
    );

    await fs.promises.writeFile(
      thumbnailFilePath,
      thumbnail.buffer
    );

    // ========================
    // Database
    // ========================

    const db = await connectDB();

    await db.run(
      `INSERT INTO videos (
        id,
        user_id,
        title,
        description,
        video_path,
        thumbnail_path,
        original_filename,
        mime_type,
        file_size,
        duration,
        width,
        height,
        status,
        visibility
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        videoId,
        user.id,
        title.trim(),
        description.trim(),

        `/internal-videos/${videoId}/video.mp4`,
        `/thumbnails/${videoId}/thumbnail.jpg`,

        video.originalname,
        video.mimetype,
        video.size,

        null,
        null,
        null,

        "processing",
        visibility,
      ]
    );

    // ========================
    // Response
    // ========================

    return res.status(201).json({
      message: "Video uploaded successfully",

      video: {
        id: videoId,
        user_id: user.id,

        title: title.trim(),
        description: description.trim(),

        videoPath: `/videos/${videoId}/video.mp4`,
        thumbnailPath: `/videos/${videoId}/thumbnail.jpg`,

        status: "processing",
        visibility,
      },
    });

  } catch (error) {
    console.error("Video upload error:", error);

    // Remove files if something failed
    if (videoDir) {
      try {
        await fs.promises.rm(videoDir, {
          recursive: true,
          force: true,
        });
      } catch (cleanupError) {
        console.error(
          "Cleanup error:",
          cleanupError
        );
      }
    }

    return res.status(500).json({
      message: "Video upload failed",
    });
  }
};

// ========================
// Route
// ========================

Router.post(
  "/",
  requireAuth,
  upload.fields([
    {
      name: "video",
      maxCount: 1,
    },
    {
      name: "thumbnail",
      maxCount: 1,
    },
  ]),
  uploadVideo
);

module.exports = Router;