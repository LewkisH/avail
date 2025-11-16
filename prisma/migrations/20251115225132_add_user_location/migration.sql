-- CreateEnum
CREATE TYPE "Location" AS ENUM ('Tartu', 'Tallinn');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "location" "Location";
