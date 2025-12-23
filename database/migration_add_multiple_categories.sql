-- ============================================
-- 数据库迁移：支持多分类功能
-- 将 category 字段从 VARCHAR(50) 改为 TEXT，支持存储多个分类（逗号分隔）
-- ============================================

-- 步骤1：删除依赖 category 字段的视图
DROP VIEW IF EXISTS scene_statistics_view;

-- 步骤2：修改 scenes 表的 category 字段
ALTER TABLE scenes 
ALTER COLUMN category TYPE TEXT;

-- 步骤3：修改 user_scenes 表的 category 字段
ALTER TABLE user_scenes 
ALTER COLUMN category TYPE TEXT;

-- 步骤4：重新创建视图
CREATE OR REPLACE VIEW scene_statistics_view AS
SELECT 
    s.id,
    s.title,
    s.category,
    s.difficulty,
    s.play_count,
    s.win_count,
    s.win_rate,
    COUNT(DISTINCT gr.user_id) as unique_players,
    AVG(gr.duration_seconds) as avg_duration,
    AVG(gr.final_forgiveness) as avg_final_forgiveness,
    s.created_at,
    s.updated_at
FROM scenes s
LEFT JOIN game_records gr ON s.id = gr.scene_id
WHERE s.status = 'active'
GROUP BY s.id, s.title, s.category, s.difficulty, s.play_count, s.win_count, s.win_rate, s.created_at, s.updated_at;

-- 步骤5：添加注释说明
COMMENT ON COLUMN scenes.category IS '场景分类，支持多个分类用逗号分隔，如"情侣,亲人,职场"';
COMMENT ON COLUMN user_scenes.category IS '场景分类，支持多个分类用逗号分隔，如"情侣,亲人,职场"';

