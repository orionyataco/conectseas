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
 * Wrapper que imita a interface do mysql2/sqlite para manter compatibilidade
 * com todas as rotas existentes — retorna [rows/result, []] como tupla.
 * Suporta expansão automática de arrays para cláusulas IN (?)
 */
const pool = {
  query: async (sql, params = []) => {
    const trimmed = sql.trim();
    const command = trimmed.split(/\s+/)[0].toUpperCase();

    // Tratamento para não-arrays (strings soltas passadas como parametro)
    if (params && !Array.isArray(params)) {
      params = [params];
    } else if (!params) {
      params = [];
    }

    // PostgreSQL no esquema atual (baseado em SQLite) espera INTEGER (0/1) para booleanos.
    // O driver 'pg' não faz essa conversão automaticamente se passarmos true/false.
    const normalizedParams = params.map(val => {
      if (typeof val === 'boolean') return val ? 1 : 0;
      return val;
    });

    let flatParams = [];
    let paramIndex = 1;
    let paramsCursor = 0;

    // Expande ? para $1, $2, $3... Se for um array no param (ex: IN(?)), expande para $1, $2
    const convertedSql = trimmed.replace(/\?/g, () => {
      const val = normalizedParams[paramsCursor++];
      if (Array.isArray(val)) {
        if (val.length === 0) return 'NULL'; // Previne erro de sintaxe se array vazio
        const placeholders = val.map(() => `$${paramIndex++}`).join(', ');
        flatParams.push(...val);
        return placeholders;
      } else {
        flatParams.push(val);
        return `$${paramIndex++}`;
      }
    });

    try {
      const startTime = Date.now();
      let finalSql = convertedSql;

      if (command === 'INSERT') {
        const hasReturning = /RETURNING/i.test(trimmed);
        const tableMatch = trimmed.match(/INTO\s+([a-zA-Z0-9_"]+)/i);
        const tableName = tableMatch ? tableMatch[1].toLowerCase().replace(/"/g, '') : '';

        // system_settings não tem coluna 'id', usa 'key' como PK
        const skipReturning = ['system_settings'];

        if (!hasReturning && !skipReturning.includes(tableName)) {
          finalSql = `${convertedSql} RETURNING id`;
        }

        const result = await pgPool.query(finalSql, flatParams);

        const duration = Date.now() - startTime;
        if (duration > 500) console.warn(`[LENTIDÂO DB] Query tomou ${duration}ms: ${finalSql.substring(0, 100)}...`);

        return [{
          insertId: result.rows[0]?.id || (result.rowCount > 0 ? 0 : null),
          affectedRows: result.rowCount,
          rows: result.rows
        }, []];
      } else if (command === 'UPDATE' || command === 'DELETE') {
        const result = await pgPool.query(convertedSql, flatParams);

        const duration = Date.now() - startTime;
        if (duration > 500) console.warn(`[LENTIDÂO DB] Query tomou ${duration}ms: ${convertedSql.substring(0, 100)}...`);

        return [{
          affectedRows: result.rowCount,
          changes: result.rowCount,
          rows: result.rows
        }, []];
      } else {
        // SELECT, PRAGMA (ignorado), CREATE, ALTER, etc.
        const result = await pgPool.query(convertedSql, flatParams);

        const duration = Date.now() - startTime;
        if (duration > 500) console.warn(`[LENTIDÂO DB] Query tomou ${duration}ms: ${convertedSql.substring(0, 100)}...`);

        return [result.rows, []];
      }
    } catch (error) {
      console.error(`❌ Erro no banco de dados [${command}]: ${error.message} \nQuery: ${convertedSql.substring(0, 150)}`);
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
