-- CreateTable
CREATE TABLE `ai_providers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(50) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `description` TEXT NULL,
    `website_url` VARCHAR(255) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    UNIQUE INDEX `ai_providers_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_models` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `provider_id` INTEGER NOT NULL,
    `slug` VARCHAR(100) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `context_window` INTEGER NOT NULL,
    `max_output_tokens` INTEGER NOT NULL,
    `input_cost_per_million` DECIMAL(12, 6) NOT NULL,
    `output_cost_per_million` DECIMAL(12, 6) NOT NULL,
    `supports_temperature` BOOLEAN NOT NULL DEFAULT true,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    UNIQUE INDEX `ai_models_provider_id_slug_key`(`provider_id`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_ai_credentials` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `provider_id` INTEGER NOT NULL,
    `api_key_encrypted` VARCHAR(1024) NOT NULL,
    `api_key_last_four` VARCHAR(4) NOT NULL,
    `label` VARCHAR(80) NULL,
    `last_used_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    UNIQUE INDEX `user_ai_credentials_user_id_provider_id_key`(`user_id`, `provider_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_ai_model_configs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `model_id` INTEGER NOT NULL,
    `max_output_tokens` INTEGER NOT NULL,
    `temperature` DECIMAL(3, 2) NULL,
    `top_p` DECIMAL(3, 2) NULL,
    `frequency_penalty` DECIMAL(3, 2) NULL,
    `presence_penalty` DECIMAL(3, 2) NULL,
    `system_prompt` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    INDEX `user_ai_model_configs_user_id_is_active_idx`(`user_id`, `is_active`),
    UNIQUE INDEX `user_ai_model_configs_user_id_model_id_key`(`user_id`, `model_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ai_models` ADD CONSTRAINT `ai_models_provider_id_fkey` FOREIGN KEY (`provider_id`) REFERENCES `ai_providers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_ai_credentials` ADD CONSTRAINT `user_ai_credentials_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_ai_credentials` ADD CONSTRAINT `user_ai_credentials_provider_id_fkey` FOREIGN KEY (`provider_id`) REFERENCES `ai_providers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_ai_model_configs` ADD CONSTRAINT `user_ai_model_configs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_ai_model_configs` ADD CONSTRAINT `user_ai_model_configs_model_id_fkey` FOREIGN KEY (`model_id`) REFERENCES `ai_models`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
