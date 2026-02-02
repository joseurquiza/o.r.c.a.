-- Create table for remote agents
CREATE TABLE IF NOT EXISTS remote_agents (
    id SERIAL PRIMARY KEY,
    agent_id VARCHAR(255) UNIQUE NOT NULL,
    agent_name VARCHAR(255) NOT NULL,
    current_url TEXT,
    current_title TEXT,
    elements_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'inactive',
    capabilities JSONB DEFAULT '[]',
    user_agent TEXT,
    ip_address VARCHAR(45),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for remote agent elements (without foreign key constraint for now)
CREATE TABLE IF NOT EXISTS remote_agent_elements (
    id SERIAL PRIMARY KEY,
    agent_id VARCHAR(255) NOT NULL,
    element_index INTEGER NOT NULL,
    tag_name VARCHAR(50) NOT NULL,
    text_content TEXT,
    selector TEXT,
    element_id VARCHAR(255),
    class_name TEXT,
    href TEXT,
    element_type VARCHAR(50),
    role VARCHAR(50),
    is_clickable BOOLEAN DEFAULT true,
    page_url TEXT,
    page_title TEXT,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for remote agent commands
CREATE TABLE IF NOT EXISTS remote_agent_commands (
    id SERIAL PRIMARY KEY,
    agent_id VARCHAR(255) NOT NULL,
    command_type VARCHAR(50) NOT NULL,
    command_data JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    executed_at TIMESTAMP WITH TIME ZONE,
    result JSONB
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_remote_agents_agent_id ON remote_agents(agent_id);
CREATE INDEX IF NOT EXISTS idx_remote_agents_status ON remote_agents(status);
CREATE INDEX IF NOT EXISTS idx_remote_agent_elements_agent_id ON remote_agent_elements(agent_id);
CREATE INDEX IF NOT EXISTS idx_remote_agent_elements_detected_at ON remote_agent_elements(detected_at);
CREATE INDEX IF NOT EXISTS idx_remote_agent_commands_agent_id ON remote_agent_commands(agent_id);
CREATE INDEX IF NOT EXISTS idx_remote_agent_commands_status ON remote_agent_commands(status);

-- Add foreign key constraints after tables are created
ALTER TABLE remote_agent_elements 
ADD CONSTRAINT fk_remote_agent_elements_agent_id 
FOREIGN KEY (agent_id) REFERENCES remote_agents(agent_id) ON DELETE CASCADE;

ALTER TABLE remote_agent_commands 
ADD CONSTRAINT fk_remote_agent_commands_agent_id 
FOREIGN KEY (agent_id) REFERENCES remote_agents(agent_id) ON DELETE CASCADE;
