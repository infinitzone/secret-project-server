const fs = require("fs").promises;
const path = require("path");

/**
 * @swagger
 * /watch/{videoId}:
 *   get:
 *     summary: Watch a video
 *     description: |
 *       Validates the video ID and serves the requested MP4 video.
 *       The actual video bytes are served internally by Nginx.
 *     tags:
 *       - Watch video
 *
 *     parameters:
 *       - name: videoId
 *         in: path
 *         required: true
 *         description: Unique ID of the video.
 *         schema:
 *           type: string
 *           pattern: '^[a-zA-Z0-9-]+$'
 *         example: 8839720d-ec43-4be6-bf04-4784050367e5
 *
 *     responses:
 *       200:
 *         description: Video is available for streaming.
 *         content:
 *           video/mp4:
 *             schema:
 *               type: string
 *               format: binary
 *
 *       400:
 *         description: Invalid video ID.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Invalid video ID
 *
 *       404:
 *         description: Video not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Video not found
 *
 *       500:
 *         description: Unable to stream video.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Unable to stream video
 */
const streamVideo = async (req, res) => {
  try {
    const { videoId } = req.params;

    if (!/^[a-zA-Z0-9-]+$/.test(videoId)) {
      return res.status(400).json({ message: "Invalid video ID" });
    }

    const videoPath = path.join(
      process.cwd(),
      "object-storage",
      "videos",
      videoId,
      "video.mp4"
    );

    try {
      await fs.access(videoPath, fs.constants.R_OK);
    } catch {
      return res.status(404).json({ message: "Video not found" });
    }

    // Only security + validation. Let Nginx serve the real bytes + ranges.
    res.setHeader("X-Accel-Redirect", `/internal-videos/${videoId}/video.mp4`);
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "private, no-store");

    // Important: return 200 (not 206). Nginx will turn it into proper 206s.
    return res.status(200).end();

  } catch (error) {
    console.error("Video streaming error:", error);
    if (!res.headersSent) {
      return res.status(500).json({ message: "Unable to stream video" });
    }
    res.destroy();
  }
};

module.exports = { streamVideo };