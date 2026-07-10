import { ActivityAction, Prisma } from "@prisma/client";
import { db } from "./db";

interface LogActivityParams {
  action: ActivityAction;
  entityType: string;
  entityId: string;
  userId?: string;
  propertyId?: string;
  unitId?: string;
  tenantId?: string;
  prospectId?: string;
  maintenanceRequestId?: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  metadata?: Prisma.InputJsonValue;
}

export async function logActivity(params: LogActivityParams) {
  return db.activityLog.create({
    data: {
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      userId: params.userId,
      propertyId: params.propertyId,
      unitId: params.unitId,
      tenantId: params.tenantId,
      prospectId: params.prospectId,
      maintenanceRequestId: params.maintenanceRequestId,
      fieldName: params.fieldName,
      oldValue: params.oldValue,
      newValue: params.newValue,
      metadata: params.metadata ?? undefined,
    },
  });
}

export async function logMaintenanceTimeline(
  requestId: string,
  action: string,
  userId?: string,
  oldValue?: string,
  newValue?: string,
  notes?: string
) {
  return db.maintenanceTimeline.create({
    data: {
      requestId,
      userId,
      action,
      oldValue,
      newValue,
      notes,
    },
  });
}

export async function logProspectTimeline(
  prospectId: string,
  action: string,
  userId?: string,
  oldValue?: string,
  newValue?: string,
  notes?: string
) {
  return db.prospectTimeline.create({
    data: {
      prospectId,
      userId,
      action,
      oldValue,
      newValue,
      notes,
    },
  });
}

export async function createNotification(
  userId: string,
  type: import("@prisma/client").NotificationType,
  title: string,
  message: string,
  link?: string,
  metadata?: Prisma.InputJsonValue
) {
  return db.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      link,
      metadata: metadata ?? undefined,
    },
  });
}
