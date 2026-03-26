
import pool from './db.js';
import bcrypt from 'bcryptjs';

const initDB = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Conectado ao PostgreSQL para inicialização.');

    // Create users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT,
        role TEXT DEFAULT 'USER',
        department TEXT,
        position TEXT,
        avatar TEXT,
        nickname TEXT,
        bio TEXT,
        birth_date DATE,
        mobile_phone TEXT,
        registration_number TEXT,
        appointment_date DATE,
        storage_quota BIGINT DEFAULT 1073741824,
        vacation_status INTEGER DEFAULT 0,
        vacation_message TEXT,
        vacation_start_date DATE,
        vacation_end_date DATE,
        last_seen TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Tabela "users" verificada/criada.');

    // Create warnings table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS warnings (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        urgency TEXT DEFAULT 'low',
        target_audience TEXT DEFAULT 'all',
        active INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabela "warnings" verificada/criada.');

    // Create posts table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        is_urgent INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabela "posts" verificada/criada.');

    // Create post_attachments table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS post_attachments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        is_image INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabela "post_attachments" verificada/criada.');

    // Create post_likes table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS post_likes (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(post_id, user_id)
      )
    `);
    console.log('Tabela "post_likes" verificada/criada.');

    // Create post_comments table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS post_comments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabela "post_comments" verificada/criada.');

    // Create calendar_events table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        event_date DATE NOT NULL,
        event_end_date DATE,
        event_time TIME,
        event_end_time TIME,
        visibility TEXT DEFAULT 'public',
        event_type TEXT DEFAULT 'other',
        meeting_link TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabela "calendar_events" verificada/criada.');

    // Create event_shares table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS event_shares (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(event_id, user_id)
      )
    `);
    console.log('Tabela "event_shares" verificada/criada.');

    // Create user_folders table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_folders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        parent_id INTEGER DEFAULT NULL,
        name TEXT NOT NULL,
        is_favorite INTEGER DEFAULT 0,
        is_deleted INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabela "user_folders" verificada/criada.');

    // Create user_files table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_files (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        folder_id INTEGER DEFAULT NULL,
        name TEXT,
        filename TEXT,
        original_name TEXT,
        type TEXT,
        file_type TEXT,
        path TEXT,
        file_size INTEGER,
        size INTEGER,
        is_public INTEGER DEFAULT 0,
        is_favorite INTEGER DEFAULT 0,
        is_deleted INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabela "user_files" verificada/criada.');

    // Create folder_shares table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS folder_shares (
        id SERIAL PRIMARY KEY,
        folder_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        permission TEXT DEFAULT 'READ',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (folder_id) REFERENCES user_folders(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(folder_id, user_id)
      )
    `);
    console.log('Tabela "folder_shares" verificada/criada.');

    // Create user_notes table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_notes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE,
        content TEXT,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabela "user_notes" verificada/criada.');

    // Create user_shortcuts table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_shortcuts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        url TEXT NOT NULL,
        icon_name TEXT DEFAULT 'Globe',
        color TEXT DEFAULT 'bg-indigo-50',
        is_favorite INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabela "user_shortcuts" verificada/criada.');

    // Create system_shortcuts table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS system_shortcuts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        url TEXT NOT NULL,
        icon_name TEXT DEFAULT 'Box',
        color TEXT DEFAULT 'bg-blue-50',
        is_favorite INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabela "system_shortcuts" verificada/criada.');

    // Create todos table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        text TEXT NOT NULL,
        completed INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabela "todos" verificada/criada.');

    // Create projects table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        owner_id INTEGER NOT NULL,
        status TEXT DEFAULT 'active',
        priority TEXT DEFAULT 'medium',
        start_date DATE,
        end_date DATE,
        visibility TEXT DEFAULT 'public',
        color TEXT DEFAULT '#3B82F6',
        is_archived INTEGER DEFAULT 0,
        drive_folder_id INTEGER,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabela "projects" verificada/criada.');

    // Create project_attachments table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS project_attachments (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL,
        file_id INTEGER NOT NULL,
        uploaded_by INTEGER NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (file_id) REFERENCES user_files(id) ON DELETE CASCADE,
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabela "project_attachments" verificada/criada.');

    // Create project_members table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS project_members (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        role TEXT DEFAULT 'member',
        joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(project_id, user_id)
      )
    `);
    console.log('Tabela "project_members" verificada/criada.');

    // Create project_tasks table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS project_tasks (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        assigned_to INTEGER,
        created_by INTEGER NOT NULL,
        status TEXT DEFAULT 'todo',
        priority TEXT DEFAULT 'medium',
        due_date DATE,
        estimated_hours REAL,
        actual_hours REAL,
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMPTZ,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabela "project_tasks" verificada/criada.');

    // Create task_comments table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS task_comments (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES project_tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabela "task_comments" verificada/criada.');

    // Create task_attachments table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS task_attachments (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL,
        file_id INTEGER NOT NULL,
        uploaded_by INTEGER NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES project_tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (file_id) REFERENCES user_files(id) ON DELETE CASCADE,
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabela "task_attachments" verificada/criada.');

    // Create task_assignees table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS task_assignees (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES project_tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(task_id, user_id)
      )
    `);
    console.log('Tabela "task_assignees" verificada/criada.');

    // Create task_subtasks table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS task_subtasks (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        is_completed INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES project_tasks(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabela "task_subtasks" verificada/criada.');

    // Create system_settings table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabela "system_settings" verificada/criada.');

    // Create notifications table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        link TEXT,
        is_read INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabela "notifications" verificada/criada.');

    // Create sidebar_items table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sidebar_items (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) UNIQUE NOT NULL,
        label TEXT NOT NULL,
        icon TEXT NOT NULL,
        path TEXT,
        order_index INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        required_role TEXT,
        is_system INTEGER DEFAULT 0,
        open_in_iframe INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabela "sidebar_items" verificada/criada.');

    // Populate default sidebar items if table is empty
    const [existingItems] = await connection.query('SELECT COUNT(*) as count FROM sidebar_items');
    if (parseInt(existingItems[0].count) === 0) {
      const defaultSidebarItems = [
        { key: 'dashboard', label: 'Início', icon: 'LayoutDashboard', path: 'dashboard', order_index: 1, is_system: 1 },
        { key: 'mural', label: 'Mural', icon: 'MessageSquare', path: 'mural', order_index: 2, is_system: 1 },
        { key: 'calendario', label: 'Calendário', icon: 'Calendar', path: 'calendario', order_index: 3, is_system: 1 },
        { key: 'diretorio', label: 'Diretório', icon: 'FolderOpen', path: 'diretorio', order_index: 4, is_system: 1 },
        { key: 'projetos', label: 'Projetos', icon: 'Briefcase', path: 'projetos', order_index: 5, is_system: 1 },
        { key: 'tectic', label: 'ServiceDesk', icon: 'Monitor', path: 'tectic', order_index: 6, required_role: 'ADMIN', is_system: 1 },
        { key: 'assistente', label: 'Assistente IA', icon: 'Bot', path: 'assistente', order_index: 7, is_system: 1 },
        { key: 'admin', label: 'Painel de Controle', icon: 'Shield', path: 'admin', order_index: 8, required_role: 'ADMIN', is_system: 1 }
      ];

      for (const item of defaultSidebarItems) {
        await connection.query(
          'INSERT INTO sidebar_items (key, label, icon, path, order_index, required_role, is_system) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [item.key, item.label, item.icon, item.path, item.order_index, item.required_role || null, item.is_system]
        );
      }
      console.log('Itens padrão da sidebar inseridos.');
    }

    // --- ServiceDesk Tables ---

    await connection.query(`
      CREATE TABLE IF NOT EXISTS tectic_tickets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        assigned_to INTEGER,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        priority TEXT DEFAULT 'Baixa',
        status TEXT DEFAULT 'Aberto',
        support_level TEXT DEFAULT 'L1',
        solution TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMPTZ,
        resolved_by INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabela "tectic_tickets" verificada/criada.');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS tectic_ticket_comments (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        comment TEXT NOT NULL,
        is_internal INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ticket_id) REFERENCES tectic_tickets(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabela "tectic_ticket_comments" verificada/criada.');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS tectic_knowledge (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL,
        tags TEXT,
        author_id INTEGER NOT NULL,
        views INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabela "tectic_knowledge" verificada/criada.');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS tectic_files (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        original_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        mimetype TEXT,
        uploaded_by INTEGER NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabela "tectic_files" verificada/criada.');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS tectic_notices (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        urgency TEXT DEFAULT 'Normal',
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER NOT NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabela "tectic_notices" verificada/criada.');

    // Seed default settings — ON CONFLICT DO NOTHING é suportado pelo PostgreSQL
    const defaultSettings = [
      { key: 'ldap_config', value: JSON.stringify({ enabled: false, url: '', bindDN: '', bindCredentials: '', searchBase: '' }) },
      { key: 'visual_identity', value: JSON.stringify({ app_name: 'CONECTSEAS', app_description: 'Governo do Amapá', app_logo: null }) },
      {
        key: 'login_ui',
        value: JSON.stringify({
          title: 'Login Administrativo',
          subtitle: 'Entre com as credenciais locais ou de rede.',
          logo_url: '',
          background_url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1000',
          welcome_text: 'Gestão Administrativa Integrada',
          description_text: 'Plataforma unificada para serviços de assistência social e ferramentas internas do Estado.'
        })
      },
      { key: 'security_policy', value: JSON.stringify({ min_password_length: 8, require_special_chars: true, session_timeout: 1440 }) },
      { key: 'upload_config', value: JSON.stringify({ max_file_size: 10 * 1024 * 1024, allowed_types: ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] }) },
      { key: 'theme_config', value: JSON.stringify({ primary_color: '#2563eb', theme_name: 'default' }) }
    ];

    for (const setting of defaultSettings) {
      // PostgreSQL upsert — equivalente ao INSERT OR IGNORE do SQLite
      await connection.query(
        'INSERT INTO system_settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO NOTHING',
        [setting.key, setting.value]
      );
    }
    console.log('Configurações de sistema verificadas/atualizadas.');

    // Seed default system shortcuts
    const [existingSystems] = await connection.query('SELECT COUNT(*) as count FROM system_shortcuts');
    if (parseInt(existingSystems[0].count) === 0) {
      const defaultSystems = [
        { name: 'SIGA', desc: 'Sistema Integrado de Gestão', url: 'https://siga.ap.gov.br', icon: 'Box', color: 'bg-blue-50' },
        { name: 'PRODOC', desc: 'Protocolo de Documentos', url: 'https://prodoc.ap.gov.br', icon: 'FileText', color: 'bg-purple-50' },
        { name: 'SIGRH', desc: 'Gestão de Pessoas', url: 'https://sigrh.ap.gov.br', icon: 'Users', color: 'bg-orange-50' },
        { name: 'SIPLAG', desc: 'Sistema de Planejamento', url: 'https://siplag.ap.gov.br', icon: 'ExternalLink', color: 'bg-emerald-50' },
        { name: 'Webmail', desc: 'E-mail Institucional', url: 'https://webmail.ap.gov.br', icon: 'MessageSquare', color: 'bg-sky-50' },
        { name: 'Contracheque', desc: 'Serviços Financeiros', url: 'https://contracheque.ap.gov.br', icon: 'FileText', color: 'bg-green-50' },
      ];

      for (const sys of defaultSystems) {
        await connection.query(
          'INSERT INTO system_shortcuts (name, description, url, icon_name, color) VALUES (?, ?, ?, ?, ?)',
          [sys.name, sys.desc, sys.url, sys.icon, sys.color]
        );
      }
      console.log('Atalhos de sistema padrão inseridos.');
    }

    // Create admin user if not exists
    const [rows] = await connection.query('SELECT * FROM users WHERE username = ?', ['admin']);

    if (rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin', 10);
      await connection.query(`
        INSERT INTO users (username, password, name, email, role, department, position, avatar)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'admin',
        hashedPassword,
        'Administrador Sistema',
        'admin@seas.ap.gov.br',
        'ADMIN',
        'Gestão Administrativa',
        'Super Usuário',
        'https://ui-avatars.com/api/?name=Admin+Sistema&background=0D8ABC&color=fff'
      ]);
      console.log('Usuário "admin" criado com sucesso.');
    } else {
      console.log('Usuário "admin" já existe.');
    }

    // Migrate plaintext passwords to bcrypt
    const [allUsers] = await connection.query('SELECT id, password FROM users');
    for (const u of allUsers) {
      if (!u.password.startsWith('$2a$') && !u.password.startsWith('$2b$')) {
        console.log(`Migrando senha do usuário ID ${u.id}...`);
        const hashed = await bcrypt.hash(u.password, 10);
        await connection.query('UPDATE users SET password = ? WHERE id = ?', [hashed, u.id]);
      }
    }

    // Create messenger_messages table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS messenger_messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        file_url TEXT,
        file_name TEXT,
        file_type TEXT,
        file_size BIGINT,
        is_read INTEGER DEFAULT 0,
        is_edited INTEGER DEFAULT 0,
        is_deleted INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabela "messenger_messages" verificada/criada.');

    // Migration: Add file columns to messenger_messages
    const [msgColCheck] = await connection.query(
      "SELECT 1 FROM information_schema.columns WHERE table_name = 'messenger_messages' AND column_name = 'file_url'"
    );
    if (msgColCheck.length === 0) {
      await connection.query('ALTER TABLE messenger_messages ADD COLUMN file_url TEXT, ADD COLUMN file_name TEXT, ADD COLUMN file_type TEXT, ADD COLUMN file_size BIGINT');
      console.log('Colunas de arquivo adicionadas à tabela messenger_messages.');
    }

    // Migration: Add drive_folder_id to projects if missing
    const [colCheck] = await connection.query(
      "SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'drive_folder_id'"
    );
    if (colCheck.length === 0) {
      await connection.query('ALTER TABLE projects ADD COLUMN drive_folder_id INTEGER');
      console.log('Coluna "drive_folder_id" adicionada à tabela projects.');
    }

    // Criar índices para chaves estrangeiras visando melhor performance
    console.log('Criando índices de banco de dados para chaves estrangeiras...');
    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts (user_id)',
      'CREATE INDEX IF NOT EXISTS idx_post_attachments_post_id ON post_attachments (post_id)',
      'CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes (post_id)',
      'CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments (post_id)',
      'CREATE INDEX IF NOT EXISTS idx_project_tasks_project_id ON project_tasks (project_id)',
      'CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments (task_id)',
      'CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments (task_id)'
    ];

    for (const q of indexQueries) {
      await connection.query(q);
    }
    console.log('Índices de banco de dados verificados/criados.');

    connection.release();
    console.log('✅ Banco de dados PostgreSQL inicializado com sucesso!');
  } catch (error) {
    console.error('❌ Erro na inicialização do banco:', error.message);
  }
};

export default initDB;
