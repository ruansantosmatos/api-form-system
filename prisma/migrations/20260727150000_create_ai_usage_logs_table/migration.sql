-- CreateTable
CREATE TABLE `ai_usage_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `provider_id` INTEGER NOT NULL,
    `model_id` INTEGER NOT NULL,
    `input_tokens` INTEGER NOT NULL,
    `output_tokens` INTEGER NOT NULL,
    `estimated_cost` DECIMAL(12, 6) NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `error_message` TEXT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ai_usage_logs_user_id_created_at_idx`(`user_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ai_usage_logs` ADD CONSTRAINT `ai_usage_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_usage_logs` ADD CONSTRAINT `ai_usage_logs_provider_id_fkey` FOREIGN KEY (`provider_id`) REFERENCES `ai_providers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_usage_logs` ADD CONSTRAINT `ai_usage_logs_model_id_fkey` FOREIGN KEY (`model_id`) REFERENCES `ai_models`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
