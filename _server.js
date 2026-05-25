const express = require("express");
const fs      = require("fs");
const path    = require("path");
const multer  = require("multer");
const sizeOf  = require("image-size");
const sharp   = require("sharp");
const { v4: uuidv4 } = require("uuid");
const { exec } = require("child_process");

const basePath = path.resolve(__dirname);
const PORT     = 8080;
const DATA_FILE = path.join(basePath, "data", "photos.json");
const THUMB_DIR = path.join(basePath, "images", "thumbnails");
const THUMB_WIDTH = 400;
const THUMB_QUALITY = 70;

// --- multer setup: save uploaded images to images/ with UUID name ---
const storage = multer.diskStorage({
  destination: path.join(basePath, "images"),
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uuidv4() + ext);
  }
});

const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if ([".jpg", ".jpeg", ".png"].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG and PNG files are allowed"));
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 } // 50 MB
});

// --- helpers ---

function loadPhotos() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(DATA_FILE, "[]", "utf-8");
      return [];
    }
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to load photos.json:", e.message);
    return [];
  }
}

function savePhotos(photos) {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(photos, null, 2), "utf-8");
}

function gitSync(message) {
  const safeMsg = message.replace(/"/g, "\\\"");
  const cmd = `git add images/ data/photos.json && git commit -m "` + safeMsg + `" && git push`;
  exec(cmd, { cwd: basePath }, function (err, stdout, stderr) {
    if (err) {
      console.error("Git sync failed:", err.message);
      if (stderr) console.error(stderr);
      return;
    }
    console.log("Git synced:", message);
    if (stdout) console.log(stdout.trim());
  });
}

// --- thumbnail generation ---

function ensureThumbDir() {
  if (!fs.existsSync(THUMB_DIR)) {
    fs.mkdirSync(THUMB_DIR, { recursive: true });
    console.log("Created thumbnail directory:", THUMB_DIR);
  }
}

function getThumbPath(imageFilename) {
  const parsed = path.parse(imageFilename);
  // Always use .jpg extension for thumbnails (PNG originals get JPEG thumbnails)
  return path.join(THUMB_DIR, parsed.name + ".jpg");
}

async function generateThumbnail(sourcePath, thumbPath) {
  try {
    await sharp(sourcePath)
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: THUMB_QUALITY })
      .toFile(thumbPath);
    console.log("Thumbnail generated:", path.basename(thumbPath));
    return true;
  } catch (e) {
    console.error("Failed to generate thumbnail for", sourcePath, ":", e.message);
    return false;
  }
}

async function scanAndGenerateMissingThumbnails() {
  ensureThumbDir();

  const photos = loadPhotos();
  if (photos.length === 0) return;

  console.log("Scanning for missing thumbnails...");
  let generated = 0;

  for (const photo of photos) {
    const srcPath = path.join(basePath, photo.src);
    if (!fs.existsSync(srcPath)) continue;

    const imageFilename = path.basename(photo.src);
    const thumbPath = getThumbPath(imageFilename);

    // Update thumb field in photo record
    const thumbRelative = "images/thumbnails/" + path.basename(thumbPath);
    photo.thumb = thumbRelative;

    // Generate if missing
    if (!fs.existsSync(thumbPath)) {
      const ok = await generateThumbnail(srcPath, thumbPath);
      if (ok) generated++;
    }
  }

  if (generated > 0) {
    savePhotos(photos);
    console.log("Generated", generated, "missing thumbnails, photos.json updated.");
  } else if (photos.some(p => p.thumb && !fs.existsSync(path.join(basePath, p.thumb)))) {
    // photos.json had stale thumb references? re-check
    savePhotos(photos);
    console.log("Updated photos.json with thumb fields.");
  } else {
    console.log("All thumbnails up to date.");
  }
}

// --- init ---
const app = express();

// static files
app.use(express.static(basePath, {
  setHeaders: function (res, filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if ([".html", ".css", ".js"].includes(ext)) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    }
  }
}));

// --- routes ---

// root redirect
app.get("/", function (req, res) {
  res.redirect("/Home/Home.html");
});

// admin page
app.get("/admin", function (req, res) {
  res.sendFile(path.join(basePath, "Admin", "admin.html"));
});

// redirect /admin/ to /admin
app.get("/admin/", function (req, res) {
  res.redirect("/admin");
});

// GET all photos
app.get("/api/photos", function (req, res) {
  res.json(loadPhotos());
});

// POST upload photo
app.post("/api/photos", upload.single("photo"), async function (req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filename = req.file.filename;
    const filePath = path.join(basePath, "images", filename);

    // detect dimensions
    let w = 0, h = 0;
    try {
      const dims = sizeOf(filePath);
      w = dims.width;
      h = dims.height;
    } catch (e) {
      console.error("Failed to read image dimensions:", e.message);
    }

    // generate thumbnail
    ensureThumbDir();
    const thumbPath = getThumbPath(filename);
    await generateThumbnail(filePath, thumbPath);
    const thumbRelative = "images/thumbnails/" + path.basename(thumbPath);

    const title = req.body.title || "";
    const alt = title || "Photography work";

    const photos = loadPhotos();
    const newPhoto = {
      id: uuidv4(),
      src: "images/" + filename,
      thumb: thumbRelative,
      title: title,
      alt: alt,
      w: w,
      h: h
    };
    photos.push(newPhoto);
    savePhotos(photos);

    res.json(newPhoto);
    gitSync("Add photo: " + (title || filename));
  } catch (e) {
    console.error("Upload error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// DELETE photo
app.delete("/api/photos/:id", function (req, res) {
  const id = req.params.id;
  let photos = loadPhotos();
  const idx = photos.findIndex(function (p) { return p.id === id; });
  if (idx === -1) {
    return res.status(404).json({ error: "Photo not found" });
  }

  const photo = photos[idx];

  // delete image file
  const imgPath = path.join(basePath, photo.src);
  try {
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
  } catch (e) {
    console.error("Failed to delete image file:", e.message);
  }

  // delete thumbnail file
  if (photo.thumb) {
    const thumbPath = path.join(basePath, photo.thumb);
    try {
      if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
    } catch (e) {
      console.error("Failed to delete thumbnail file:", e.message);
    }
  }

  photos.splice(idx, 1);
  savePhotos(photos);
  res.json({ success: true });
  gitSync("Delete photo: " + id);
});

// --- start ---
app.listen(PORT, function () {
  console.log("Gallery server running at http://localhost:" + PORT + "/");
  console.log("Admin panel at http://localhost:" + PORT + "/admin");
  // Thumbnail scan on startup
  scanAndGenerateMissingThumbnails().catch(function (e) {
    console.error("Thumbnail scan failed:", e.message);
  });
});
