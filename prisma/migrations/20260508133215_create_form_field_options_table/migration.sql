-- CreateTable
CREATE TABLE `form_field_options` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `field_id` INTEGER NOT NULL,
    `label` VARCHAR(150) NOT NULL,
    `value` VARCHAR(150) NOT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `form_field_options` ADD CONSTRAINT `form_field_options_field_id_fkey` FOREIGN KEY (`field_id`) REFERENCES `form_fields`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
