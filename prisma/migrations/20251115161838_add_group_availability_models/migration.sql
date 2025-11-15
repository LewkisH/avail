-- CreateTable
CREATE TABLE "GroupAvailability" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupAvailabilityParticipant" (
    "id" TEXT NOT NULL,
    "groupAvailabilityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "GroupAvailabilityParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroupAvailability_groupId_date_idx" ON "GroupAvailability"("groupId", "date");

-- CreateIndex
CREATE INDEX "GroupAvailability_date_idx" ON "GroupAvailability"("date");

-- CreateIndex
CREATE INDEX "GroupAvailabilityParticipant_groupAvailabilityId_idx" ON "GroupAvailabilityParticipant"("groupAvailabilityId");

-- CreateIndex
CREATE INDEX "GroupAvailabilityParticipant_userId_idx" ON "GroupAvailabilityParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupAvailabilityParticipant_groupAvailabilityId_userId_key" ON "GroupAvailabilityParticipant"("groupAvailabilityId", "userId");

-- AddForeignKey
ALTER TABLE "GroupAvailability" ADD CONSTRAINT "GroupAvailability_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupAvailabilityParticipant" ADD CONSTRAINT "GroupAvailabilityParticipant_groupAvailabilityId_fkey" FOREIGN KEY ("groupAvailabilityId") REFERENCES "GroupAvailability"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupAvailabilityParticipant" ADD CONSTRAINT "GroupAvailabilityParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
