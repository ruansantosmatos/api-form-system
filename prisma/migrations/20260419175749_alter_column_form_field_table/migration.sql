-- DropForeignKey
ALTER TABLE `form_fields` DROP FOREIGN KEY `form_fields_section_id_fkey`;

-- DropIndex
DROP INDEX `form_fields_section_id_fkey` ON `form_fields`;

-- AlterTable
ALTER TABLE `form_fields` MODIFY `section_id` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `form_fields` ADD CONSTRAINT `form_fields_section_id_fkey` FOREIGN KEY (`section_id`) REFERENCES `form_sections`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
