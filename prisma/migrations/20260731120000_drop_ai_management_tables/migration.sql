/*
  Warnings:

  - You are about to drop the `ai_usage_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_ai_model_configs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_ai_credentials` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ai_models` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ai_providers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `has_ai_access` on the `account_settings` table. All the data in the column will be lost.

*/
-- DropTable
DROP TABLE `ai_usage_logs`;

-- DropTable
DROP TABLE `user_ai_model_configs`;

-- DropTable
DROP TABLE `user_ai_credentials`;

-- DropTable
DROP TABLE `ai_models`;

-- DropTable
DROP TABLE `ai_providers`;

-- AlterTable
ALTER TABLE `account_settings` DROP COLUMN `has_ai_access`;
