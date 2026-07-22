"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth, requirePermission, requireStaff } from "@/lib/auth/session";
import { isStaffRole } from "@/lib/permissions";
import {
  getTenantActiveLeaseLocation,
  getTenantForUser,
} from "@/lib/tenant-scope";
import { maintenanceRequestSchema, maintenanceUpdateSchema } from "@/lib/validations";
import { logActivity, logMaintenanceTimeline, createNotification } from "@/lib/activity";
import { generateRequestNumber } from "@/lib/utils";
import { ActivityAction, MessageStatus, NotificationType, CalendarEventType } from "@prisma/client";
import { saveUploadedFile } from "@/lib/uploads";

export async function createMaintenanceRequest(formData: FormData) {
  const session = await requirePermission("maintenance:write");

  const raw = {
    propertyId: formData.get("propertyId") as string,
    unitId: (formData.get("unitId") as string) || undefined,
    category: formData.get("category") as string,
    priority: (formData.get("priority") as string) || "MEDIUM",
    title: formData.get("title") as string,
    description: formData.get("description") as string,
    tenantNotes: (formData.get("tenantNotes") as string) || undefined,
  };

  const parsed = maintenanceRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  let tenantId: string | undefined;
  let propertyId = parsed.data.propertyId;
  let unitId = parsed.data.unitId;

  if (session.user.role === "TENANT") {
    const tenant = await getTenantForUser(session.user.id);
    if (!tenant) return { error: "Tenant profile not found." };
    const location = await getTenantActiveLeaseLocation(tenant.id);
    if (!location) return { error: "No active lease on file." };
    tenantId = tenant.id;
    // Never trust client-supplied location for tenants.
    propertyId = location.propertyId;
    unitId = location.unitId;
  }

  const request = await db.maintenanceRequest.create({
    data: {
      requestNumber: generateRequestNumber(),
      propertyId,
      unitId,
      category: parsed.data.category,
      priority: parsed.data.priority,
      title: parsed.data.title,
      description: parsed.data.description,
      tenantNotes: parsed.data.tenantNotes,
      tenantId,
      createdById: session.user.id,
    },
  });

  await logMaintenanceTimeline(
    request.id,
    "Request submitted",
    session.user.id,
    undefined,
    undefined,
    parsed.data.description
  );

  await logActivity({
    action: ActivityAction.CREATED,
    entityType: "MaintenanceRequest",
    entityId: request.id,
    userId: session.user.id,
    propertyId,
    maintenanceRequestId: request.id,
  });

  const managers = await db.user.findMany({
    where: { role: { in: ["ADMINISTRATOR", "PROPERTY_MANAGER"] }, isActive: true },
  });
  for (const manager of managers) {
    await createNotification(
      manager.id,
      NotificationType.MAINTENANCE_REQUEST,
      "New Maintenance Request",
      `${parsed.data.title} — ${request.requestNumber}`,
      `/maintenance/${request.id}`
    );
  }

  revalidatePath("/maintenance");
  revalidatePath("/dashboard");
  return { success: true, id: request.id };
}

