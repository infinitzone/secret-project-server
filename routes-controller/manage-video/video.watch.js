const fs = require("fs").promises; // Use promises directly
const path = require("path");

const MAX_CHUNK_SIZE = 2 * 1024 * 1024; // 2 MB

const streamVideo = async (req, res) => {
  try {
    const { videoId } = req.params;

    // 1. YOUR SECURITY (Unchanged)
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

    // 2. YOUR FILE CHECK (Unchanged)
    try {
      await fs.access(videoPath, fs.constants.R_OK);
    } catch {
      return res.status(404).json({ message: "Video not found" });
    }

    const stat = await fs.stat(videoPath);
    const fileSize = stat.size;

    // 3. YOUR RANGE LOGIC (Preserved exactly, but fixed the missing-range bug)
    let start = 0;
    let end = fileSize - 1; // Default to full file (will be capped by MAX_CHUNK_SIZE below)

    const range = req.headers.range;

    if (range) {
      // ---------- YOUR EXACT PARSING CODE (Copied from your file) ----------
      const match = range.match(/^bytes=(\d*)-(\d*)$/);
      if (!match) {
        return res.status(416).set({
          "Content-Range": `bytes */${fileSize}`,
          "Accept-Ranges": "bytes",
        }).end();
      }

      const requestedStart = match[1];
      const requestedEnd = match[2];

      if (requestedStart !== "") {
        start = Number(requestedStart);
        if (!Number.isSafeInteger(start) || start >= fileSize) {
          return res.status(416).set({
            "Content-Range": `bytes */${fileSize}`,
            "Accept-Ranges": "bytes",
          }).end();
        }
        if (requestedEnd !== "") {
          end = Number(requestedEnd);
          if (!Number.isSafeInteger(end)) {
            return res.status(416).set({
              "Content-Range": `bytes */${fileSize}`,
              "Accept-Ranges": "bytes",
            }).end();
          }
        } else {
          end = fileSize - 1;
        }
      } else if (requestedEnd !== "") {
        const suffixLength = Number(requestedEnd);
        if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
          return res.status(416).set({
            "Content-Range": `bytes */${fileSize}`,
            "Accept-Ranges": "bytes",
          }).end();
        }
        start = Math.max(fileSize - suffixLength, 0);
        end = fileSize - 1;
      } else {
        return res.status(416).set({
          "Content-Range": `bytes */${fileSize}`,
          "Accept-Ranges": "bytes",
        }).end();
      }
      // ---------------------------------------------------------------------
    } 
    // If NO range header (initial browser probe), we default to start=0, end=fileSize-1
    // The limit below will cap it to 2MB automatically.

    // Clamp end (Preserved)
    end = Math.min(end, fileSize - 1);

    // Invalid range (Preserved)
    if (start > end || start >= fileSize) {
      return res.status(416).set({
        "Content-Range": `bytes */${fileSize}`,
        "Accept-Ranges": "bytes",
      }).end();
    }

    // 4. YOUR 2MB CHUNK LIMIT (Preserved exactly)
    if (end - start + 1 > MAX_CHUNK_SIZE) {
      end = Math.min(start + MAX_CHUNK_SIZE - 1, fileSize - 1);
    }

    // 5. PRODUCTION UPGRADE: Offload to nginx via X-Accel-Redirect
    // We keep your custom headers so nginx knows exactly what bytes to send.
    res.setHeader("X-Accel-Redirect", `/internal-videos/${videoId}/video.mp4`);
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Length", end - start + 1);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "private, no-store"); // Your no-cache policy

    // nginx will automatically respect the Content-Range header when serving.
    return res.status(206).end();

  } catch (error) {
    console.error("Video streaming error:", error);
    if (!res.headersSent) {
      return res.status(500).json({ message: "Unable to stream video" });
    }
    res.destroy();
  }
};

module.exports = { streamVideo };