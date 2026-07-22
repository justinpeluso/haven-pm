import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { put, del } from "@vercel/blob";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export function blobEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function saveUploadedFile(file: File): Promise<{
  fileName: string;
  url: string;
  mimeType: string;
  size: number;
  storage: "blob" | "local";
}> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File size exceeds 10MB limit");
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error("File type not allowed");
  }

  const ext = path.extname(file.name) || "";
  const objectName = `${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  if (blobEnabled()) {
    // Private blobs are only readable with the token — serve via auth’d download route.
    const blob = await put(`haven-pm/${objectName}`, buffer, {
      access: "private",
      contentType: file.type || "application/octet-stream",
      addRandomSuffix: false,
    });
    return {
      fileName: file.name,
      url: blob.url,
      mimeType: file.type,
      size: file.size,
      storage: "blob",
    };
  }

  const uploadPath = path.join(process.cwd(), UPLOAD_DIR, objectName);
  await mkdir(path.join(process.cwd(), UPLOAD_DIR), { recursive: true });
  await writeFile(uploadPath, buffer);

  return {
    fileName: file.name,
    url: `/api/uploads/${objectName}`,
    mimeType: file.type,
    size: file.size,
    storage: "local",
  };
}

export function isLocalUploadUrl(url: string) {
  return url.startsWith("/api/uploads/");
}

export function isBlobUrl(url: string) {
  return /^https?:\/\//i.test(url) && url.includes("blob.vercel-storage.com");
}

export async function readLocalUpload(filename: string): Promise<Buffer> {
  const safeName = path.basename(filename);
  const filePath = path.join(process.cwd(), UPLOAD_DIR, safeName);
  return readFile(filePath);
}

export async function deleteStoredFile(url: string) {
  if (isBlobUrl(url) && blobEnabled()) {
    try {
      await del(url);
    } catch {
      // best-effort cleanup
    }
  }
}