export async function updateMaintenanceRequest(id: string, formData: FormData) {
  const session = await requireStaff();

  const existing = await db.maintenanceRequest.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) return { error: "Request not found" };

  const raw: Record<string, unknown> = {};
  for (const key of [
    "status",
    "priority",
    "assignedStaffId",
    "vendor",
    "cost",
    "targetCompletion",
    "internalNotes",
  ]) {
    const val = formData.get(key);
    if (val !== null && val !== "") raw[key] = val;
  }

  const parsed = maintenanceUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.targetCompletion) {
    data.targetCompletion = new Date(parsed.data.targetCompletion);
  }
  if (parsed.data.status === "COMPLETED" || parsed.data.status === "CLOSED") {
    data.completedAt = new Date();
  }

  const updated = await db.maintenanceRequest.update({
    where: { id },
    data,
  });

  if (parsed.data.status && parsed.data.status !== existing.status) {
    await logMaintenanceTimeline(
      id,
      "Status changed",
      session.user.id,
      existing.status,
      parsed.data.status
    );
    await logActivity({
      action: ActivityAction.STATUS_CHANGED,
      entityType: "MaintenanceRequest",
      entityId: id,
      userId: session.user.id,
      fieldName: "status",
      oldValue: existing.status,
      newValue: parsed.data.status,
      maintenanceRequestId: id,
      propertyId: existing.propertyId,
    });
  }

  if (parsed.data.priority && parsed.data.priority !== existing.priority) {
    await logMaintenanceTimeline(
      id,
      "Priority changed",
      session.user.id,
      existing.priority,
      parsed.data.priority
    );
  }

  if (parsed.data.assignedStaffId && parsed.data.assignedStaffId !== existing.assignedStaffId) {
    const staff = await db.user.findUnique({ where: { id: parsed.data.assignedStaffId } });
    await logMaintenanceTimeline(
      id,
      `Assigned to ${staff?.name || "staff"}`,
      session.user.id
    );
    if (parsed.data.assignedStaffId) {
      await createNotification(
        parsed.data.assignedStaffId,
        NotificationType.ASSIGNMENT_CHANGED,
        "Work Order Assigned",
        `${existing.title} — ${existing.requestNumber}`,
        `/maintenance/${id}`
      );
    }
    await notifyTenantForRequest(
      existing.tenantId,
      "Maintenance update",
      `Your request ${existing.requestNumber} was assigned to ${staff?.name || "our team"}.`,
      id
    );
  }

  if (parsed.data.status && parsed.data.status !== existing.status) {
    await notifyTenantForRequest(
      existing.tenantId,
      "Maintenance status update",
      `${existing.requestNumber} is now ${parsed.data.status.replace(/_/g, " ").toLowerCase()}.`,
      id
    );
  }

  if (parsed.data.vendor && parsed.data.vendor !== existing.vendor) {
    await logMaintenanceTimeline(
      id,
      `Vendor set to ${parsed.data.vendor}`,
      session.user.id
    );
  }

  revalidatePath(`/maintenance/${id}`);
  revalidatePath("/maintenance");
  return { success: true, id: updated.id };
}

export async function addMaintenanceComment(requestId: string, comment: string) {
  const session = await requireAuth();

  const where: Record<string, unknown> = { id: requestId, deletedAt: null };
  if (!isStaffRole(session.user.role)) {
    const tenant = await getTenantForUser(session.user.id);
    if (!tenant) return { error: "Tenant profile not found." };
    where.tenantId = tenant.id;
  }

  const request = await db.maintenanceRequest.findFirst({
    where,
    select: { id: true },
  });
  if (!request) return { error: "Request not found." };

  await logMaintenanceTimeline(
    requestId,
    "Comment added",
    session.user.id,
    undefined,
    undefined,
    comment
  );

  revalidatePath(`/maintenance/${requestId}`);
  return { success: true };
}

