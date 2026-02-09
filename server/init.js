
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';
import bcrypt from 'bcryptjs';

const initDB = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Conectado ao SQLite para inicialização.');

    // Enable foreign keys
    // await connection.query('PRAGMA foreign_keys = ON');

    // Create users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
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
        storage_quota INTEGER DEFAULT 1073741824,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migration for existing tables (safe add columns)
    const columnsToAdd = [
      { name: 'nickname', type: 'TEXT' },
      { name: 'bio', type: 'TEXT' },
      { name: 'birth_date', type: 'DATE' },
      { name: 'mobile_phone', type: 'TEXT' },
      { name: 'registration_number', type: 'TEXT' },
      { name: 'appointment_date', type: 'DATE' },
      { name: 'storage_quota', type: 'INTEGER DEFAULT 1073741824' }
    ];

    for (const col of columnsToAdd) {
      try {
        await connection.query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
        console.log(`Coluna "${col.name}" adicionada à tabela users.`);
      } catch (error) {
        // Ignore error if column already exists
        if (!error.message.includes('duplicate column name')) {
          // console.warn(`Nota: Coluna ${col.name} já existe ou erro ao adicionar:`, error.message);
        }
      }
    }

    console.log('Tabela "users" verificada/criada.');

    // Create warnings table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS warnings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        urgency TEXT DEFAULT 'low',
        target_audience TEXT DEFAULT 'all',
        active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabela "warnings" verificada/criada.');

    // Create posts table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        is_urgent BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabela "posts" verificada/criada.');

    // Create post_attachments table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS post_attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        is_image BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabela "post_attachments" verificada/criada.');

    // Create post_likes table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS post_likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    // Note: UNIQUE constraints might need separate index in SQLite or inline UNIQUE(post_id, user_id)
    await connection.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_post_likes_unique ON post_likes(post_id, user_id)
    `);
    console.log('Tabela "post_likes" verificada/criada.');

    // Create post_comments table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS post_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabela "post_comments" verificada/criada.');

    // Create calendar_events table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabela "calendar_events" verificada/criada.');

    // Create event_shares table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS event_shares (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(event_id, user_id)
      )
    `);
    console.log('Tabela "event_shares" verificada/criada.');

    // Create user_folders table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        parent_id INTEGER DEFAULT NULL,
        name TEXT NOT NULL,
        is_favorite BOOLEAN DEFAULT 0,
        is_deleted BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES user_folders(id) ON DELETE CASCADE
      )
    `);

    // Migration for user_folders
    try {
      await connection.query('ALTER TABLE user_folders ADD COLUMN is_favorite BOOLEAN DEFAULT 0');
    } catch (e) { }
    try {
      await connection.query('ALTER TABLE user_folders ADD COLUMN updated_at DATETIME');
      await connection.query('UPDATE user_folders SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL');
    } catch (e) { }
    try {
      await connection.query('ALTER TABLE user_folders ADD COLUMN is_deleted BOOLEAN DEFAULT 0');
    } catch (e) { }
    console.log('Tabela "user_folders" verificada/criada.');

    // Create user_files table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        folder_id INTEGER DEFAULT NULL,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        file_type TEXT,
        file_size INTEGER,
        is_favorite BOOLEAN DEFAULT 0,
        is_deleted BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (folder_id) REFERENCES user_folders(id) ON DELETE CASCADE
      )
    `);

    // Migration for user_files
    try {
      await connection.query('ALTER TABLE user_files ADD COLUMN is_favorite BOOLEAN DEFAULT 0');
    } catch (e) { }
    try {
      await connection.query('ALTER TABLE user_files ADD COLUMN updated_at DATETIME');
      await connection.query('UPDATE user_files SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL');
    } catch (e) { }
    try {
      await connection.query('ALTER TABLE user_files ADD COLUMN is_deleted BOOLEAN DEFAULT 0');
    } catch (e) { }
    console.log('Tabela "user_files" verificada/criada.');

    // Create folder_shares table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS folder_shares (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        folder_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        permission TEXT DEFAULT 'READ', -- 'READ' or 'WRITE'
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (folder_id) REFERENCES user_folders(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(folder_id, user_id)
      )
    `);
    console.log('Tabela "folder_shares" verificada/criada.');

    // Create user_notes table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        content TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    // Ensure one note per user
    await connection.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_notes_user_id ON user_notes(user_id)
    `);
    console.log('Tabela "user_notes" verificada/criada.');

    // Create user_shortcuts table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_shortcuts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        url TEXT NOT NULL,
        icon_name TEXT DEFAULT 'Globe',
        color TEXT DEFAULT 'bg-indigo-50',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabela "user_shortcuts" verificada/criada.');
    try {
      await connection.query('ALTER TABLE user_shortcuts ADD COLUMN is_favorite BOOLEAN DEFAULT 0');
    } catch (e) { }

    // Create system_shortcuts table (Shared systems)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS system_shortcuts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        url TEXT NOT NULL,
        icon_name TEXT DEFAULT 'Box',
        color TEXT DEFAULT 'bg-blue-50',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabela "system_shortcuts" verificada/criada.');
    try {
      await connection.query('ALTER TABLE system_shortcuts ADD COLUMN is_favorite BOOLEAN DEFAULT 0');
    } catch (e) { }

    // Create todos table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        text TEXT NOT NULL,
        completed BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabela "todos" verificada/criada.');

    // Create projects table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        owner_id INTEGER NOT NULL,
        status TEXT DEFAULT 'active',
        priority TEXT DEFAULT 'medium',
        start_date DATE,
        end_date DATE,
        visibility TEXT DEFAULT 'public',
        color TEXT DEFAULT '#3B82F6',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_archived BOOLEAN DEFAULT 0,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Check if is_archived exists
    try {
      await connection.query('SELECT is_archived FROM projects LIMIT 1');
    } catch (error) {
      console.log('Adicionando coluna is_archived na tabela projects');
      await connection.query('ALTER TABLE projects ADD COLUMN is_archived BOOLEAN DEFAULT 0');
    }

    // Check if visibility exists
    try {
      await connection.query('SELECT visibility FROM projects LIMIT 1');
    } catch (error) {
      console.log('Adicionando coluna visibility na tabela projects');
      await connection.query("ALTER TABLE projects ADD COLUMN visibility TEXT DEFAULT 'public'");
    }

    console.log('Tabela "projects" verificada/criada.');

    // Create project_attachments table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS project_attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        file_id INTEGER NOT NULL,
        uploaded_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (file_id) REFERENCES user_files(id) ON DELETE CASCADE,
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabela "project_attachments" verificada/criada.');

    // Create project_members table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS project_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        role TEXT DEFAULT 'member',
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(project_id, user_id)
      )
    `);
    console.log('Tabela "project_members" verificada/criada.');

    // Create project_tasks table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS project_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabela "project_tasks" verificada/criada.');

    // Create task_comments table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS task_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES project_tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabela "task_comments" verificada/criada.');

    // Create task_attachments table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS task_attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        file_id INTEGER NOT NULL,
        uploaded_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES project_tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (file_id) REFERENCES user_files(id) ON DELETE CASCADE,
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabela "task_attachments" verificada/criada.');

    // Create task_assignees table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS task_assignees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES project_tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(task_id, user_id)
      )
    `);
    console.log('Tabela "task_assignees" verificada/criada.');

    // Create task_subtasks table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS task_subtasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        is_completed BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES project_tasks(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabela "task_subtasks" verificada/criada.');

    // Create system_settings table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabela "system_settings" verificada/criada.');

    // Create notifications table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        link TEXT,
        is_read BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabela "notifications" verificada/criada.');

    // Create sidebar_items table for configurable sidebar
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sidebar_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        label TEXT NOT NULL,
        icon TEXT NOT NULL,
        path TEXT,
        order_index INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        required_role TEXT,
        is_system BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabela "sidebar_items" verificada/criada.');

    // Populate default sidebar items if table is empty
    const [existingItems] = await connection.query('SELECT COUNT(*) as count FROM sidebar_items');
    if (existingItems[0].count === 0) {
      const defaultSidebarItems = [
        { key: 'dashboard', label: 'Início', icon: 'LayoutDashboard', path: 'dashboard', order_index: 1, is_system: 1 },
        { key: 'mural', label: 'Mural', icon: 'MessageSquare', path: 'mural', order_index: 2, is_system: 1 },
        { key: 'calendario', label: 'Calendário', icon: 'Calendar', path: 'calendario', order_index: 3, is_system: 1 },
        { key: 'diretorio', label: 'Diretório', icon: 'FolderOpen', path: 'diretorio', order_index: 4, is_system: 1 },
        { key: 'projetos', label: 'Projetos', icon: 'Briefcase', path: 'projetos', order_index: 5, is_system: 1 },
        { key: 'tectic', label: 'TEC-TIC', icon: 'Monitor', path: 'tectic', order_index: 6, required_role: 'ADMIN', is_system: 1 },
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

    // --- TEC-TIC Service Desk Tables ---

    // Tickets Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS tectic_tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        assigned_to INTEGER,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL, -- Hardware, Software, Rede, Sistemas, Outros
        priority TEXT DEFAULT 'Baixa', -- Baixa, Média, Alta, Crítica
        status TEXT DEFAULT 'Aberto', -- Aberto, Em Atendimento, Pendente, Resolvido, Cancelado
        support_level TEXT DEFAULT 'L1', -- L1, L2, L3
        solution TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME,
        resolved_by INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    // Migration for resolved_by
    try {
      await connection.query('ALTER TABLE tectic_tickets ADD COLUMN resolved_by INTEGER');
    } catch (e) { }
    console.log('Tabela "tectic_tickets" verificada/criada.');

    // Ticket Comments/History
    await connection.query(`
      CREATE TABLE IF NOT EXISTS tectic_ticket_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        comment TEXT NOT NULL,
        is_internal BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ticket_id) REFERENCES tectic_tickets(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabela "tectic_ticket_comments" verificada/criada.');

    // Knowledge Base
    await connection.query(`
      CREATE TABLE IF NOT EXISTS tectic_knowledge (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL,
        tags TEXT,
        author_id INTEGER NOT NULL,
        views INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabela "tectic_knowledge" verificada/criada.');

    // TEC-Drive Files
    await connection.query(`
      CREATE TABLE IF NOT EXISTS tectic_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        original_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_type TEXT NOT NULL, -- Instalador, Documento, Script
        file_size INTEGER NOT NULL,
        mimetype TEXT,
        uploaded_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabela "tectic_files" verificada/criada.');

    // Mural de Avisos TI
    await connection.query(`
      CREATE TABLE IF NOT EXISTS tectic_notices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        urgency TEXT DEFAULT 'Normal', -- Normal, Importante, Crítico
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER NOT NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabela "tectic_notices" verificada/criada.');

    // Seed default system settings if empty
    const [existingSettings] = await connection.query('SELECT COUNT(*) as count FROM system_settings');
    if (existingSettings[0].count === 0) {
      const defaultSettings = [
        {
          key: 'ldap_config',
          value: JSON.stringify({
            enabled: false,
            host: '',
            port: 389,
            baseDn: '',
            bindDn: '',
            bindPassword: ''
          })
        },
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
        {
          key: 'security_policy',
          value: JSON.stringify({
            min_password_length: 8,
            require_special_chars: true,
            session_timeout: 1440 // in minutes (24h)
          })
        },
        {
          key: 'upload_config',
          value: JSON.stringify({
            max_file_size: 10 * 1024 * 1024, // 10MB
            allowed_types: ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
          })
        },
        {
          key: 'theme_config',
          value: JSON.stringify({
            primary_color: '#2563eb', // blue-600
            theme_name: 'default'
          })
        }
      ];

      for (const setting of defaultSettings) {
        await connection.query(`
          INSERT INTO system_settings (key, value)
          VALUES (?, ?)
        `, [setting.key, setting.value]);
      }
      console.log('Configurações de sistema padrão inseridas.');
    }

    // Seed default system shortcuts if empty
    const [existingSystems] = await connection.query('SELECT COUNT(*) as count FROM system_shortcuts');
    if (existingSystems[0].count === 0) {
      const defaultSystems = [
        { name: 'SIGA', desc: 'Sistema Integrado de Gestão', url: 'https://siga.ap.gov.br', icon: 'Box', color: 'bg-blue-50' },
        { name: 'PRODOC', desc: 'Protocolo de Documentos', url: 'https://prodoc.ap.gov.br', icon: 'FileText', color: 'bg-purple-50' },
        { name: 'SIGRH', desc: 'Gestão de Pessoas', url: 'https://sigrh.ap.gov.br', icon: 'Users', color: 'bg-orange-50' },
        { name: 'SIPLAG', desc: 'Sistema de Planejamento', url: 'https://siplag.ap.gov.br', icon: 'ExternalLink', color: 'bg-emerald-50' },
        { name: 'Webmail', desc: 'E-mail Institucional', url: 'https://webmail.ap.gov.br', icon: 'MessageSquare', color: 'bg-sky-50' },
        { name: 'Contracheque', desc: 'Serviços Financeiros', url: 'https://contracheque.ap.gov.br', icon: 'FileText', color: 'bg-green-50' },
      ];

      for (const sys of defaultSystems) {
        await connection.query(`
          INSERT INTO system_shortcuts (name, description, url, icon_name, color)
          VALUES (?, ?, ?, ?, ?)
        `, [sys.name, sys.desc, sys.url, sys.icon, sys.color]);
      }
      console.log('Atalhos de sistema padrão inseridos.');
    }

    // Check for admin user
    const [rows] = await connection.query('SELECT * FROM users WHERE username = ?', ['admin']);

    if (rows.length === 0) {
      // Insert default admin
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
      console.log('Usuário "admin" criado com sucesso (senha hasheada).');
    } else {
      console.log('Usuário "admin" já existe.');
    }

    // Migrate existing plaintext passwords to bcrypt
    const [allUsers] = await connection.query('SELECT id, password FROM users');
    for (const u of allUsers) {
      if (!u.password.startsWith('$2a$') && !u.password.startsWith('$2b$')) {
        console.log(`Migrando senha do usuário ID ${u.id}...`);
        const hashed = await bcrypt.hash(u.password, 10);
        await connection.query('UPDATE users SET password = ? WHERE id = ?', [hashed, u.id]);
      }
    }

    connection.release();
  } catch (error) {
    console.error('Erro na inicialização do banco:', error);
  }
};

export default initDB;
