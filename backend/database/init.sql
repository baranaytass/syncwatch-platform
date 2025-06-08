-- SyncWatch Database Initialization
-- Database already exists via POSTGRES_DB environment variable

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS syncwatch;

-- Connect to the syncwatch database
\c syncwatch;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('WAITING', 'ACTIVE', 'ENDED')),
    participants JSONB NOT NULL DEFAULT '[]',
    video_url TEXT,
    video_state JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Session participants table
CREATE TABLE IF NOT EXISTS session_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_host BOOLEAN DEFAULT FALSE,
    UNIQUE(session_id, user_id)
);

-- Video events table (for sync history)
CREATE TABLE IF NOT EXISTS video_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- 'PLAY', 'PAUSE', 'SEEK', 'LOAD'
    current_time DECIMAL(10,3),
    video_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_session_participants_session_id ON session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_user_id ON session_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_video_events_session_id ON video_events(session_id);
CREATE INDEX IF NOT EXISTS idx_video_events_created_at ON video_events(created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for sessions table
CREATE TRIGGER update_sessions_updated_at 
    BEFORE UPDATE ON sessions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Clean up expired sessions function
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ language 'plpgsql';

-- Initial data (optional)
INSERT INTO sessions (user_id, status) 
VALUES ('demo-user', 'WAITING') 
ON CONFLICT (user_id) DO NOTHING;

-- Permissions (if needed)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres; 