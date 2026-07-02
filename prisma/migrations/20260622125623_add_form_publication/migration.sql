-- AlterTable: enforce 1-1 between Form and FormPublication
CREATE UNIQUE INDEX `form_publications_form_id_key` ON `form_publications`(`form_id`);
