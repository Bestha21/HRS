import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // Use process.cwd() so Render looks from the project root
  const distPath = path.resolve(process.cwd(), "dist", "public");
  
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}. Build folder missing!`
    );
  }

  // 1. Serve the main public folder
  app.use(express.static(distPath));

  // 2. CRITICAL: Explicitly serve the assets folder for CSS/JS
  app.use("/assets", express.static(path.resolve(distPath, "assets")));

  // 3. Fallback to index.html for the React router
  app.use("*", (req, res, next) => {
    // Skip API calls
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}