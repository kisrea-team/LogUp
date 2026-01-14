-- Add new columns to projects table (MySQL 8.0+ compatible)
-- Individual ADD COLUMN statements

ALTER TABLE projects ADD COLUMN IF NOT EXISTS `describe` TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS `summar` VARCHAR(255);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS `author` VARCHAR(100);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS `type` VARCHAR(50);

-- Show table structure to verify columns were added
DESCRIBE projects;
