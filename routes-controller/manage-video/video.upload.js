const express = require("express");
const Router = express.Router();
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const logger = require("../../logger")

const connectDB = require("../../database/db");
const requireAuth = require("../../middleware/requireAuth");


// ========================
// Helper: Probe video metadata
// ========================

const probeVideo = (filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) reject(err);
      else resolve(metadata);
    });
  });
};

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
      category,
    } = req.body;

    const video = req.files?.video?.[0];
    const thumbnail = req.files?.thumbnail?.[0];

    // ========================
    // ==== ALL VALIDATION FIRST ====
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

    if (!category?.trim()) {
      return res.status(400).json({
        message: "Category is required",
      });
    }

    // Normalise category
    const cleanCategory = category
      .split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0)
      .join(',');

    if (!cleanCategory) {
      return res.status(400).json({
        message: "Category must contain at least one valid category name",
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

    if (!["public", "private"].includes(visibility)) {
      return res.status(400).json({
        message: "Visibility must be public or private",
      });
    }

    if (video.mimetype !== "video/mp4") {
      return res.status(400).json({
        message: "Only MP4 videos are supported",
      });
    }

    const allowedThumbnailTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedThumbnailTypes.includes(thumbnail.mimetype)) {
      return res.status(400).json({
        message: "Invalid thumbnail format",
      });
    }

    // ========================
    // ==== ALL VALIDATION PASSED → SAVE FILES ====
    // ========================

    const videoId = crypto.randomUUID();

    videoDir = path.join(
      process.cwd(),
      "object-storage",
      "videos",
      videoId
    );

    await fs.promises.mkdir(videoDir, {
      recursive: true,
    });

    const videoFilePath = path.join(videoDir, "video.mp4");
    await fs.promises.writeFile(videoFilePath, video.buffer);

    const thumbnailFilePath = path.join(videoDir, "thumbnail.jpg");
    await fs.promises.writeFile(thumbnailFilePath, thumbnail.buffer);

    // ========================
    // ==== EXTRACT VIDEO METADATA (duration, width, height) ====
    // ========================

    let duration = null;
    let width = null;
    let height = null;

    try {
      const metadata = await probeVideo(videoFilePath);
      const videoStream = metadata.streams.find(
        (stream) => stream.codec_type === "video"
      );

      duration = metadata.format.duration || null;
      width = videoStream?.width || null;
      height = videoStream?.height || null;
    } catch (probeError) {
      logger.error("Failed to probe video metadata:", probeError);
      // Continue with null values – they will be stored as NULL in DB.
    }

    // ========================
    // ==== INSERT METADATA ====
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
        visibility,
        category
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        duration,    // <-- extracted or null
        width,       // <-- extracted or null
        height,      // <-- extracted or null
        "processing",
        visibility,
        cleanCategory,
      ]
    );

    // ========================
    // ==== SUCCESS RESPONSE ====
    // ========================

    return res.status(201).json({
      message: "Video uploaded successfully",
      video: {
        id: videoId,
        user_id: user.id,
        title: title.trim(),
        description: description.trim(),
        category: cleanCategory,
        videoPath: `/videos/${videoId}/video.mp4`,
        thumbnailPath: `/videos/${videoId}/thumbnail.jpg`,
        duration,
        width,
        height,
        status: "processing",
        visibility,
      },
    });

  } catch (error) {
    logger.error("Video upload error:", error);

    // ========================
    // ==== CLEANUP ON ERROR ====
    // ========================
    // If files were saved (videoDir exists), delete the whole directory.
    if (videoDir) {
      try {
        await fs.promises.rm(videoDir, {
          recursive: true,
          force: true,
        });
        logger.log(`Deleted orphaned video directory: ${videoDir}`);
      } catch (cleanupError) {
        logger.error("Cleanup error:", cleanupError);
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
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  uploadVideo
);

module.exports = Router;