export async function getMaintenanceRequests(filters?: {
  status?: string;
  priority?: string;
  propertyId?: string;
  assignedStaffId?: string;
}) {
  const session = await requirePermission("maintenance:read");

  const where: Record<string, unknown> = { deletedAt: null };

  if (session.user.role === "TENANT") {
    const tenant = await getTenantForUser(session.user.id);
    if (!tenant) return [];
    where.tenantId = tenant.id;
  } else if (session.user.role === "MAINTENANCE_STAFF") {
    where.assignedStaffId = session.user.id;
  }

  if (filters?.status) where.status = filters.status;
  if (filters?.priority) where.priority = filters.priority;
  if (filters?.propertyId) where.propertyId = filters.propertyId;
  if (filters?.assignedStaffId) where.assignedStaffId = filters.assignedStaffId;

  return db.maintenanceRequest.findMany({
    where,
    include: {
      property: true,
      unit: true,
      tenant: { include: { user: { select: { name: true } } } },
      assignedStaff: { select: { name: true } },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });
}

export async function createMaintenanceRequestFromPortalMessage(
  messageId: string,
  formData: FormData
) {
  const session = await requireStaff();
  if (!messageId) return { error: "Missing message id." };

  const threadRoot = await db.message.findFirst({
    where: {
      id: messageId,
      deletedAt: null,
      threadId: null,
      tenantId: { not: null },
      type: { not: null },
    },
    include: {
      tenant: { select: { id: true, userId: true } },
    },
  });

  if (!threadRoot?.tenantId) return { error: "Message not found." };
  if (threadRoot.maintenanceRequestId) {
    return {
      error: "A work order is already linked.",
      id: threadRoot.maintenanceRequestId,
    };
  }

  const location = await getTenantActiveLeaseLocation(threadRoot.tenantId);
  if (!location) {
    return { error: "Tenant has no active lease to attach a work order." };
  }

  const title =
    String(formData.get("title") || "").trim() ||
    threadRoot.subject ||
    "Portal maintenance request";
  const description =
    String(formData.get("description") || "").trim() || threadRoot.body;
  const category = String(formData.get("category") || "GENERAL");
  const priorityRaw = String(
    formData.get("priority") || threadRoot.priority || "MEDIUM"
  );
  const priority =
    priorityRaw === "URGENT" || priorityRaw === "EMERGENCY"
      ? "EMERGENCY"
      : priorityRaw === "HIGH" ||
          priorityRaw === "MEDIUM" ||
          priorityRaw === "LOW"
        ? priorityRaw
        : "MEDIUM";

  const parsed = maintenanceRequestSchema.safeParse({
    propertyId: location.propertyId,
    unitId: location.unitId,
    category,
    priority,
    title,
    description,
    tenantNotes: `Created from portal message ${threadRoot.id}`,
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const request = await db.maintenanceRequest.create({
    data: {
      requestNumber: generateRequestNumber(),
      propertyId: location.propertyId,
      unitId: location.unitId,
      category: parsed.data.category,
      priority: parsed.data.priority,
      title: parsed.data.title,
      description: parsed.data.description,
      tenantNotes: parsed.data.tenantNotes,
      tenantId: threadRoot.tenantId,
      createdById: session.user.id,
    },
  });

  await db.message.update({
    where: { id: threadRoot.id },
    data: {
      maintenanceRequestId: request.id,
      agentWorking: true,
      status: MessageStatus.READ,
      readAt: new Date(),
    },
  });
  await db.message.updateMany({
    where: { threadId: threadRoot.id, deletedAt: null },
    data: { maintenanceRequestId: request.id },
  });

  await logMaintenanceTimeline(
    request.id,
    "Created from tenant portal message",
    session.user.id,
    undefined,
    undefined,
    threadRoot.body.slice(0, 500)
  );

  await logActivity({
    action: ActivityAction.CREATED,
    entityType: "MaintenanceRequest",
    entityId: request.id,
    userId: session.user.id,
    propertyId: location.propertyId,
    tenantId: threadRoot.tenantId,
    maintenanceRequestId: request.id,
    metadata: { fromPortalMessageId: threadRoot.id },
  });

  const managers = await db.user.findMany({
    where: {
      role: { in: ["ADMINISTRATOR", "PROPERTY_MANAGER"] },
      isActive: true,
    },
  });
  for (const manager of managers) {
    await createNotification(
      manager.id,
      NotificationType.MAINTENANCE_REQUEST,
      "Work order from portal message",
      `${parsed.data.title} — ${request.requestNumber}`,
      `/maintenance/${request.id}`
    );
  }

  revalidatePath("/messages");
  revalidatePath("/maintenance");
  revalidatePath(`/maintenance/${request.id}`);
  revalidatePath("/dashboard");
  return {
    success: true,
    id: request.id,
    requestNumber: request.requestNumber,
  };
}

async function notifyTenantForRequest(
  tenantId: string | null | undefined,
  title: string,
  message: string,
  requestId: string
) {
  if (!tenantId) return;
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { userId: true },
  });
  if (!tenant) return;
  await createNotification(
    tenant.userId,
    NotificationType.MAINTENANCE_REQUEST,
    title,
    message,
    `/maintenance/${requestId}`
  );
}

async function assertCanAccessMaintenance(requestId: string, userId: string, role: string) {
  const where: Record<string, unknown> = { id: requestId, deletedAt: null };
  if (!isStaffRole(role as never)) {
    const tenant = await getTenantForUser(userId);
    if (!tenant) return null;
    where.tenantId = tenant.id;
  }
  return db.maintenanceRequest.findFirst({
    where,
    include: {
      tenant: { select: { id: true, userId: true } },
    },
  });
}

export async function uploadMaintenancePhoto(requestId: string, formData: FormData) {
  const session = await requireAuth();
  const request = await assertCanAccessMaintenance(
    requestId,
    session.user.id,
    session.user.role
  );
  if (!request) return { error: "Request not found." };

  const file = formData.get("file");
  if (!file || !(file instanceof File) || file.size === 0) {
    return { error: "Please select a photo." };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "Only image uploads are allowed." };
  }

  const caption = String(formData.get("caption") || "").trim() || undefined;

  let saved;
  try {
    saved = await saveUploadedFile(file);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed" };
  }

  const photo = await db.maintenancePhoto.create({
    data: {
      requestId,
      url: saved.url,
      caption,
      uploadedBy: session.user.id,
    },
  });

  await logMaintenanceTimeline(
    requestId,
    "Photo uploaded",
    session.user.id,
    undefined,
    undefined,
    caption || saved.fileName
  );
  await logActivity({
    action: ActivityAction.PHOTO_UPLOADED,
    entityType: "MaintenanceRequest",
    entityId: requestId,
    userId: session.user.id,
    propertyId: request.propertyId,
    maintenanceRequestId: requestId,
  });

  if (isStaffRole(session.user.role)) {
    await notifyTenantForRequest(
      request.tenantId,
      "Photo added to your request",
      `A new photo was added to ${request.requestNumber}.`,
      requestId
    );
  }

  revalidatePath(`/maintenance/${requestId}`);
  return { success: true, id: photo.id };
}

