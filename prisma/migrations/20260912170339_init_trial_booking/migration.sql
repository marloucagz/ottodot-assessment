-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "expiresAt" TIMESTAMP(3),
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Capability" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Capability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Grade" (
    "id" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningMethod" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LevelSubject" (
    "id" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LevelSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Level" (
    "id" TEXT NOT NULL,
    "learningMethodId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Level_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "provider" TEXT,
    "providerReference" TEXT,
    "providerEventId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlotReservation" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlotReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentBookingSubject" (
    "id" TEXT NOT NULL,
    "studentBookingId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "subjectSnapshot" TEXT,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentBookingSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentBooking" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "learningMethodId" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "learningMethodSnapshot" TEXT,
    "levelSnapshot" TEXT,
    "gradeSnapshot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentCapabilitySelection" (
    "id" TEXT NOT NULL,
    "studentBookingId" TEXT NOT NULL,
    "capabilityId" TEXT NOT NULL,
    "capabilitySnapshot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentCapabilitySelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrialClassPrice" (
    "id" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrialClassPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrialClassSchedule" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Singapore',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrialClassSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrialClassSlot" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Singapore',
    "capacity" INTEGER NOT NULL,
    "available" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrialClassSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Booking_reference_key" ON "Booking"("reference");

-- CreateIndex
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "Booking_expiresAt_idx" ON "Booking"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_userId_idempotencyKey_key" ON "Booking"("userId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "Capability_subjectId_idx" ON "Capability"("subjectId");

-- CreateIndex
CREATE INDEX "Capability_active_idx" ON "Capability"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Capability_subjectId_code_key" ON "Capability"("subjectId", "code");

-- CreateIndex
CREATE INDEX "Grade_levelId_idx" ON "Grade"("levelId");

-- CreateIndex
CREATE INDEX "Grade_active_idx" ON "Grade"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Grade_levelId_code_key" ON "Grade"("levelId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "LearningMethod_code_key" ON "LearningMethod"("code");

-- CreateIndex
CREATE INDEX "LearningMethod_active_idx" ON "LearningMethod"("active");

-- CreateIndex
CREATE INDEX "LevelSubject_levelId_idx" ON "LevelSubject"("levelId");

-- CreateIndex
CREATE INDEX "LevelSubject_subjectId_idx" ON "LevelSubject"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "LevelSubject_levelId_subjectId_key" ON "LevelSubject"("levelId", "subjectId");

-- CreateIndex
CREATE INDEX "Level_learningMethodId_idx" ON "Level"("learningMethodId");

-- CreateIndex
CREATE INDEX "Level_active_idx" ON "Level"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Level_learningMethodId_code_key" ON "Level"("learningMethodId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_bookingId_key" ON "Payment"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerReference_key" ON "Payment"("providerReference");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerEventId_key" ON "Payment"("providerEventId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_provider_idx" ON "Payment"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "SlotReservation_bookingId_key" ON "SlotReservation"("bookingId");

-- CreateIndex
CREATE INDEX "SlotReservation_slotId_status_idx" ON "SlotReservation"("slotId", "status");

-- CreateIndex
CREATE INDEX "SlotReservation_status_expiresAt_idx" ON "SlotReservation"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "SlotReservation_expiresAt_idx" ON "SlotReservation"("expiresAt");

-- CreateIndex
CREATE INDEX "StudentBookingSubject_studentBookingId_idx" ON "StudentBookingSubject"("studentBookingId");

-- CreateIndex
CREATE INDEX "StudentBookingSubject_subjectId_idx" ON "StudentBookingSubject"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentBookingSubject_studentBookingId_subjectId_key" ON "StudentBookingSubject"("studentBookingId", "subjectId");

-- CreateIndex
CREATE INDEX "StudentBooking_bookingId_idx" ON "StudentBooking"("bookingId");

-- CreateIndex
CREATE INDEX "StudentBooking_studentId_idx" ON "StudentBooking"("studentId");

-- CreateIndex
CREATE INDEX "StudentBooking_learningMethodId_idx" ON "StudentBooking"("learningMethodId");

-- CreateIndex
CREATE INDEX "StudentBooking_levelId_idx" ON "StudentBooking"("levelId");

-- CreateIndex
CREATE INDEX "StudentBooking_gradeId_idx" ON "StudentBooking"("gradeId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentBooking_bookingId_studentId_key" ON "StudentBooking"("bookingId", "studentId");

-- CreateIndex
CREATE INDEX "StudentCapabilitySelection_studentBookingId_idx" ON "StudentCapabilitySelection"("studentBookingId");

-- CreateIndex
CREATE INDEX "StudentCapabilitySelection_capabilityId_idx" ON "StudentCapabilitySelection"("capabilityId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentCapabilitySelection_studentBookingId_capabilityId_key" ON "StudentCapabilitySelection"("studentBookingId", "capabilityId");

-- CreateIndex
CREATE INDEX "Student_parentId_idx" ON "Student"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_code_key" ON "Subject"("code");

-- CreateIndex
CREATE INDEX "Subject_active_idx" ON "Subject"("active");

-- CreateIndex
CREATE INDEX "TrialClassPrice_levelId_idx" ON "TrialClassPrice"("levelId");

-- CreateIndex
CREATE INDEX "TrialClassPrice_gradeId_idx" ON "TrialClassPrice"("gradeId");

-- CreateIndex
CREATE INDEX "TrialClassPrice_subjectId_idx" ON "TrialClassPrice"("subjectId");

-- CreateIndex
CREATE INDEX "TrialClassPrice_active_idx" ON "TrialClassPrice"("active");

-- CreateIndex
CREATE UNIQUE INDEX "TrialClassPrice_levelId_gradeId_subjectId_key" ON "TrialClassPrice"("levelId", "gradeId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "TrialClassSchedule_code_key" ON "TrialClassSchedule"("code");

-- CreateIndex
CREATE INDEX "TrialClassSchedule_active_idx" ON "TrialClassSchedule"("active");

-- CreateIndex
CREATE INDEX "TrialClassSchedule_dayOfWeek_idx" ON "TrialClassSchedule"("dayOfWeek");

-- CreateIndex
CREATE INDEX "TrialClassSlot_scheduleId_idx" ON "TrialClassSlot"("scheduleId");

-- CreateIndex
CREATE INDEX "TrialClassSlot_startsAt_idx" ON "TrialClassSlot"("startsAt");

-- CreateIndex
CREATE INDEX "TrialClassSlot_endsAt_idx" ON "TrialClassSlot"("endsAt");

-- CreateIndex
CREATE INDEX "TrialClassSlot_active_idx" ON "TrialClassSlot"("active");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Capability" ADD CONSTRAINT "Capability_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LevelSubject" ADD CONSTRAINT "LevelSubject_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LevelSubject" ADD CONSTRAINT "LevelSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Level" ADD CONSTRAINT "Level_learningMethodId_fkey" FOREIGN KEY ("learningMethodId") REFERENCES "LearningMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotReservation" ADD CONSTRAINT "SlotReservation_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "TrialClassSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotReservation" ADD CONSTRAINT "SlotReservation_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentBookingSubject" ADD CONSTRAINT "StudentBookingSubject_studentBookingId_fkey" FOREIGN KEY ("studentBookingId") REFERENCES "StudentBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentBookingSubject" ADD CONSTRAINT "StudentBookingSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentBooking" ADD CONSTRAINT "StudentBooking_learningMethodId_fkey" FOREIGN KEY ("learningMethodId") REFERENCES "LearningMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentBooking" ADD CONSTRAINT "StudentBooking_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentBooking" ADD CONSTRAINT "StudentBooking_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentBooking" ADD CONSTRAINT "StudentBooking_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentBooking" ADD CONSTRAINT "StudentBooking_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentCapabilitySelection" ADD CONSTRAINT "StudentCapabilitySelection_studentBookingId_fkey" FOREIGN KEY ("studentBookingId") REFERENCES "StudentBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentCapabilitySelection" ADD CONSTRAINT "StudentCapabilitySelection_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "Capability"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrialClassPrice" ADD CONSTRAINT "TrialClassPrice_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrialClassPrice" ADD CONSTRAINT "TrialClassPrice_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrialClassPrice" ADD CONSTRAINT "TrialClassPrice_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrialClassSlot" ADD CONSTRAINT "TrialClassSlot_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "TrialClassSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
