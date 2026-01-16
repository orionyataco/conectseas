
import pool from './db.js';

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
      { name: 'appointment_date', type: 'DATE' }
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
        event_time TIME,
        visibility TEXT DEFAULT 'public',
        event_type TEXT DEFAULT 'other',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabela "calendar_events" verificada/criada.');
    try {
      await connection.query('ALTER TABLE calendar_events ADD COLUMN event_end_time TIME');
      console.log('Coluna "event_end_time" adicionada à tabela calendar_events.');
    } catch (error) {
      // Ignore if column already exists
    }
    try {
      await connection.query('ALTER TABLE calendar_events ADD COLUMN meeting_link TEXT');
      console.log('Coluna "meeting_link" adicionada à tabela calendar_events.');
    } catch (error) {
      // Ignore if column already exists
    }

    // Create user_folders table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        parent_id INTEGER DEFAULT NULL,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES user_folders(id) ON DELETE CASCADE
      )
    `);
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (folder_id) REFERENCES user_folders(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabela "user_files" verificada/criada.');

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
      await connection.query(`
        INSERT INTO users (username, password, name, email, role, department, position, avatar)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'admin',
        'admin',
        'Administrador Sistema',
        'admin@seas.ap.gov.br',
        'ADMIN',
        'Gestão Administrativa',
        'Super Usuário',
        'https://ui-avatars.com/api/?name=Admin+Sistema&background=0D8ABC&color=fff'
      ]);
      console.log('Usuário "admin" criado com sucesso (senha: admin).');
    } else {
      console.log('Usuário "admin" já existe.');
    }

    connection.release();
  } catch (error) {
    console.error('Erro na inicialização do banco:', error);
  }
};

export default initDB;
