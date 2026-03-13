/*
  Warnings:

  - You are about to drop the column `createdAt` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `ipAddress` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `isValid` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `refreshToken` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `userAgent` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `sessions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[refresh_token_hash]` on the table `sessions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `absolutely_expires_at` to the `sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `refresh_token_expires_at` to the `sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `refresh_token_hash` to the `sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `sessions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `sessions` DROP FOREIGN KEY `sessions_userId_fkey`;

-- DropIndex
DROP INDEX `sessions_refreshToken_key` ON `sessions`;

-- DropIndex
DROP INDEX `sessions_userId_fkey` ON `sessions`;

-- AlterTable
ALTER TABLE `sessions` DROP COLUMN `createdAt`,
    DROP COLUMN `expiresAt`,
    DROP COLUMN `ipAddress`,
    DROP COLUMN `isValid`,
    DROP COLUMN `refreshToken`,
    DROP COLUMN `updatedAt`,
    DROP COLUMN `userAgent`,
    DROP COLUMN `userId`,
    ADD COLUMN `absolutely_expires_at` DATETIME(3) NOT NULL,
    ADD COLUMN `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `ip_address` VARCHAR(191) NULL,
    ADD COLUMN `is_valid` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `refresh_token_expires_at` DATETIME(3) NOT NULL,
    ADD COLUMN `refresh_token_hash` VARCHAR(255) NOT NULL,
    ADD COLUMN `rotation_counter` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `updated_at` DATETIME(3) NULL,
    ADD COLUMN `user_agent` VARCHAR(191) NULL,
    ADD COLUMN `user_id` INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `sessions_refresh_token_hash_key` ON `sessions`(`refresh_token_hash`);

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
