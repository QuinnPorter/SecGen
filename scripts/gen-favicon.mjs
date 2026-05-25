// Regenerate app/favicon.ico from app/icon.svg.
//
// Modern browsers honor app/icon.svg via Next's App Router metadata, but older
// clients and pinned tabs may still request favicon.ico. This script rasterizes
// the SVG at three sizes (16/32/48) and assembles a PNG-in-ICO container.
//
// Run from the nato-sg directory:
//   node scripts/gen-favicon.mjs
//
// Dependencies: sharp (already a transitive dep of next/sharp).

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const here    = dirname(fileURLToPath(import.meta.url))
const root    = join(here, '..')
const svgPath = join(root, 'app', 'icon.svg')
const icoPath = join(root, 'app', 'favicon.ico')

const SIZES = [16, 32, 48]

const svg = readFileSync(svgPath)

const pngs = await Promise.all(
  SIZES.map((s) =>
    sharp(svg)
      .resize(s, s, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toBuffer(),
  ),
)

// ── ICO assembly (PNG-in-ICO variant) ─────────────────────────────────────────
// Layout:
//   ICONDIR (6 bytes) +  N * ICONDIRENTRY (16 bytes each) + concatenated PNGs.

const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0)              // reserved
header.writeUInt16LE(1, 2)              // type = 1 (ICO)
header.writeUInt16LE(SIZES.length, 4)   // image count

const entries  = []
let   offset   = 6 + 16 * SIZES.length  // first image data starts after dir+entries

for (let i = 0; i < SIZES.length; i++) {
  const s   = SIZES[i]
  const png = pngs[i]
  const e   = Buffer.alloc(16)

  // Width / height: byte value 0 means 256; SIZES are all <256 here.
  e.writeUInt8(s, 0)
  e.writeUInt8(s, 1)
  e.writeUInt8(0, 2)                   // color count (0 for true-color)
  e.writeUInt8(0, 3)                   // reserved
  e.writeUInt16LE(1, 4)                // color planes
  e.writeUInt16LE(32, 6)               // bits per pixel
  e.writeUInt32LE(png.length, 8)       // image data size
  e.writeUInt32LE(offset, 12)          // image data offset

  entries.push(e)
  offset += png.length
}

const ico = Buffer.concat([header, ...entries, ...pngs])
writeFileSync(icoPath, ico)
console.log(`Wrote ${ico.length} bytes to app/favicon.ico (sizes: ${SIZES.join(', ')})`)
