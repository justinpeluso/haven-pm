"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { saveUploadedFile } from "@/lib/uploads";
import { logActivity, createNotification } from "@/lib/activity";
import { ActivityAction, DocumentType, NotificationType } from "@prisma/client";
import { z } from "zod";

const uploadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum([
    "LEASE", "INSPECTION_REPORT", "NOTICE", "MOVE_IN_CHECKLIST",
    "SIGNED_DOCUMENT", "PHOTO", "SPREADSHEET", "OTHER",
  ]),
  propertyId: z.string().optional(),
  unitId: z.string().optional(),
  tenantId: z.string().optional(),
  prospectId: z.string().optional(),
});

export async function uploadDocument(formData: FormData) {
  const session = await requirePermission("documents:write");

  const file = formData.get("file");
  if (!file || !(file instanceof File) || file.size === 0) {
    return { error: "Please select a file to upload" };
  }

  const raw = {
    name: formData.get("name") as string,
    type: formData.get("type") as string,
    propertyId: (formData.get("propertyId") as string) || undefined,
    unitId: (formData.get("unitId") as string) || undefined,
    tenantId: (formData.get("tenantId") as string) || undefined,
    prospectId: (formData.get("prospectId") as string) || undefined,
  };

  const parsed = uploadSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  let saved;
  try {
    saved = await saveUploadedFile(file);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed" };
  }

  const document = await db.document.create({
    data: {
      name: parsed.data.name,
      fileName: saved.fileName,
      url: saved.url,
      mimeType: saved.mimeType,
      size: saved.size,
      type: parsed.data.type as DocumentType,
      propertyId: parsed.data.propertyId,
      unitId: parsed.data.unitId,
      tenantId: parsed.data.tenantId,
      prospectId: parsed.data.prospectId,
      uploadedById: session.user.id,
    },
  });

  await logActivity({
    action: ActivityAction.CREATED,
    entityType: "Document",
    entityId: document.id,
    userId: session.user.id,
    propertyId: parsed.data.propertyId,
  });

  if (parsed.data.propertyId) {
    const managers = await db.user.findMany({
      where: { role: { in: ["ADMINISTRATOR", "PROPERTY_MANAGER"] }, deletedAt: null },
      select: { id: true },
    });
    for (const manager of managers) {
      if (manager.id !== session.user.id) {
        await createNotification(
          manager.id,
          NotificationType.DOCUMENT_UPLOADED,
          "Document Uploaded",
          parsed.data.name,
          "/documents"
        );
      }
    }
  }

  revalidatePath("/documents");
  return { success: true, id: document.id };
}
