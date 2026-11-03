import zlib from "node:zlib";

// Tabela de CRC32 pré-calculada para geração determinística e de alta performance
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

export function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function createChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(4 + 4 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, "ascii");
  data.copy(buf, 8);

  const crcTarget = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = crc32(crcTarget);
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

/**
 * Codifica um buffer linear de pixels RGBA em uma imagem PNG em formato Buffer.
 *
 * @param {number} width - Largura da imagem em pixels.
 * @param {number} height - Altura da imagem em pixels.
 * @param {Buffer} rgbaBuffer - Buffer de bytes RGBA com tamanho width * height * 4.
 * @returns {Buffer} Buffer contendo a imagem PNG completa.
 */
export function encodePng(width, height, rgbaBuffer) {
  const lineStride = width * 4;
  const rawData = Buffer.alloc(height * (lineStride + 1));

  for (let y = 0; y < height; y++) {
    const rawOffset = y * (lineStride + 1);
    rawData[rawOffset] = 0; // Filter None
    rgbaBuffer.copy(rawData, rawOffset + 1, y * lineStride, (y + 1) * lineStride);
  }

  const compressedData = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: RGBA (6)
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = createChunk("IHDR", ihdr);
  const idatChunk = createChunk("IDAT", compressedData);
  const iendChunk = createChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}
