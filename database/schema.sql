-- ============================================
-- 哄一哄他（她）微信小程序 - Supabase 数据库表结构
-- ============================================

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. 场景表 (scenes)
-- 存储所有可用的游戏场景
-- ============================================
CREATE TABLE IF NOT EXISTS scenes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    role VARCHAR(50) NOT NULL,
    role_gender VARCHAR(10) DEFAULT '其他',
    angry_reason TEXT NOT NULL,
    initial_forgiveness INTEGER DEFAULT 20,
    max_interactions INTEGER DEFAULT 10,
    difficulty VARCHAR(10) DEFAULT '中',
    
    -- 统计数据
    play_count INTEGER DEFAULT 0,
    win_count INTEGER DEFAULT 0,
    win_rate DECIMAL(5, 2) DEFAULT 0.00,
    
    -- 状态和元数据
    status VARCHAR(20) DEFAULT 'active',
    is_featured BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_scenes_category ON scenes(category);
CREATE INDEX idx_scenes_status ON scenes(status);
CREATE INDEX idx_scenes_difficulty ON scenes(difficulty);
CREATE INDEX idx_scenes_play_count ON scenes(play_count DESC);
CREATE INDEX idx_scenes_win_rate ON scenes(win_rate DESC);
CREATE INDEX idx_scenes_created_at ON scenes(created_at DESC);

-- 添加注释
COMMENT ON TABLE scenes IS '游戏场景表';
COMMENT ON COLUMN scenes.id IS '场景唯一标识';
COMMENT ON COLUMN scenes.title IS '场景标题，如"你回家太晚，女朋友很生气"';
COMMENT ON COLUMN scenes.description IS '场景简短描述';
COMMENT ON COLUMN scenes.category IS '场景分类：情侣、亲人、职场、奇怪、角色扮演等';
COMMENT ON COLUMN scenes.role IS 'AI对象角色名称：女朋友、男朋友、妈妈、吸血鬼等';
COMMENT ON COLUMN scenes.role_gender IS '角色性别：男、女、其他';
COMMENT ON COLUMN scenes.angry_reason IS '生气理由';
COMMENT ON COLUMN scenes.initial_forgiveness IS '游戏开始时的初始原谅值，范围通常20-30';
COMMENT ON COLUMN scenes.max_interactions IS '允许的最大互动次数，超过则失败';
COMMENT ON COLUMN scenes.difficulty IS '难度：易、中、难';
COMMENT ON COLUMN scenes.play_count IS '播放次数';
COMMENT ON COLUMN scenes.win_count IS '成功次数';
COMMENT ON COLUMN scenes.win_rate IS '胜率（百分比）= (win_count / play_count) * 100';
COMMENT ON COLUMN scenes.status IS '状态：active（上线）、inactive（下线）、pending（待审核）';
COMMENT ON COLUMN scenes.is_featured IS '是否精选';
COMMENT ON COLUMN scenes.sort_order IS '排序权重';
COMMENT ON COLUMN scenes.created_at IS '创建时间';
COMMENT ON COLUMN scenes.updated_at IS '更新时间';

-- ============================================
-- 2. 用户提交场景表 (user_scenes)
-- 存储用户提交的自定义场景，等待审核
-- ============================================
CREATE TABLE IF NOT EXISTS user_scenes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(100),
    user_nickname VARCHAR(100),
    
    -- 场景信息
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    role VARCHAR(50) NOT NULL,
    role_gender VARCHAR(10) DEFAULT '其他',
    angry_reason TEXT NOT NULL,
    expected_difficulty VARCHAR(10) DEFAULT '中',
    
    -- 审核状态
    status VARCHAR(20) DEFAULT 'pending',
    review_comment TEXT,
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    
    -- 关联到正式场景（审核通过后）
    scene_id UUID REFERENCES scenes(id) ON DELETE SET NULL,
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_user_scenes_user_id ON user_scenes(user_id);
CREATE INDEX idx_user_scenes_status ON user_scenes(status);
CREATE INDEX idx_user_scenes_created_at ON user_scenes(created_at DESC);