export async function scheduleMaintenanceVisit(requestId: string, formData: FormData) {
  const session = await requireStaff();
  const request = await db.maintenanceRequest.findFirst({
    where: { id: requestId, deletedAt: null },
    include: { tenant: { select: { userId: true } } },
  });
  if (!request) return { error: "Request not found." };

  const startRaw = String(formData.get("startAt") || "");
  const endRaw = String(formData.get("endAt") || "");
  const notes = String(formData.get("notes") || "").trim() || undefined;
  if (!startRaw || !endRaw) return { error: "Start and end times are required." };

  const startAt = new Date(startRaw);
  const endAt = new Date(endRaw);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    return { error: "Invalid schedule times." };
  }
  if (endAt <= startAt) return { error: "End must be after start." };

  const event = await db.calendarEvent.create({
    data: {
      title: `Maintenance: ${request.title}`,
      type: CalendarEventType.MAINTENANCE,
      propertyId: request.propertyId,
      unitId: request.unitId,
      maintenanceRequestId: request.id,
      assigneeId: request.assignedStaffId || session.user.id,
      createdById: session.user.id,
      startAt,
      endAt,
      notes,
      color: "#f59e0b",
    },
  });

  await db.maintenanceRequest.update({
    where: { id: requestId },
    data: {
      status: "SCHEDULED",
      targetCompletion: endAt,
    },
  });

  await logMaintenanceTimeline(
    requestId,
    "Visit scheduled",
    session.user.id,
    request.status,
    "SCHEDULED",
    `${startAt.toLocaleString()} – ${endAt.toLocaleString()}`
  );

  await notifyTenantForRequest(
    request.tenantId,
    "Maintenance visit scheduled",
    `${request.requestNumber} is scheduled for ${startAt.toLocaleString()}.`,
    requestId
  );

  revalidatePath(`/maintenance/${requestId}`);
  revalidatePath("/maintenance");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  return { success: true, eventId: event.id };
}
