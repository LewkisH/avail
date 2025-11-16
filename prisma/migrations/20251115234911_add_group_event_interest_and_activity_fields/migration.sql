/*
  Warnings:

  - You are about to drop the column `suggestedTime` on the `ActivitySuggestion` table. All the data in the column will be lost.
  - Added the required column `endTime` to the `ActivitySuggestion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startTime` to the `ActivitySuggestion` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "ActivitySuggestion_suggestedTime_idx";

-- AlterTable
ALTER TABLE "ActivitySuggestion" DROP COLUMN "suggestedTime",
ADD COLUMN     "category" TEXT,
ADD COLUMN     "endTime" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "startTime" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "GroupEventInterest" (
    "id" TEXT NOT NULL,
    "activitySuggestionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupEventInterest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroupEventInterest_activitySuggestionId_idx" ON "GroupEventInterest"("activitySuggestionId");

-- CreateIndex
CREATE INDEX "GroupEventInterest_userId_idx" ON "GroupEventInterest"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupEventInterest_activitySuggestionId_userId_key" ON "GroupEventInterest"("activitySuggestionId", "userId");

-- CreateIndex
CREATE INDEX "ActivitySuggestion_startTime_idx" ON "ActivitySuggestion"("startTime");

-- AddForeignKey
ALTER TABLE "GroupEventInterest" ADD CONSTRAINT "GroupEventInterest_activitySuggestionId_fkey" FOREIGN KEY ("activitySuggestionId") REFERENCES "ActivitySuggestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