-- 添加注释
COMMENT ON TABLE user_scenes IS '用户提交的自定义场景表';
COMMENT ON COLUMN user_scenes.id IS '提交记录唯一标识';
COMMENT ON COLUMN user_scenes.user_id IS '用户唯一标识，可以是微信openid或其他标识';
COMMENT ON COLUMN user_scenes.user_nickname IS '用户昵称';
COMMENT ON COLUMN user_scenes.title IS '场景标题';
COMMENT ON COLUMN user_scenes.description IS '场景描述';
COMMENT ON COLUMN user_scenes.category IS '场景分类';
COMMENT ON COLUMN user_scenes.role IS '对象角色';
COMMENT ON COLUMN user_scenes.role_gender IS '角色性别：男、女、其他';
COMMENT ON COLUMN user_scenes.angry_reason IS '生气理由';
COMMENT ON COLUMN user_scenes.expected_difficulty IS '预期难度：易、中、难';
COMMENT ON COLUMN user_scenes.status IS '审核状态：pending（待审核）、approved（已通过）、rejected（已拒绝）';
COMMENT ON COLUMN user_scenes.review_comment IS '审核备注';
COMMENT ON COLUMN user_scenes.reviewed_by IS '审核人';
COMMENT ON COLUMN user_scenes.reviewed_at IS '审核时间';
COMMENT ON COLUMN user_scenes.scene_id IS '审核通过后关联的场景ID';
COMMENT ON COLUMN user_scenes.created_at IS '提交时间';
COMMENT ON COLUMN user_scenes.updated_at IS '更新时间';

-- ============================================
-- 3. 游戏记录表 (game_records)
-- 存储用户的游戏记录和战绩
-- ============================================
CREATE TABLE IF NOT EXISTS game_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(100) NOT NULL,
    scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    
    -- 游戏结果
    is_success BOOLEAN DEFAULT FALSE,
    final_forgiveness INTEGER,
    interaction_count INTEGER DEFAULT 0,
    max_interactions INTEGER,
    
    -- 游戏过程摘要（不存储详细聊天记录，保护隐私）
    start_forgiveness INTEGER,
    forgiveness_changes TEXT,
    
    -- 时间信息
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_game_records_user_id ON game_records(user_id);
CREATE INDEX idx_game_records_scene_id ON game_records(scene_id);
CREATE INDEX idx_game_records_is_success ON game_records(is_success);
CREATE INDEX idx_game_records_created_at ON game_records(created_at DESC);
CREATE INDEX idx_game_records_user_scene ON game_records(user_id, scene_id);

-- 添加注释
COMMENT ON TABLE game_records IS '用户游戏记录表';
COMMENT ON COLUMN game_records.id IS '游戏记录唯一标识';
COMMENT ON COLUMN game_records.user_id IS '用户唯一标识（微信openid）';
COMMENT ON COLUMN game_records.scene_id IS '场景ID';
COMMENT ON COLUMN game_records.is_success IS '是否成功哄好';
COMMENT ON COLUMN game_records.final_forgiveness IS '最终原谅值';
COMMENT ON COLUMN game_records.interaction_count IS '实际互动次数';
COMMENT ON COLUMN game_records.max_interactions IS '最大允许互动次数';
COMMENT ON COLUMN game_records.start_forgiveness IS '开始时的原谅值';
COMMENT ON COLUMN game_records.forgiveness_changes IS '原谅值变化记录，JSON格式，如：[{"round":1,"change":10,"final":30}]';
COMMENT ON COLUMN game_records.started_at IS '游戏开始时间';
COMMENT ON COLUMN game_records.ended_at IS '游戏结束时间';
COMMENT ON COLUMN game_records.duration_seconds IS '游戏持续时间，单位秒';
COMMENT ON COLUMN game_records.created_at IS '记录创建时间';

-- ============================================
-- 4. 触发器：自动更新场景统计数据
-- 当游戏记录插入时，自动更新场景的播放次数和胜率
-- ============================================
CREATE OR REPLACE FUNCTION update_scene_statistics()
RETURNS TRIGGER AS $$
BEGIN
    -- 更新场景的播放次数和成功次数
    UPDATE scenes
    SET 
        play_count = play_count + 1,
        win_count = CASE WHEN NEW.is_success THEN win_count + 1 ELSE win_count END,
        win_rate = CASE 
            WHEN play_count + 1 > 0 THEN 
                ROUND((CASE WHEN NEW.is_success THEN win_count + 1 ELSE win_count END)::DECIMAL / (play_count + 1) * 100, 2)
            ELSE 0.00
        END,
        updated_at = NOW()
    WHERE id = NEW.scene_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_scene_statistics
