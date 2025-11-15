-- CreateTable
CREATE TABLE "UserSleepTime" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSleepTime_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSleepTime_userId_key" ON "UserSleepTime"("userId");

-- AddForeignKey
ALTER TABLE "UserSleepTime" ADD CONSTRAINT "UserSleepTime_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
