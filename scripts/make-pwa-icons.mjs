import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const logo = path.join(root, "logo.png");

async function makeIcon(size, out) {
  const meta = await sharp(logo).metadata();
  const pad = Math.round(size * 0.12);
  const inner = size - pad * 2;
  const scale = inner / Math.max(meta.width, meta.height);
  const w = Math.round(meta.width * scale);
  const h = Math.round(meta.height * scale);
  const left = Math.round((size - w) / 2);
  const top = Math.round((size - h) / 2);

  const resized = await sharp(logo).resize(w, h).png().toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 10, g: 15, b: 10, alpha: 1 },
    },
  })
    .composite([{ input: resized, left, top }])
    .png()
    .toFile(out);

  console.log("Wrote", out);
}

await makeIcon(192, path.join(root, "icon-192.png"));
await makeIcon(512, path.join(root, "icon-512.png"));