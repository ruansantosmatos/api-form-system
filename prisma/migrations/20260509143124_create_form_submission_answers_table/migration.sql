-- CreateTable
CREATE TABLE `form_submission_answers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `submission_id` INTEGER NOT NULL,
    `field_id` INTEGER NOT NULL,
    `value` TEXT NULL,

    UNIQUE INDEX `form_submission_answers_submission_id_field_id_key`(`submission_id`, `field_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `form_submission_answers` ADD CONSTRAINT `form_submission_answers_submission_id_fkey` FOREIGN KEY (`submission_id`) REFERENCES `form_submissions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `form_submission_answers` ADD CONSTRAINT `form_submission_answers_field_id_fkey` FOREIGN KEY (`field_id`) REFERENCES `form_fields`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
