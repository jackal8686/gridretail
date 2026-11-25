/**
 * Image Validation and Security Utility
 * Provides magic-byte signature validation and robust SVG sanitization/inspection.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
  detectedMime?: string;
}

/**
 * Validates file buffer against known image magic bytes.
 */
export function validateImageSignature(buffer: Buffer, declaredMimeType: string, filename: string): ValidationResult {
  if (!buffer || buffer.length < 4) {
    return { valid: false, error: "Empty or truncated image payload." };
  }

  // 1. JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, detectedMime: "image/jpeg" };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, detectedMime: "image/png" };
  }

  // 3. WebP: RIFF .... WEBP
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { valid: true, detectedMime: "image/webp" };
  }

  // 4. SVG: XML or <svg text tag
  if (declaredMimeType === "image/svg+xml" || filename.toLowerCase().endsWith(".svg")) {
    const textPrefix = buffer.slice(0, 1024).toString("utf-8").trim().toLowerCase();
    if (textPrefix.includes("<svg") || textPrefix.includes("<?xml")) {
      return { valid: true, detectedMime: "image/svg+xml" };
    }
    return { valid: false, error: "File lacks valid SVG XML header structure." };
  }

  return {
    valid: false,
    error: `File signature mismatch. The file content does not match declared format ${declaredMimeType}.`,
  };
}

/**
 * Inspects SVG content for potential cross-site scripting (XSS), script injection,
 * malicious external references, and dangerous active elements.
 */
export function inspectSvgContent(svgContent: string): { isSafe: boolean; reason?: string } {
  // Comprehensive active vector patterns
  const dangerousPatterns: { pattern: RegExp; description: string }[] = [
    { pattern: /<script\b/i, description: "Inline script tag detected" },
    { pattern: /<\/script>/i, description: "Closing script tag detected" },
    { pattern: /\bon\w+\s*=/i, description: "Event handler attribute detected (e.g., onload, onclick)" },
    { pattern: /javascript\s*:/i, description: "javascript: URI scheme detected" },
    { pattern: /data\s*:\s*text\/html/i, description: "data:text/html payload detected" },
    { pattern: /<iframe\b/i, description: "Embedded iframe element detected" },
    { pattern: /<object\b/i, description: "Embedded object element detected" },
    { pattern: /<embed\b/i, description: "Embedded embed element detected" },
    { pattern: /<foreignObject\b/i, description: "ForeignObject element detected" },
    { pattern: /xlink:href\s*=\s*["']?\s*javascript:/i, description: "XLink javascript URI detected" },
    { pattern: /href\s*=\s*["']?\s*javascript:/i, description: "href javascript URI detected" },
    { pattern: /<meta\b/i, description: "Meta refresh or redirect tag detected" },
    { pattern: /<link\b/i, description: "External stylesheet link tag detected" },
    { pattern: /<!ENTITY/i, description: "XML external entity (XXE) definition detected" },
    { pattern: /<!DOCTYPE[^>]+SYSTEM/i, description: "External SYSTEM DTD detected" },
  ];

  for (const { pattern, description } of dangerousPatterns) {
    if (pattern.test(svgContent)) {
      return { isSafe: false, reason: description };
    }
  }

  return { isSafe: true };
}
