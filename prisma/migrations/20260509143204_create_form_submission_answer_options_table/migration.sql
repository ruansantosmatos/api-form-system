-- CreateTable
CREATE TABLE `form_submission_answer_options` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `answer_id` INTEGER NOT NULL,
    `option_id` INTEGER NOT NULL,

    UNIQUE INDEX `form_submission_answer_options_answer_id_option_id_key`(`answer_id`, `option_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `form_submission_answer_options` ADD CONSTRAINT `form_submission_answer_options_answer_id_fkey` FOREIGN KEY (`answer_id`) REFERENCES `form_submission_answers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `form_submission_answer_options` ADD CONSTRAINT `form_submission_answer_options_option_id_fkey` FOREIGN KEY (`option_id`) REFERENCES `form_field_options`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
