
-- Tabela de papéis (roles)
CREATE TABLE roles (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Usuários do sistema
CREATE TABLE users (
    id UUID PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role_id UUID REFERENCES roles(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Pessoas (visitantes ou membros)
CREATE TABLE persons (
    id UUID PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150),
    phone VARCHAR(50),
    birth_date DATE,
    gender VARCHAR(20),
    is_member BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Contatos adicionais da pessoa
CREATE TABLE person_contacts (
    id UUID PRIMARY KEY,
    person_id UUID REFERENCES persons(id),
    type VARCHAR(20) CHECK (type IN ('telefone', 'email', 'whatsapp', 'outro')),
    value VARCHAR(150) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Marcos (milestones)
CREATE TABLE milestones (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Subetapas dos marcos
CREATE TABLE milestone_steps (
    id UUID PRIMARY KEY,
    milestone_id UUID REFERENCES milestones(id),
    name VARCHAR(100) NOT NULL,
    position INTEGER,
    next_step_id UUID REFERENCES milestone_steps(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Progresso em subetapas do marco
CREATE TABLE milestone_step_tracks (
    id UUID PRIMARY KEY,
    person_id UUID REFERENCES persons(id),
    milestone_id UUID REFERENCES milestones(id),
    milestone_step_id UUID REFERENCES milestone_steps(id),
    responsible_user_id UUID REFERENCES users(id),
    status VARCHAR(20) CHECK (status IN ('ativo', 'pausado', 'concluido', 'descontinuado')),
    note TEXT,
    last_updated TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Histórico de movimentações nas subetapas
CREATE TABLE milestone_step_history (
    id UUID PRIMARY KEY,
    person_id UUID REFERENCES persons(id),
    milestone_id UUID REFERENCES milestones(id),
    from_step_id UUID REFERENCES milestone_steps(id),
    to_step_id UUID REFERENCES milestone_steps(id),
    moved_by_user_id UUID REFERENCES users(id),
    moved_at TIMESTAMP,
    note TEXT
);

-- Células
CREATE TABLE cells (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    leader_id UUID REFERENCES users(id),
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
    time TIME,
    location TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Histórico de participação em células
CREATE TABLE person_cells (
    id UUID PRIMARY KEY,
    person_id UUID REFERENCES persons(id),
    cell_id UUID REFERENCES cells(id),
    joined_at TIMESTAMP NOT NULL,
    left_at TIMESTAMP,
    is_current BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Cursos disponíveis
CREATE TABLE courses (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    duration_weeks INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Histórico de cursos da pessoa
CREATE TABLE person_courses (
    id UUID PRIMARY KEY,
    person_id UUID REFERENCES persons(id),
    course_id UUID REFERENCES courses(id),
    start_date DATE,
    end_date DATE,
    status VARCHAR(20) CHECK (status IN ('em_andamento', 'concluido', 'desistiu', 'transferido')),
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Ciclos de vida
CREATE TABLE life_cycles (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Marcos que compõem um ciclo
CREATE TABLE life_cycle_milestones (
    id UUID PRIMARY KEY,
    life_cycle_id UUID REFERENCES life_cycles(id),
    milestone_id UUID REFERENCES milestones(id),
    position INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Permissões de roles sobre marcos
CREATE TABLE milestone_roles (
    id UUID PRIMARY KEY,
    milestone_id UUID REFERENCES milestones(id),
    role_id UUID REFERENCES roles(id),
    access_type VARCHAR(20) CHECK (access_type IN ('visualizar', 'editar', 'acompanhar')),
    created_at TIMESTAMP DEFAULT NOW()
);
