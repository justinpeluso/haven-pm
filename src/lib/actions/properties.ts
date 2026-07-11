"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { propertySchema, unitSchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity";
import { ActivityAction } from "@prisma/client";

export async function createProperty(formData: FormData) {
  await requirePermission("properties:write");

  const raw: Record<string, unknown> = {};
  for (const key of [
    "name", "addressLine1", "addressLine2", "city", "state", "zipCode",
    "status", "ownerId", "squareFootage", "bedrooms", "bathrooms",
    "rentAmount", "securityDeposit", "parking", "internalNotes",
  ]) {
    const val = formData.get(key);
    if (val !== null && val !== "") raw[key] = val;
  }

  const parsed = propertySchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const session = await requirePermission("properties:write");

  const property = await db.property.create({ data: parsed.data });

  await logActivity({
    action: ActivityAction.CREATED,
    entityType: "Property",
    entityId: property.id,
    userId: session.user.id,
    propertyId: property.id,
  });

  revalidatePath("/properties");
  return { success: true, id: property.id };
}

export async function updateProperty(id: string, formData: FormData) {
  const session = await requirePermission("properties:write");

  const existing = await db.property.findUnique({ where: { id } });
  if (!existing) return { error: "Property not found" };

  const raw: Record<string, unknown> = {};
  for (const key of [
    "name", "addressLine1", "addressLine2", "city", "state", "zipCode",
    "status", "ownerId", "squareFootage", "bedrooms", "bathrooms",
    "rentAmount", "securityDeposit", "parking", "internalNotes",
  ]) {
    const val = formData.get(key);
    if (val !== null && val !== "") raw[key] = val;
  }

  const parsed = propertySchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const property = await db.property.update({
    where: { id },
    data: parsed.data,
  });

  await logActivity({
    action: ActivityAction.UPDATED,
    entityType: "Property",
    entityId: property.id,
    userId: session.user.id,
    propertyId: property.id,
  });

  revalidatePath(`/properties/${id}`);
  revalidatePath("/properties");
  return { success: true, id: property.id };
}

export async function updateUnit(unitId: string, formData: FormData) {
  const session = await requirePermission("units:write");

  const existing = await db.unit.findUnique({ where: { id: unitId } });
  if (!existing) return { error: "Unit not found" };

  const raw: Record<string, unknown> = { propertyId: existing.propertyId };
  for (const key of [
    "unitNumber", "status", "squareFootage",
    "bedrooms", "bathrooms", "rentAmount", "depositAmount",
  ]) {
    const val = formData.get(key);
    if (val !== null && val !== "") raw[key] = val;
  }

  const parsed = unitSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { propertyId, ...unitData } = parsed.data;
  const unit = await db.unit.update({
    where: { id: unitId },
    data: unitData,
  });

  await logActivity({
    action: ActivityAction.UPDATED,
    entityType: "Unit",
    entityId: unit.id,
    userId: session.user.id,
    propertyId,
    unitId: unit.id,
  });

  revalidatePath(`/properties/${propertyId}`);
  revalidatePath("/properties");
  return { success: true, id: unit.id };
}

export async function createUnit(formData: FormData) {
  await requirePermission("units:write");

  const raw: Record<string, unknown> = {};
  for (const key of [
    "propertyId", "unitNumber", "status", "squareFootage",
    "bedrooms", "bathrooms", "rentAmount", "depositAmount",
  ]) {
    const val = formData.get(key);
    if (val !== null && val !== "") raw[key] = val;
  }

  const parsed = unitSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const session = await requirePermission("units:write");

  const unit = await db.unit.create({ data: parsed.data });

  await logActivity({
    action: ActivityAction.CREATED,
    entityType: "Unit",
    entityId: unit.id,
    userId: session.user.id,
    propertyId: parsed.data.propertyId,
    unitId: unit.id,
  });

  revalidatePath(`/properties/${parsed.data.propertyId}`);
  revalidatePath("/properties");
  return { success: true, id: unit.id };
}

export async function getProperties() {
  await requirePermission("properties:read");

  return db.property.findMany({
    where: { deletedAt: null },
    include: {
      owner: true,
      units: {
        where: { deletedAt: null },
        include: {
          leases: {
            where: { status: "ACTIVE" },
            include: {
              tenant: {
                include: { user: { select: { name: true, email: true } } },
              },
            },
            take: 1,
          },
        },
      },
      _count: {
        select: {
          maintenanceRequests: {
            where: { status: { notIn: ["COMPLETED", "CLOSED"] } },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function getProperty(id: string) {
  await requirePermission("properties:read");

  return db.property.findUnique({
    where: { id },
    include: {
      owner: true,
      units: {
        where: { deletedAt: null },
        include: {
          leases: {
            where: { status: "ACTIVE" },
            include: {
              tenant: {
                include: {
                  user: { select: { name: true, email: true, phone: true } },
                },
              },
            },
          },
        },
      },
      photos: { orderBy: { sortOrder: "asc" } },
      documents: { where: { deletedAt: null } },
      maintenanceRequests: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      activityLogs: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { user: { select: { name: true } } },
      },
      notes: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        include: { author: { select: { name: true } } },
      },
    },
  });
}
