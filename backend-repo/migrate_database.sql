-- MySQL 8.0+ compatible migration script

-- Step 1: Add columns using MySQL 8.0+ syntax
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS `describe` TEXT,
ADD COLUMN IF NOT EXISTS `summar` VARCHAR(255),
ADD COLUMN IF NOT EXISTS `author` VARCHAR(100),
ADD COLUMN IF NOT EXISTS `type` VARCHAR(50);

-- If the above fails, use individual statements
ALTER TABLE projects ADD COLUMN IF NOT EXISTS `describe` TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS `summar` VARCHAR(255);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS `author` VARCHAR(100);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS `type` VARCHAR(50);

-- Step 2: Update existing records with default values
UPDATE projects SET 
    `describe` = CONCAT(name, ' is an excellent project providing powerful features and services.'),
    `summar` = CONCAT(name, ' - Efficient Solution'),
    `author` = 'Development Team',
    `type` = 'Tool'
WHERE `describe` IS NULL OR `summar` IS NULL OR `author` IS NULL OR `type` IS NULL;

-- Step 3: Verify the changes
SELECT 'Total projects:' as info, COUNT(*) as count FROM projects;
SELECT 'Projects with describe:' as info, COUNT(*) as count FROM projects WHERE `describe` IS NOT NULL;
SELECT 'Projects with summar:' as info, COUNT(*) as count FROM projects WHERE `summar` IS NOT NULL;
SELECT 'Projects with author:' as info, COUNT(*) as count FROM projects WHERE `author` IS NOT NULL;
SELECT 'Projects with type:' as info, COUNT(*) as count FROM projects WHERE `type` IS NOT NULL;
