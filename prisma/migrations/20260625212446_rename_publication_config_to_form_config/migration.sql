/*
  Warnings:

  - You are about to drop the `form_publication_configs` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `form_publication_configs` DROP FOREIGN KEY `form_publication_configs_form_id_fkey`;

-- DropTable
DROP TABLE `form_publication_configs`;

-- CreateTable
CREATE TABLE `form_configs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `form_id` INTEGER NOT NULL,
    `starts_at` DATETIME(3) NULL,
    `expires_at` DATETIME(3) NULL,
    `max_responses` INTEGER NULL,
    `allow_anonymous` BOOLEAN NOT NULL DEFAULT false,
    `single_response_per_user` BOOLEAN NOT NULL DEFAULT false,
    `allow_edit_response` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `form_configs_form_id_key`(`form_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `form_configs` ADD CONSTRAINT `form_configs_form_id_fkey` FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
