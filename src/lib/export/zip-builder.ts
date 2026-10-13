import zlib from "zlib";

/**
 * Standard CRC32 table & calculator for ZIP archives
 */
const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
})();

export function calculateCrc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buffer[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export interface ZipFileEntry {
  filename: string;
  data: Buffer | string;
}

/**
 * Lightweight, zero-dependency ZIP archive generator adhering to standard PKZIP 2.0 specifications.
 * Supports UTF-8 filenames and Deflate compression via Node.js native zlib.
 */
export class ZipBuilder {
  private files: Array<{
    name: string;
    uncompressedData: Buffer;
    compressedData: Buffer;
    crc32: number;
    compressionMethod: number;
  }> = [];

  public addFile(filename: string, content: Buffer | string): this {
    const uncompressedData = typeof content === "string" ? Buffer.from(content, "utf-8") : content;
    const crc32 = calculateCrc32(uncompressedData);

    // Deflate with Node.js built-in zlib
    const deflated = zlib.deflateRawSync(uncompressedData);

    // If compression didn't save space (e.g. tiny string), store uncompressed
    const shouldCompress = deflated.length < uncompressedData.length;
    const compressedData = shouldCompress ? deflated : uncompressedData;
    const compressionMethod = shouldCompress ? 8 : 0; // 8 = Deflate, 0 = Store

    // Normalize path separators to forward slash
    const normalizedName = filename.replace(/\\/g, "/").replace(/^\/+/, "");

    this.files.push({
      name: normalizedName,
      uncompressedData,
      compressedData,
      crc32,
      compressionMethod,
    });

    return this;
  }

  public build(): Buffer {
    const localHeadersAndData: Buffer[] = [];
    const centralDirectoryHeaders: Buffer[] = [];
    let currentOffset = 0;

    // Fixed DOS timestamp for deterministic reproducibility (2026-01-01 12:00:00)
    const dosTime = (12 << 11) | (0 << 5) | 0;
    const dosDate = ((2026 - 1980) << 9) | (1 << 5) | 1;

    for (const file of this.files) {
      const fileNameBuf = Buffer.from(file.name, "utf-8");

      // --- Local File Header ---
      const localHeader = Buffer.alloc(30);
      localHeader.writeUInt32LE(0x04034b50, 0); // signature
      localHeader.writeUInt16LE(20, 4); // version needed
      localHeader.writeUInt16LE(0x0800, 6); // general purpose flag (Bit 11: UTF-8)
      localHeader.writeUInt16LE(file.compressionMethod, 8); // compression method
      localHeader.writeUInt16LE(dosTime, 10); // file time
      localHeader.writeUInt16LE(dosDate, 12); // file date
      localHeader.writeUInt32LE(file.crc32, 14); // crc-32
      localHeader.writeUInt32LE(file.compressedData.length, 18); // compressed size
      localHeader.writeUInt32LE(file.uncompressedData.length, 22); // uncompressed size
      localHeader.writeUInt16LE(fileNameBuf.length, 26); // file name length
      localHeader.writeUInt16LE(0, 28); // extra field length

      const localChunk = Buffer.concat([localHeader, fileNameBuf, file.compressedData]);
      localHeadersAndData.push(localChunk);

      // --- Central Directory File Header ---
      const cdHeader = Buffer.alloc(46);
      cdHeader.writeUInt32LE(0x02014b50, 0); // signature
      cdHeader.writeUInt16LE(20, 4); // version made by
      cdHeader.writeUInt16LE(20, 6); // version needed
      cdHeader.writeUInt16LE(0x0800, 8); // general purpose flag (UTF-8)
      cdHeader.writeUInt16LE(file.compressionMethod, 10); // compression method
      cdHeader.writeUInt16LE(dosTime, 12); // file time
      cdHeader.writeUInt16LE(dosDate, 14); // file date
      cdHeader.writeUInt32LE(file.crc32, 16); // crc-32
      cdHeader.writeUInt32LE(file.compressedData.length, 20); // compressed size
      cdHeader.writeUInt32LE(file.uncompressedData.length, 24); // uncompressed size
      cdHeader.writeUInt16LE(fileNameBuf.length, 28); // file name length
      cdHeader.writeUInt16LE(0, 30); // extra field length
      cdHeader.writeUInt16LE(0, 32); // comment length
      cdHeader.writeUInt16LE(0, 34); // disk number start
      cdHeader.writeUInt16LE(0, 36); // internal file attributes
      cdHeader.writeUInt32LE(0, 38); // external file attributes
      cdHeader.writeUInt32LE(currentOffset, 42); // relative offset of local header

      const cdChunk = Buffer.concat([cdHeader, fileNameBuf]);
      centralDirectoryHeaders.push(cdChunk);

      currentOffset += localChunk.length;
    }

    const cdTotalSize = centralDirectoryHeaders.reduce((acc, b) => acc + b.length, 0);

    // --- End of Central Directory Record (EOCD) ---
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0); // signature
    eocd.writeUInt16LE(0, 4); // disk number
    eocd.writeUInt16LE(0, 6); // disk number with CD start
    eocd.writeUInt16LE(this.files.length, 8); // total entries on disk
    eocd.writeUInt16LE(this.files.length, 10); // total entries in CD
    eocd.writeUInt32LE(cdTotalSize, 12); // size of CD
    eocd.writeUInt32LE(currentOffset, 16); // offset of CD start
    eocd.writeUInt16LE(0, 20); // comment length

    return Buffer.concat([...localHeadersAndData, ...centralDirectoryHeaders, eocd]);
  }
}
