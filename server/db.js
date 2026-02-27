import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// PostgreSQL connection pool
const pgPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'conectseas',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
});

pgPool.on('error', (err) => {
  console.error('Erro inesperado no pool PostgreSQL:', err.message);
});

/**
 * Converte placeholders ? estilo MySQL/SQLite para $1, $2, $3... estilo PostgreSQL.
 * Isso permite que todas as rotas existentes funcionem sem alteração nos parâmetros.
 */
function convertPlaceholders(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

/**
 * Wrapper que imita a interface do mysql2/sqlite para manter compatibilidade
 * com todas as rotas existentes — retorna [rows/result, []] como tupla.
 */
const pool = {
  query: async (sql, params = []) => {
    const trimmed = sql.trim();
    const command = trimmed.split(/\s+/)[0].toUpperCase();
    const convertedSql = convertPlaceholders(trimmed);

    try {
      if (command === 'INSERT') {
        // Append RETURNING id para capturar o insertId gerado pelo SERIAL
        const hasReturning = /RETURNING/i.test(trimmed);
        const finalSql = hasReturning ? convertedSql : `${convertedSql} RETURNING id`;
        const result = await pgPool.query(finalSql, params);
        return [{
          insertId: result.rows[0]?.id ?? null,
          affectedRows: result.rowCount
        }, []];
      } else if (command === 'UPDATE' || command === 'DELETE') {
        const result = await pgPool.query(convertedSql, params);
        return [{ affectedRows: result.rowCount, changes: result.rowCount }, []];
      } else {
        // SELECT, PRAGMA (ignorado), CREATE, ALTER, etc.
        const result = await pgPool.query(convertedSql, params);
        return [result.rows, []];
      }
    } catch (error) {
      // Propaga o erro para que os handlers nas rotas possam tratá-lo
      throw error;
    }
  },

  // Mantém a interface getConnection() usada no init.js
  getConnection: async () => {
    const client = await pgPool.connect();
    return {
      query: async (sql, params = []) => pool.query(sql, params),
      release: () => client.release()
    };
  }
};

export default pool;
