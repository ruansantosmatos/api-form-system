-- AlterTable
ALTER TABLE `form_fields` ADD COLUMN `form_id` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `form_fields` ADD CONSTRAINT `form_fields_form_id_fkey` FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
