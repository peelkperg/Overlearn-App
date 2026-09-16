#!/usr/bin/env node

/**
 * Generates public/manifest.json and the two PWA icon sizes from the
 * project's single source of truth for the deploy base path
 * (app.json#expo.experiments.baseUrl, AD-3) so the manifest's start_url/
 * scope can never drift from the router's own base path.
 *
 * public/manifest.json is a generated artifact -- never hand-edited
 * (see .gitignore). The two icon PNGs are committed alongside it since
 * they are static and config-independent.
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const root = process.cwd();
const appJsonPath = path.join(root, "app.json");
const masterIconPath = path.join(root, "assets/images/icon.png");
const publicDir = path.join(root, "public");

let appJson;
try {
  appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));
} catch (error) {
  console.error(`❌ Failed to read/parse app.json: ${error.message}`);
  process.exit(1);
}
const expoConfig = appJson.expo || {};

const baseUrl = expoConfig.experiments && expoConfig.experiments.baseUrl;

// AD-3: app.json#expo.experiments.baseUrl is the sole source of truth for
// the deploy base path -- fail loud rather than silently falling back to
// "" and shipping a manifest whose start_url/scope don't match the router.
if (
  typeof baseUrl !== "string" ||
  !baseUrl.startsWith("/") ||
  !baseUrl.endsWith("/") ||
  baseUrl.includes("//")
) {
  console.error(
    `❌ expo.experiments.baseUrl must be set in app.json, start and end with "/", and contain no "//" (got: ${JSON.stringify(
      baseUrl
    )}).`
  );
  process.exit(1);
}

const appName = expoConfig.name || "Overlearn";

// Brand colors sourced from src/constants/theme.ts (light.background,
// light.accent) -- kept in sync manually, no cross-file import since this
// script is plain CommonJS and theme.ts is TS.
const backgroundColor = "#ffffff";
const themeColor = "#127A45";

const manifest = {
  name: appName,
  short_name: appName,
  start_url: baseUrl,
  scope: baseUrl,
  display: "standalone",
  background_color: backgroundColor,
  theme_color: themeColor,
  icons: [
    {
      src: `${baseUrl}icon-192.png`,
      sizes: "192x192",
      type: "image/png",
    },
    {
      src: `${baseUrl}icon-512.png`,
      sizes: "512x512",
      type: "image/png",
    },
  ],
};

async function main() {
  await fs.promises.mkdir(publicDir, { recursive: true });

  // Icons are generated before manifest.json is written so a failed resize
  // (missing/corrupt master icon) never leaves a manifest on disk that
  // references icon files that don't exist.
  await sharp(masterIconPath)
    .resize(192, 192)
    .toFile(path.join(publicDir, "icon-192.png"));
  console.log("🖼️  public/icon-192.png generated.");

  await sharp(masterIconPath)
    .resize(512, 512)
    .toFile(path.join(publicDir, "icon-512.png"));
  console.log("🖼️  public/icon-512.png generated.");

  await fs.promises.writeFile(
    path.join(publicDir, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n"
  );
  console.log("📄 public/manifest.json generated.");
}

main().catch((error) => {
  console.error(`❌ Error generating web manifest: ${error?.message ?? String(error)}`);
  process.exit(1);
});
