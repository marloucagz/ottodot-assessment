-- CreateTable
CREATE TABLE "DemoSeedState" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "seeded" BOOLEAN NOT NULL DEFAULT false,
    "seededAt" TIMESTAMP(3),
    "version" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemoSeedState_pkey" PRIMARY KEY ("id")
);
