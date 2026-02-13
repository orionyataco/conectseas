import mysql from 'mysql2/promise';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import dotenv from 'dotenv';

dotenv.config();

const dbType = process.env.DB_TYPE || 'sqlite';

let pool;

if (dbType === 'mysql') {
  console.log('Using MySQL Database');
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'seas_portal',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true // Needed for migrations/init scripts often
  });
} else {
  console.log('Using SQLite Database');
  let dbInstance = null;

  const getDb = async () => {
    if (dbInstance) return dbInstance;
    dbInstance = await open({
      filename: './database.sqlite',
      driver: sqlite3.Database
    });
    return dbInstance;
  };

  // Wrapper to mimic mysql2 pool interface
  pool = {
    query: async (sql, params) => {
      const db = await getDb();
      const command = sql.trim().split(' ')[0].toUpperCase();

      try {
        if (command === 'SELECT' || command === 'PRAGMA') {
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
        if (!error.message.includes('duplicate column name')) {
          console.error('SQL Error:', error.message, 'Query:', sql);
        }
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
}

export const isMySQL = dbType === 'mysql';
export default pool;
