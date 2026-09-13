import { z } from "zod";

export const cuidSchema = z.string().cuid();

export const activateSchema = z.object({
  active: z.boolean(),
});

export const learningMethodCreateSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
});

export const learningMethodUpdateSchema = learningMethodCreateSchema.partial();

export const levelCreateSchema = z.object({
  learningMethodId: cuidSchema,
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
});

export const levelUpdateSchema = levelCreateSchema
  .omit({ learningMethodId: true })
  .partial()
  .extend({ learningMethodId: cuidSchema.optional() });

export const gradeCreateSchema = z.object({
  levelId: cuidSchema,
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
});

export const gradeUpdateSchema = gradeCreateSchema
  .omit({ levelId: true })
  .partial()
  .extend({ levelId: cuidSchema.optional() });

export const subjectCreateSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
});

export const subjectUpdateSchema = subjectCreateSchema.partial();

export const levelSubjectAttachSchema = z.object({
  levelId: cuidSchema,
  subjectId: cuidSchema,
  active: z.boolean().optional(),
});

export const capabilityCreateSchema = z.object({
  subjectId: cuidSchema.optional().nullable(),
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
});

export const capabilityUpdateSchema = capabilityCreateSchema.partial();

export const trialClassPriceCreateSchema = z.object({
  levelId: cuidSchema,
  gradeId: cuidSchema,
  subjectId: cuidSchema,
  amount: z.union([z.number(), z.string()]).transform((v) => String(v)),
  currency: z.literal("USD").optional(),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
});

export const trialClassPriceUpdateSchema = z.object({
  amount: z
    .union([z.number(), z.string()])
    .transform((v) => String(v))
    .optional(),
  currency: z.literal("USD").optional(),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
});

export const scheduleCreateSchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string().min(1).optional(),
  active: z.boolean().optional(),
});

export const scheduleUpdateSchema = scheduleCreateSchema.partial();

export const slotCreateSchema = z.object({
  scheduleId: cuidSchema.optional().nullable(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  timezone: z.string().min(1).optional(),
  capacity: z.number().int().positive().max(4),
  active: z.boolean().optional(),
});

export const slotUpdateSchema = z.object({
  scheduleId: cuidSchema.optional().nullable(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  timezone: z.string().min(1).optional(),
  capacity: z.number().int().positive().max(4).optional(),
  active: z.boolean().optional(),
});

export const slotCancelSchema = z.object({
  reason: z.string().min(1).optional(),
});

export const bookingStudentSchema = z.object({
  studentId: cuidSchema,
  learningMethodId: cuidSchema,
  levelId: cuidSchema,
  gradeId: cuidSchema,
  subjectIds: z.array(cuidSchema).min(1),
  capabilityIds: z.array(cuidSchema).default([]),
});

export const createBookingSchema = z.object({
  userId: cuidSchema,
  slotId: cuidSchema,
  idempotencyKey: z.string().min(1).optional(),
  students: z.array(bookingStudentSchema).min(1),
});

export const userUpdateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(1).optional().nullable(),
});

export const bookingOwnerSchema = z.object({
  userId: cuidSchema,
});

export const paymentConfirmSchema = z.object({
  userId: cuidSchema,
  paymentId: cuidSchema.optional(),
  bookingId: cuidSchema.optional(),
  amount: z.union([z.number(), z.string()]).optional(),
  currency: z.string().optional(),
}).refine((v) => Boolean(v.paymentId || v.bookingId), {
  message: "paymentId or bookingId is required",
});

export const paymentWebhookSchema = z.object({
  providerEventId: z.string().min(1),
  paymentId: cuidSchema.optional(),
  bookingId: cuidSchema.optional(),
  providerReference: z.string().optional(),
  amount: z.union([z.number(), z.string()]).optional(),
  currency: z.string().optional(),
}).refine((v) => Boolean(v.paymentId || v.bookingId), {
  message: "paymentId or bookingId is required",
});