AFTER INSERT ON game_records
FOR EACH ROW
EXECUTE FUNCTION update_scene_statistics();

-- ============================================
-- 5. 触发器：自动更新 updated_at 时间戳
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为 scenes 表添加 updated_at 触发器
CREATE TRIGGER trigger_scenes_updated_at
BEFORE UPDATE ON scenes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 为 user_scenes 表添加 updated_at 触发器
CREATE TRIGGER trigger_user_scenes_updated_at
BEFORE UPDATE ON user_scenes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. 视图：场景统计视图（可选）
-- ============================================
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

-- ============================================
-- 7. 初始化数据：插入示例场景
-- ============================================
INSERT INTO scenes (title, description, category, role, role_gender, angry_reason, initial_forgiveness, max_interactions, difficulty, status) VALUES
('女朋友问她的闺蜜谁好看？你回答后，她生气了。', '经典送命题，考验情商的时候到了', '情侣', '女朋友', '女', '你当着她的面说她闺蜜更好看，她非常生气', 20, 10, '中', 'active'),
('玩碧蓝航线喜欢里面的舰娘，女朋友吃醋了', '二次元与现实的碰撞', '情侣', '女朋友', '女', '你沉迷游戏中的角色，忽略了她的感受', 25, 10, '中', 'active'),
('对方不喜欢你的某个异性朋友', '人际关系处理难题', '情侣', '女朋友', '女', '你和异性朋友走得太近，她很不开心', 20, 12, '难', 'active'),
('你购买了高价的夜视仪，对象很生气', '奇怪的消费场景', '奇怪', '对象', '其他', '你花了大价钱买了夜视仪，她觉得你乱花钱', 30, 8, '易', 'active'),
('回家太晚，女朋友很生气', '常见的生活场景', '情侣', '女朋友', '女', '你回家太晚，没有提前告诉她', 25, 10, '中', 'active'),
('妈妈因为你熬夜打游戏生气了', '家庭关系场景', '亲人', '妈妈', '女', '你熬夜打游戏，妈妈担心你的健康', 30, 8, '易', 'active'),
('老板因为你迟到生气了', '职场场景', '职场', '老板', '男', '你上班迟到，影响了工作', 20, 10, '中', 'active'),
('吸血鬼因为你忘记带血包生气了', '奇幻角色场景', '角色', '吸血鬼', '其他', '你忘记给吸血鬼朋友带血包，他很生气', 25, 10, '中', 'active')
ON CONFLICT DO NOTHING;

-- ============================================
-- 8. Row Level Security (RLS) 策略
-- 根据实际需求配置行级安全策略
-- ============================================

-- 启用 RLS
ALTER TABLE scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_records ENABLE ROW LEVEL SECURITY;

-- scenes 表：所有人可以读取，只有管理员可以修改
CREATE POLICY "Scenes are viewable by everyone" ON scenes
    FOR SELECT USING (true);

CREATE POLICY "Scenes are insertable by authenticated users only" ON scenes
    FOR INSERT WITH CHECK (false); -- 需要通过后台管理

CREATE POLICY "Scenes are updatable by authenticated users only" ON scenes
    FOR UPDATE USING (false); -- 需要通过后台管理

-- user_scenes 表：用户可以提交和查看自己的，管理员可以查看所有
CREATE POLICY "Users can view their own submissions" ON user_scenes
    FOR SELECT USING (true); -- 简化：所有人可查看，实际应该根据 user_id 过滤

CREATE POLICY "Users can insert their own submissions" ON user_scenes
    FOR INSERT WITH CHECK (true); -- 允许所有人提交

-- game_records 表：用户可以查看和插入自己的记录
CREATE POLICY "Users can view their own records" ON game_records
    FOR SELECT USING (true); -- 简化：所有人可查看，实际应该根据 user_id 过滤

CREATE POLICY "Users can insert their own records" ON game_records
    FOR INSERT WITH CHECK (true); -- 允许所有人插入

-- ============================================
-- 完成
-- ============================================

