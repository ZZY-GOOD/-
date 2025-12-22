-- ============================================
-- 用户表 (users) 独立 SQL 脚本
-- 用于在已有数据库上单独创建 / 配置用户表
-- ============================================

-- 1. 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(100) UNIQUE NOT NULL,
    nickname VARCHAR(100),
    avatar_url TEXT,
    login_type VARCHAR(20) DEFAULT 'guest',
    wx_openid VARCHAR(100),
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 索引
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_users_wx_openid ON users(wx_openid);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- 3. 注释
COMMENT ON TABLE users IS '用户信息表';
COMMENT ON COLUMN users.id IS '用户表主键';
COMMENT ON COLUMN users.user_id IS '用户唯一标识，可以是微信openid或guest-id';
COMMENT ON COLUMN users.nickname IS '用户昵称';
COMMENT ON COLUMN users.avatar_url IS '用户头像URL';
COMMENT ON COLUMN users.login_type IS '登录类型：wx（微信）、guest（游客）';
COMMENT ON COLUMN users.wx_openid IS '微信openid（如果使用微信登录）';
COMMENT ON COLUMN users.created_at IS '创建时间';
COMMENT ON COLUMN users.updated_at IS '更新时间';

-- 4. 行级安全（RLS）
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 为避免重复执行出错，先删除旧策略（如果存在）
DROP POLICY IF EXISTS "Users are viewable by everyone" ON users;
DROP POLICY IF EXISTS "Users can insert their own info" ON users;
DROP POLICY IF EXISTS "Users can update their own info" ON users;

-- 用户可以查看自己的信息（这里简化为所有人可读，如需严格按 user_id 控制可改造）
CREATE POLICY "Users are viewable by everyone" ON users
    FOR SELECT USING (true);

-- 允许插入（前端创建自己的记录）
CREATE POLICY "Users can insert their own info" ON users
    FOR INSERT WITH CHECK (true);

-- 允许更新（前端更新自己的记录；此处简单处理为允许所有更新，可根据实际需要加条件）
CREATE POLICY "Users can update their own info" ON users
    FOR UPDATE USING (true);

-- ============================================
-- 结束
-- ============================================


