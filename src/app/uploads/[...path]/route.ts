import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    if (!pathSegments || pathSegments.length === 0) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const baseDir = path.join(process.cwd(), "public", "uploads");
    const safeSubPath = path.normalize(pathSegments.join("/")).replace(/^(\.\.[\/\\])+/, "");
    const fullPath = path.resolve(baseDir, safeSubPath);

    // Prevent directory traversal attacks (case-insensitive for Windows compatibility)
    if (!fullPath.toLowerCase().startsWith(baseDir.toLowerCase())) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    try {
      const fileBuffer = await fs.readFile(fullPath);
      const ext = path.extname(fullPath).toLowerCase();
      const contentType = MIME_MAP[ext] || "application/octet-stream";

      return new NextResponse(new Uint8Array(fileBuffer), {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch {
      return new NextResponse("File Not Found", { status: 404 });
    }
  } catch (err) {
    console.error("Error serving upload:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
