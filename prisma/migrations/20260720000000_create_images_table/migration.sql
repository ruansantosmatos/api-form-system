-- CreateTable
CREATE TABLE `images` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `field_id` INTEGER NULL,
    `section_id` INTEGER NULL,
    `key` VARCHAR(512) NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL,
    `size` INTEGER NOT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    UNIQUE INDEX `images_field_id_key`(`field_id`),
    UNIQUE INDEX `images_section_id_key`(`section_id`),
    UNIQUE INDEX `images_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `images` ADD CONSTRAINT `images_field_id_fkey` FOREIGN KEY (`field_id`) REFERENCES `form_fields`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `images` ADD CONSTRAINT `images_section_id_fkey` FOREIGN KEY (`section_id`) REFERENCES `form_sections`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
