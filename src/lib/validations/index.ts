import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const propertySchema = z.object({
  name: z.string().min(1, "Name is required"),
  addressLine1: z.string().min(1, "Address is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(2, "State is required"),
  zipCode: z.string().min(5, "ZIP code is required"),
  status: z.enum(["ACTIVE", "INACTIVE", "UNDER_RENOVATION", "FOR_SALE"]),
  ownerId: z.string().optional(),
  squareFootage: z.coerce.number().optional(),
  bedrooms: z.coerce.number().optional(),
  bathrooms: z.coerce.number().optional(),
  rentAmount: z.coerce.number().optional(),
  securityDeposit: z.coerce.number().optional(),
  utilities: z.array(z.string()).optional(),
  appliances: z.array(z.string()).optional(),
  amenities: z.array(z.string()).optional(),
  parking: z.string().optional(),
  internalNotes: z.string().optional(),
});

export const unitSchema = z.object({
  propertyId: z.string().min(1),
  unitNumber: z.string().min(1, "Unit number is required"),
  status: z.enum(["AVAILABLE", "OCCUPIED", "NOTICE_GIVEN", "VACANT", "MAINTENANCE_HOLD"]),
  squareFootage: z.coerce.number().optional(),
  bedrooms: z.coerce.number().optional(),
  bathrooms: z.coerce.number().optional(),
  rentAmount: z.coerce.number().min(0),
  depositAmount: z.coerce.number().optional(),
});

export const maintenanceRequestSchema = z.object({
  propertyId: z.string().min(1),
  unitId: z.string().optional(),
  category: z.enum([
    "PLUMBING", "ELECTRICAL", "HVAC", "APPLIANCE", "STRUCTURAL",
    "PEST_CONTROL", "LANDSCAPING", "GENERAL", "OTHER",
  ]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "EMERGENCY"]).default("MEDIUM"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  tenantNotes: z.string().optional(),
});

export const maintenanceUpdateSchema = z.object({
  status: z.enum([
    "SUBMITTED", "ASSIGNED", "SCHEDULED", "IN_PROGRESS",
    "WAITING_ON_PARTS", "COMPLETED", "CLOSED",
  ]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "EMERGENCY"]).optional(),
  assignedStaffId: z.string().optional().nullable(),
  vendor: z.string().optional(),
  cost: z.coerce.number().optional(),
  targetCompletion: z.string().optional(),
  internalNotes: z.string().optional(),
});

export const prospectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  phone: z.string().optional(),
  leadSource: z.string().optional(),
  budget: z.coerce.number().optional(),
  moveDate: z.string().optional(),
  pets: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum([
    "NEW", "CONTACTED", "SHOWING_SCHEDULED", "APPLICATION_SENT",
    "APPLICATION_RECEIVED", "APPROVED", "DENIED", "LEASED", "ARCHIVED",
  ]).optional(),
  propertyIds: z.array(z.string()).optional(),
});

export const showingSchema = z.object({
  prospectId: z.string().min(1),
  propertyId: z.string().optional(),
  unitId: z.string().optional(),
  agentId: z.string().min(1),
  scheduledAt: z.string().min(1),
  duration: z.coerce.number().default(30),
  notes: z.string().optional(),
});

export const calendarEventSchema = z.object({
  title: z.string().min(1),
  type: z.enum(["SHOWING", "MAINTENANCE", "INSPECTION", "MOVE_IN", "MOVE_OUT", "STAFF_EVENT", "OTHER"]),
  propertyId: z.string().optional(),
  unitId: z.string().optional(),
  assigneeId: z.string().optional(),
  startAt: z.string().min(1),
  endAt: z.string().min(1),
  allDay: z.boolean().default(false),
  color: z.string().optional(),
  notes: z.string().optional(),
  recurrence: z.enum(["NONE", "DAILY", "WEEKLY", "MONTHLY"]).default("NONE"),
});

export const noteSchema = z.object({
  content: z.string().min(1, "Note content is required"),
  propertyId: z.string().optional(),
  unitId: z.string().optional(),
  tenantId: z.string().optional(),
  prospectId: z.string().optional(),
  maintenanceRequestId: z.string().optional(),
  mentions: z.array(z.string()).optional(),
});

export const messageSchema = z.object({
  receiverId: z.string().min(1),
  subject: z.string().optional(),
  body: z.string().min(1, "Message is required"),
  tenantId: z.string().optional(),
});

export const portalMessageSchema = z.object({
  type: z.enum(["GENERAL", "BILLING", "MAINTENANCE", "LEASE", "NOISE", "OTHER"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  body: z.string().min(1, "Description is required").max(5000),
  callbackPhone: z
    .string()
    .min(7, "Phone number is required")
    .max(40),
  subject: z.string().max(200).optional(),
});

export type PortalMessageInput = z.infer<typeof portalMessageSchema>;

export const chargeSchema = z.object({
  leaseId: z.string().min(1),
  type: z.enum(["RENT", "LATE_FEE", "SECURITY_DEPOSIT", "OTHER"]),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  dueDate: z.string().min(1, "Due date is required"),
  description: z.string().max(500).optional(),
});

export const paymentSchema = z.object({
  leaseId: z.string().min(1),
  chargeId: z.string().optional(),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  method: z.enum(["CASH", "CHECK", "ACH", "CARD", "STRIPE", "OTHER"]),
  paidAt: z.string().optional(),
  reference: z.string().max(120).optional(),
  notes: z.string().max(1000).optional(),
});

export const searchSchema = z.object({
  q: z.string().min(1),
  types: z.array(z.string()).optional(),
  limit: z.coerce.number().default(20),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type PropertyInput = z.infer<typeof propertySchema>;
export type UnitInput = z.infer<typeof unitSchema>;
export type MaintenanceRequestInput = z.infer<typeof maintenanceRequestSchema>;
export type ProspectInput = z.infer<typeof prospectSchema>;
export type CalendarEventInput = z.infer<typeof calendarEventSchema>;
