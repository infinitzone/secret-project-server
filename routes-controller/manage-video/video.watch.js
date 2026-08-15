const fs = require("fs");
const path = require("path");

const MAX_CHUNK_SIZE = 2 * 1024 * 1024; // 2 MB

const streamVideo = async (req, res) => {
  try {
    const { videoId } = req.params;

    // Prevent path traversal
    if (!/^[a-zA-Z0-9-]+$/.test(videoId)) {
      return res.status(400).json({
        message: "Invalid video ID",
      });
    }

    const videoPath = path.join(
      process.cwd(),
      "object-storage",
      "videos",
      videoId,
      "video.mp4"
    );

    // Check file
    try {
      await fs.promises.access(videoPath, fs.constants.R_OK);
    } catch {
      return res.status(404).json({
        message: "Video not found",
      });
    }

    const stat = await fs.promises.stat(videoPath);
    const fileSize = stat.size;

    const range = req.headers.range;

    // Browser should normally send Range for video
    if (!range) {
      return res.status(416).set({
        "Content-Range": `bytes */${fileSize}`,
        "Accept-Ranges": "bytes",
      }).end();
    }

    // Only support single ranges
    const match = range.match(/^bytes=(\d*)-(\d*)$/);

    if (!match) {
      return res.status(416).set({
        "Content-Range": `bytes */${fileSize}`,
        "Accept-Ranges": "bytes",
      }).end();
    }

    let start;
    let end;

    const requestedStart = match[1];
    const requestedEnd = match[2];

    // Example: bytes=1000000-
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
    }

    // Example: bytes=-500000
    else if (requestedEnd !== "") {
      const suffixLength = Number(requestedEnd);

      if (
        !Number.isSafeInteger(suffixLength) ||
        suffixLength <= 0
      ) {
        return res.status(416).set({
          "Content-Range": `bytes */${fileSize}`,
          "Accept-Ranges": "bytes",
        }).end();
      }

      start = Math.max(fileSize - suffixLength, 0);
      end = fileSize - 1;
    }

    else {
      return res.status(416).set({
        "Content-Range": `bytes */${fileSize}`,
        "Accept-Ranges": "bytes",
      }).end();
    }

    // Clamp end to actual file size
    end = Math.min(end, fileSize - 1);

    // Invalid range
    if (start > end || start >= fileSize) {
      return res.status(416).set({
        "Content-Range": `bytes */${fileSize}`,
        "Accept-Ranges": "bytes",
      }).end();
    }

    /*
     * Limit response size.
     *
     * Example:
     * Browser asks:
     * bytes=0-999999999
     *
     * Server returns:
     * bytes=0-2097151
     */
    if (end - start + 1 > MAX_CHUNK_SIZE) {
      end = Math.min(
        start + MAX_CHUNK_SIZE - 1,
        fileSize - 1
      );
    }

    const chunkSize = end - start + 1;

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": "video/mp4",

      // Don't publicly cache video chunks
      "Cache-Control": "private, no-store",
    });

    const videoStream = fs.createReadStream(videoPath, {
      start,
      end,
    });

    // Client disconnected
    req.on("close", () => {
      videoStream.destroy();
    });

    videoStream.on("error", (error) => {
      console.error("Video streaming error:", error);

      if (!res.headersSent) {
        res.status(500).json({
          message: "Video streaming failed",
        });
      } else {
        res.destroy();
      }
    });

    videoStream.pipe(res);

  } catch (error) {
    console.error("Video streaming error:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        message: "Unable to stream video",
      });
    }

    res.destroy();
  }
};

module.exports = {
  streamVideo,
};