/*
  Warnings:

  - You are about to drop the column `iconUrl` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `iconUrl` on the `Subcategory` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Category" DROP COLUMN "iconUrl";

-- AlterTable
ALTER TABLE "Subcategory" DROP COLUMN "iconUrl";
