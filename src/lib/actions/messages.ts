"use server";

import { revalidatePath } from "next/cache";
import {
  ActivityAction,
  MessageStatus,
  NotificationType,
  PortalMessagePriority,
  PortalMessageType,
  UserRole,
} from "@prisma/client";
import { db } from "@/lib/db";
import { requirePermission, requireStaff } from "@/lib/auth/session";
import { isStaffRole } from "@/lib/permissions";
import { portalMessageSchema } from "@/lib/validations";
import { createNotification, logActivity } from "@/lib/activity";

const PORTAL_TYPE_LABEL: Record<PortalMessageType, string> = {
  GENERAL: "General",
  BILLING: "Billing",
  MAINTENANCE: "Maintenance",
  LEASE: "Lease",
  NOISE: "Noise / Neighbor",
  OTHER: "Other",
};

const STAFF_INBOX_ROLES: UserRole[] = [
  UserRole.ADMINISTRATOR,
  UserRole.PROPERTY_MANAGER,
  UserRole.LEASING_AGENT,
  UserRole.OFFICE_STAFF,
];

async function findInboxReceiverId(): Promise<string | null> {
  const staff = await db.user.findFirst({
    where: {
      isActive: true,
      deletedAt: null,
      role: { in: STAFF_INBOX_ROLES },
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  return staff?.id ?? null;
}

/** Tenant portal: submit a contact message for staff. */
export async function submitTenantPortalMessage(formData: FormData) {
  const session = await requirePermission("messages:write");
  if (session.user.role !== UserRole.TENANT) {
    return { error: "Only tenants can submit portal messages." };
  }

  const raw = {
    type: String(formData.get("type") || ""),
    priority: String(formData.get("priority") || ""),
    body: String(formData.get("body") || "").trim(),
    callbackPhone: String(formData.get("callbackPhone") || "").trim(),
    subject: String(formData.get("subject") || "").trim() || undefined,
  };

  const parsed = portalMessageSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid message." };
  }

  const tenant = await db.tenant.findUnique({
    where: { userId: session.user.id },
    select: { id: true, phone: true },
  });
  if (!tenant) {
    return { error: "Tenant profile not found." };
  }

  const receiverId = await findInboxReceiverId();
  if (!receiverId) {
    return { error: "No staff inbox is available right now." };
  }

  const type = parsed.data.type as PortalMessageType;
  const priority = parsed.data.priority as PortalMessagePriority;
  const subject =
    parsed.data.subject?.trim() ||
    `${PORTAL_TYPE_LABEL[type]} · ${priority.toLowerCase()} priority`;

  const message = await db.message.create({
    data: {
      senderId: session.user.id,
      receiverId,
      tenantId: tenant.id,
      subject,
      body: parsed.data.body,
      type,
      priority,
      callbackPhone: parsed.data.callbackPhone,
      status: MessageStatus.SENT,
    },
  });

  // Keep tenant phone current when they provide a callback number.
  if (parsed.data.callbackPhone && parsed.data.callbackPhone !== tenant.phone) {
    await db.tenant.update({
      where: { id: tenant.id },
      data: { phone: parsed.data.callbackPhone },
    });
    await db.user.update({
      where: { id: session.user.id },
      data: { phone: parsed.data.callbackPhone },
    });
  }

  const managers = await db.user.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      role: { in: STAFF_INBOX_ROLES },
    },
    select: { id: true },
  });

  for (const manager of managers) {
    await createNotification(
      manager.id,
      NotificationType.MESSAGE_RECEIVED,
      "New tenant message",
      `${subject}`,
      `/messages`
    );
  }

  await logActivity({
    action: ActivityAction.MESSAGE_SENT,
    entityType: "Message",
    entityId: message.id,
    userId: session.user.id,
    tenantId: tenant.id,
    metadata: { type, priority },
  });

  revalidatePath("/messages");
  revalidatePath("/dashboard");
  return { success: true, id: message.id };
}

/** Staff: mark a portal message as read. */
export async function markPortalMessageRead(messageId: string) {
  await requireStaff();
  if (!messageId) return { error: "Missing message id." };

  const result = await db.message.updateMany({
    where: {
      id: messageId,
      tenantId: { not: null },
      deletedAt: null,
    },
    data: {
      status: MessageStatus.READ,
      readAt: new Date(),
    },
  });

  if (!result.count) {
    return { error: "Message not found." };
  }

  revalidatePath("/messages");
  return { success: true };
}

export async function markAllPortalMessagesRead() {
  await requireStaff();
  await db.message.updateMany({
    where: {
      tenantId: { not: null },
      deletedAt: null,
      status: { not: MessageStatus.READ },
    },
    data: {
      status: MessageStatus.READ,
      readAt: new Date(),
    },
  });
  revalidatePath("/messages");
  return { success: true };
}

export async function getPortalInboxMessages() {
  const session = await requirePermission("messages:read");

  if (isStaffRole(session.user.role)) {
    return db.message.findMany({
      where: {
        tenantId: { not: null },
        deletedAt: null,
        type: { not: null },
      },
      include: {
        sender: { select: { id: true, name: true, email: true, phone: true } },
        tenant: {
          select: {
            id: true,
            phone: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }).then((rows) =>
      [...rows].sort((a, b) => {
        const aRead = a.status === MessageStatus.READ ? 1 : 0;
        const bRead = b.status === MessageStatus.READ ? 1 : 0;
        if (aRead !== bRead) return aRead - bRead;
        return b.createdAt.getTime() - a.createdAt.getTime();
      })
    );
  }

  // Tenant: their own submissions
  const tenant = await db.tenant.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!tenant) return [];

  return db.message.findMany({
    where: {
      tenantId: tenant.id,
      senderId: session.user.id,
      deletedAt: null,
      type: { not: null },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function getTenantCallbackPhone(): Promise<string> {
  const session = await requirePermission("messages:read");
  if (session.user.role !== UserRole.TENANT) return "";

  const tenant = await db.tenant.findUnique({
    where: { userId: session.user.id },
    select: { phone: true, user: { select: { phone: true } } },
  });
  return tenant?.phone || tenant?.user.phone || "";
}
