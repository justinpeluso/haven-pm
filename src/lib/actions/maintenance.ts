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
import { ActivityAction, NotificationType } from "@prisma/client";

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
