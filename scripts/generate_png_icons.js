import fs from 'fs';
import zlib from 'zlib';

function createPNG(width, height, drawFn) {
  // Create raw RGBA buffer
  const rowBytes = width * 4 + 1; // +1 for filter byte (0 = none)
  const rawData = Buffer.alloc(rowBytes * height);

  for (let y = 0; y < height; y++) {
    const rowStart = y * rowBytes;
    rawData[rowStart] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const pixelStart = rowStart + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pixelStart] = r;
      rawData[pixelStart + 1] = g;
      rawData[pixelStart + 2] = b;
      rawData[pixelStart + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // CRC32 table
  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[i] = c >>> 0;
  }

  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = data.length;
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const chunkData = Buffer.concat([typeBuf, data]);
    const crcVal = crc32(chunkData);
    crcBuf.writeUInt32BE(crcVal, 0);

    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(len, 0);

    return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

// Draw Apple Touch Icon (180x180) with Navy (#0E2A38), Terracotta (#C67D3B), Cream (#F7F5F0)
const iconPng = createPNG(180, 180, (x, y, w, h) => {
  const cx = w / 2;
  const cy = h / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Background rounded rect / gradient
  const cornerRadius = 38;
  const rx = Math.max(0, Math.abs(dx) - (w / 2 - cornerRadius));
  const ry = Math.max(0, Math.abs(dy) - (h / 2 - cornerRadius));
  const insideRounded = (rx * rx + ry * ry) <= (cornerRadius * cornerRadius);

  if (!insideRounded) {
    return [0, 0, 0, 0]; // Transparent outside rounded corner
  }

  // Border ring in Terracotta
  const isBorder = (rx * rx + ry * ry) >= (cornerRadius - 4) * (cornerRadius - 4) ||
                   Math.abs(dx) >= (w / 2 - 4) || Math.abs(dy) >= (h / 2 - 4);
  if (isBorder) {
    return [0xC6, 0x7D, 0x3B, 255];
  }

  // Stylized Monogram "G" / Arch in Center
  const innerR = 48;
  const outerR = 64;
  const inRing = dist >= innerR && dist <= outerR;
  const angle = Math.atan2(dy, dx); // -PI to +PI (0 is right, PI/2 is down)

  // Cutout for "G" opening on the right (angle between -0.4 and 0.4)
  const isOpening = angle > -0.45 && angle < 0.2;
  
  // Horizontal bar of "G"
  const isCrossbar = dy >= -6 && dy <= 6 && dx >= 0 && dx <= 45;

  if ((inRing && !isOpening) || isCrossbar) {
    return [0xDE, 0x8C, 0x44, 255]; // Terracotta / Ochre
  }

  // Keystone dot
  const keystoneDist = Math.sqrt(dx * dx + (dy + 70) * (dy + 70));
  if (keystoneDist <= 6) {
    return [0xF7, 0xF5, 0xF0, 255]; // Cream
  }

  // Navy background
  return [0x0E, 0x2A, 0x38, 255];
});

fs.writeFileSync('public/apple-touch-icon.png', iconPng);
console.log('Created public/apple-touch-icon.png (180x180)');

// Also create og-image.png (600x315)
const ogPng = createPNG(600, 315, (x, y, w, h) => {
  const cx = w / 2;
  const cy = h / 2;
  const dx = x - cx;
  const dy = y - cy;

  // Navy gradient background
  const grad = Math.min(1, Math.max(0, (x + y) / (w + h)));
  const r = Math.round(0x0E * (1 - grad * 0.3));
  const g = Math.round(0x2A * (1 - grad * 0.3));
  const b = Math.round(0x38 * (1 - grad * 0.3));

  // Center badge circle
  const iconDist = Math.sqrt(dx * dx + dy * dy);
  if (iconDist < 80) {
    if (iconDist > 75) return [0xC6, 0x7D, 0x3B, 255];
    const innerDist = iconDist;
    const inRing = innerDist >= 35 && innerDist <= 55;
    const angle = Math.atan2(dy, dx);
    const isOpening = angle > -0.45 && angle < 0.2;
    const isCrossbar = dy >= -5 && dy <= 5 && dx >= 0 && dx <= 35;
    if ((inRing && !isOpening) || isCrossbar) {
      return [0xDE, 0x8C, 0x44, 255];
    }
  }

  return [r, g, b, 255];
});

fs.writeFileSync('public/og-image.png', ogPng);
console.log('Created public/og-image.png (600x315)');
