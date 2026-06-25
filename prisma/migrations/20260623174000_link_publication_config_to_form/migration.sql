-- Drop FK and unique index on publication_id
ALTER TABLE `form_publication_configs` DROP FOREIGN KEY `form_publication_configs_publication_id_fkey`;
DROP INDEX `form_publication_configs_publication_id_key` ON `form_publication_configs`;
ALTER TABLE `form_publication_configs` DROP COLUMN `publication_id`;

-- Add form_id column with unique constraint and FK to forms
ALTER TABLE `form_publication_configs` ADD COLUMN `form_id` INTEGER NOT NULL;
CREATE UNIQUE INDEX `form_publication_configs_form_id_key` ON `form_publication_configs`(`form_id`);
ALTER TABLE `form_publication_configs` ADD CONSTRAINT `form_publication_configs_form_id_fkey` FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
