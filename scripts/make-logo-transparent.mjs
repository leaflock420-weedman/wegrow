import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const input = path.join(root, "logo.jpg");
const output = path.join(root, "logo.png");

try {
  await fs.access(input);
} catch {
  console.log("No logo.jpg — keeping existing logo.png");
  process.exit(0);
}

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

for (let i = 0; i < data.length; i += 4) {
  const luminance = (data[i] + data[i + 1] + data[i + 2]) / 3;
  if (luminance < 32) data[i + 3] = 0;
  else if (luminance < 72) data[i + 3] = Math.min(255, Math.round(((luminance - 32) / 40) * 255));
}

await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
  .trim({ threshold: 12 })
  .png()
  .toFile(output);

console.log(`Created transparent logo: ${output}`);