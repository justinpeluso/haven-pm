import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

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

export async function saveUploadedFile(file: File): Promise<{
  fileName: string;
  url: string;
  mimeType: string;
  size: number;
}> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File size exceeds 10MB limit");
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error("File type not allowed");
  }

  const ext = path.extname(file.name) || "";
  const fileName = `${randomUUID()}${ext}`;
  const uploadPath = path.join(process.cwd(), UPLOAD_DIR, fileName);

  await mkdir(path.join(process.cwd(), UPLOAD_DIR), { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(uploadPath, buffer);

  return {
    fileName: file.name,
    url: `/api/uploads/${fileName}`,
    mimeType: file.type,
    size: file.size,
  };
}
