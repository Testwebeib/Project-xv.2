import express from "express";
import multer from "multer";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { pipeline } from "node:stream/promises";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
const LIBRARY_ID = process.env.BUNNY_LIBRARY_ID;
const API_KEY = process.env.BUNNY_STREAM_API_KEY;
const MAX_MB = Number(process.env.MAX_UPLOAD_MB || 500);

if (!LIBRARY_ID || !API_KEY) {
  console.warn("Set BUNNY_LIBRARY_ID and BUNNY_STREAM_API_KEY in .env before uploads will work.");
}

app.use(express.json({ limit: "50kb" }));
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "public" });
});
const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: MAX_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ok = ["video/mp4", "video/quicktime", "video/webm"].includes(file.mimetype);
    cb(ok ? null : new Error("Choose an MP4, MOV, or WebM video."), ok);
  }
});

// In-memory demo catalog: it resets when the server restarts.
// For production, replace this with a database and admin approval workflow.
const catalog = [];

function requireConfig(_req, res, next) {
  if (!LIBRARY_ID || !API_KEY) return res.status(503).json({ error: "Video storage is not configured. Set the Bunny Stream environment variables." });
  next();
}

app.get("/api/videos", (_req, res) => res.json(catalog));

app.post("/api/videos", requireConfig, upload.single("video"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Choose a video file first." });
  const title = String(req.body.title || "").trim().slice(0, 100);
  if (!title) {
    fs.rm(req.file.path, { force: true }, () => {});
    return res.status(400).json({ error: "A title is required." });
  }

  try {
    // Create a video record with Bunny Stream using a server-side secret.
    const createResp = await fetch(`https://video.bunnycdn.com/library/${encodeURIComponent(LIBRARY_ID)}/videos`, {
      method: "POST",
      headers: { AccessKey: API_KEY, Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ title })
    });
    if (!createResp.ok) {
      const detail = await createResp.text();
      throw new Error(`Storage service could not create video (${createResp.status}): ${detail.slice(0, 300)}`);
    }
    const created = await createResp.json();

    // Stream file to Bunny; API key remains on the server, never sent to the browser.
    const fileStream = fs.createReadStream(req.file.path);
    const putResp = await fetch(`https://video.bunnycdn.com/library/${encodeURIComponent(LIBRARY_ID)}/videos/${encodeURIComponent(created.guid)}`, {
      method: "PUT",
      headers: { AccessKey: API_KEY, Accept: "application/json", "Content-Type": "application/octet-stream" },
      body: fileStream,
      duplex: "half"
    });
    if (!putResp.ok) {
      const detail = await putResp.text();
      throw new Error(`Storage service upload failed (${putResp.status}): ${detail.slice(0, 300)}`);
    }

    const item = {
      id: created.guid,
      title,
      category: "Pending review",
      status: "processing",
      // Bunny Stream's standard embed URL. Restrict playback with provider settings and your own access checks.
      embedUrl: `https://iframe.mediadelivery.net/embed/${encodeURIComponent(LIBRARY_ID)}/${encodeURIComponent(created.guid)}`,
      createdAt: new Date().toISOString()
    };
    catalog.unshift(item);
    res.status(201).json(item);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: err.message || "Upload failed." });
  } finally {
    fs.rm(req.file.path, { force: true }, () => {});
  }
});

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: `File is too large. Maximum upload is ${MAX_MB} MB.` });
  }
  res.status(400).json({ error: err.message || "Request failed." });
});

app.listen(PORT, () => console.log(`PROJECT X running on http://localhost:${PORT}`));
