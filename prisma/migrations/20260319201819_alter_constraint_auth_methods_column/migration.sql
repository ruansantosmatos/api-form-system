/*
  Warnings:

  - A unique constraint covering the columns `[provider,provider_id]` on the table `auth_methods` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `auth_methods_provider_provider_id_key` ON `auth_methods`(`provider`, `provider_id`);
