import './env.js'
import mysql from 'mysql2/promise'

const dbConfig = {
  host: process.env.DB_HOST || 'infra-mysql-1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USERNAME || 'admin',
  password: process.env.DB_PASSWORD || 'admin',
  database: process.env.DB_DATABASE || 'controlegasabs',
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
}

export const pool = mysql.createPool(dbConfig)

export async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS gas_users (
      id VARCHAR(120) NOT NULL PRIMARY KEY,
      email VARCHAR(190) NOT NULL,
      role VARCHAR(40) NOT NULL DEFAULT 'user',
      payload JSON NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY gas_users_email_unique (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
}
