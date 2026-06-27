import express from 'express'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createSeedUsers,
  normalizeAuthUsers,
} from './userState.js'
import {
  ensureSchema,
  pool,
} from './db.js'

const app = express()
const port = Number(process.env.PORT || process.env.API_PORT || 3001)
const dirname = path.dirname(fileURLToPath(import.meta.url))
const distPath = path.resolve(dirname, '..', 'dist')
const allowedOrigins = new Set([
  'capacitor://localhost',
  'http://localhost',
  'https://localhost',
  ...(process.env.CLIENT_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
])

app.use((request, response, next) => {
  const origin = request.headers.origin

  if (origin && (allowedOrigins.has(origin) || process.env.CLIENT_ORIGIN === '*')) {
    response.setHeader('Access-Control-Allow-Origin', origin)
    response.setHeader('Vary', 'Origin')
  }

  response.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (request.method === 'OPTIONS') {
    response.sendStatus(204)
    return
  }

  next()
})

app.use(express.json({ limit: '8mb' }))

app.use('/api', (request, response, next) => {
  const startedAt = Date.now()

  response.on('finish', () => {
    const elapsedMs = Date.now() - startedAt
    console.log(`[api] ${request.method} ${request.originalUrl} ${response.statusCode} ${elapsedMs}ms`)
  })

  next()
})

async function getStoredUsers() {
  const [rows] = await pool.query('SELECT payload FROM gas_users ORDER BY created_at ASC')
  return normalizeAuthUsers(rows.map((row) => row.payload))
}

async function seedUsersIfNeeded() {
  const [rows] = await pool.query('SELECT COUNT(*) AS total FROM gas_users')
  if (Number(rows[0]?.total || 0) > 0) return

  const users = createSeedUsers()
  await saveUsers(users)
}

async function saveUsers(users) {
  const normalizedUsers = normalizeAuthUsers(users)
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    for (const user of normalizedUsers) {
      await connection.query(
        `
          INSERT INTO gas_users (id, email, role, payload)
          VALUES (:id, :email, :role, :payload)
          ON DUPLICATE KEY UPDATE
            email = VALUES(email),
            role = VALUES(role),
            payload = VALUES(payload)
        `,
        {
          id: user.id,
          email: user.email,
          role: user.role,
          payload: JSON.stringify(user),
        },
      )
    }

    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }

  return normalizedUsers
}

app.get('/api/health', async (_request, response) => {
  try {
    await ensureSchema()
    await pool.query('SELECT 1')
    response.json({ ok: true, database: process.env.DB_DATABASE || 'controlegasabs' })
  } catch (error) {
    response.status(500).json({ ok: false, message: error.message })
  }
})

app.get('/api/users', async (_request, response) => {
  try {
    await ensureSchema()
    await seedUsersIfNeeded()
    const users = await getStoredUsers()
    console.log(`[api] carregou ${users.length} usuarios`)
    response.json({ users })
  } catch (error) {
    console.error('[api] erro ao carregar usuarios:', error.message)
    response.status(500).json({ message: 'Não foi possível carregar os usuários.', detail: error.message })
  }
})

app.put('/api/users', async (request, response) => {
  try {
    if (!Array.isArray(request.body?.users)) {
      response.status(400).json({ message: 'Envie um array em users.' })
      return
    }

    await ensureSchema()
    const users = await saveUsers(request.body.users)
    console.log(`[api] salvou ${users.length} usuarios`)
    response.json({ users })
  } catch (error) {
    console.error('[api] erro ao salvar usuarios:', error.message)
    response.status(500).json({ message: 'Não foi possível salvar os usuários.', detail: error.message })
  }
})

if (existsSync(distPath)) {
  app.use(express.static(distPath))
  app.use((request, response, next) => {
    if (request.path.startsWith('/api')) {
      next()
      return
    }

    response.sendFile(path.join(distPath, 'index.html'))
  })
}

app.listen(port, '0.0.0.0', async () => {
  try {
    await ensureSchema()
    await seedUsersIfNeeded()
    console.log(`API Controle Gás ouvindo na porta ${port}`)
  } catch (error) {
    console.error('API iniciou, mas o MySQL ainda não está disponível:', error.message)
  }
})
