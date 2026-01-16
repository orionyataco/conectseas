import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

let dbInstance = null;

const getDb = async () => {
  if (dbInstance) return dbInstance;
  dbInstance = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });
  return dbInstance;
};

// Wrapper to mimic mysql2 pool interface for seamless migration
const pool = {
  query: async (sql, params) => {
    const db = await getDb();

    // Normalize params if needed (SQLite supports ? just like MySQL)
    // Handle specific SQL syntax replacements if strictly necessary
    // But mostly we are good with standard SQL

    const command = sql.trim().split(' ')[0].toUpperCase();

    try {
      if (command === 'SELECT') {
        const rows = await db.all(sql, params);
        return [rows, []];
      } else {
        const result = await db.run(sql, params);
        return [{
          insertId: result.lastID,
          affectedRows: result.changes,
          ...result
        }, []];
      }
    } catch (error) {
      console.error('SQL Error:', error.message, 'Query:', sql);
      throw error;
    }
  },
  getConnection: async () => {
    return {
      query: pool.query,
      release: () => { }
    };
  }
};

export default pool;
