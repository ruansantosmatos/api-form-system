-- Remove config columns from form_publications
ALTER TABLE `form_publications` DROP COLUMN `expires_at`;
ALTER TABLE `form_publications` DROP COLUMN `max_responses`;
ALTER TABLE `form_publications` DROP COLUMN `allow_anonymous`;

-- CreateTable form_publication_configs
CREATE TABLE `form_publication_configs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `publication_id` INTEGER NOT NULL,
    `expires_at` DATETIME(3) NULL,
    `max_responses` INTEGER NULL,
    `allow_anonymous` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `form_publication_configs_publication_id_key`(`publication_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey with cascade
ALTER TABLE `form_publication_configs` ADD CONSTRAINT `form_publication_configs_publication_id_fkey` FOREIGN KEY (`publication_id`) REFERENCES `form_publications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
