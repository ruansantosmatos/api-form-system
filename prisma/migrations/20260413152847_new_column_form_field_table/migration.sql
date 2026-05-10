/*
  Warnings:

  - Added the required column `type_id` to the `form_fields` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `form_fields` ADD COLUMN `type_id` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `form_fields` ADD CONSTRAINT `form_fields_type_id_fkey` FOREIGN KEY (`type_id`) REFERENCES `field_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
