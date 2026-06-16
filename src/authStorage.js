import {
  DEFAULT_CYCLE_DAYS,
  DEFAULT_GAS_BRAND,
  STORAGE_KEY,
  createManualFields,
  formatDateInput,
  normalizeBrand,
  normalizeHistory,
} from './gasMath'

export const AUTH_SESSION_KEY = 'gas-control-session-v1'
export const AUTH_USERS_KEY = 'gas-control-users-v1'

export const SUPER_ADMIN_EMAIL = 'admin@gas.local'
export const SUPER_ADMIN_PASSWORD = 'admin123'
export const DEMO_USER_EMAIL = 'casa@gas.local'
export const DEMO_USER_PASSWORD = 'casa123'

export function createDefaultGasState(today = formatDateInput(new Date())) {
  return {
    startedAt: today,
    cycleDays: DEFAULT_CYCLE_DAYS,
    history: [],
    manual: createManualFields({ startedAt: today, endedAt: today }),
    lastFinishedCycle: null,
    reminder: { enabled: false, scheduledFor: '' },
    currentBrand: normalizeBrand(DEFAULT_GAS_BRAND),
    inventory: { reserveAvailable: false, reserveBrand: null },
  }
}

export function normalizeGasState(nextState, today = formatDateInput(new Date())) {
  const restoredStartedAt = nextState?.startedAt || today
  const restoredManual = nextState?.manual
    ? {
        installedAt: nextState.manual.installedAt || restoredStartedAt,
        endedAt: nextState.manual.endedAt || today,
        paidValue: nextState.manual.paidValue || '',
        notes: nextState.manual.notes || '',
      }
    : createManualFields({ startedAt: restoredStartedAt, endedAt: today })

  return {
    startedAt: restoredManual.installedAt || restoredStartedAt,
    cycleDays: DEFAULT_CYCLE_DAYS,
    history: normalizeHistory(nextState?.history),
    manual: restoredManual,
    lastFinishedCycle: nextState?.lastFinishedCycle || null,
    reminder: nextState?.reminder || { enabled: false, scheduledFor: '' },
    currentBrand: normalizeBrand(nextState?.currentBrand),
    inventory: {
      reserveAvailable: Boolean(nextState?.inventory?.reserveAvailable),
      reserveBrand: nextState?.inventory?.reserveBrand ? normalizeBrand(nextState.inventory.reserveBrand) : null,
    },
  }
}

function normalizeResidenceProfile(user, today) {
  return {
    city: user.city || user.residenceProfile?.city || '',
    state: user.stateCode || user.residenceProfile?.state || '',
    avatar: user.avatar || user.residenceProfile?.avatar || '',
    updatedAt: user.residenceProfile?.updatedAt || today,
  }
}

function migrateLegacyState(today) {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (stored?.startedAt) {
      return normalizeGasState(stored, today)
    }
  } catch {
    // Ignora dados antigos inválidos.
  }

  return createDefaultGasState(today)
}

function createSeedUsers(today) {
  return [
    {
      id: 'super-admin',
      name: 'Super Admin',
      homeName: 'Painel geral',
      email: SUPER_ADMIN_EMAIL,
      password: SUPER_ADMIN_PASSWORD,
      role: 'admin',
      state: null,
      theme: 'dark-premium',
      createdAt: today,
    },
    {
      id: 'casa-demo',
      name: 'Casa Demo',
      homeName: 'Casa Adriano',
      email: DEMO_USER_EMAIL,
      password: DEMO_USER_PASSWORD,
      role: 'user',
      state: migrateLegacyState(today),
      theme: 'blue-modern',
      residenceProfile: {
        city: 'São Paulo',
        state: 'SP',
        avatar: '',
        updatedAt: today,
      },
      createdAt: today,
    },
  ]
}

export function loadUsers() {
  const today = formatDateInput(new Date())

  try {
    const stored = JSON.parse(localStorage.getItem(AUTH_USERS_KEY))
    if (Array.isArray(stored) && stored.length > 0) {
      return stored.map((user) => ({
        id: user.id,
        name: user.name || user.email,
        homeName: user.homeName || user.name || user.email,
        email: String(user.email || '').toLowerCase(),
        password: user.password || '',
        role: user.role === 'admin' ? 'admin' : 'user',
        state: user.role === 'admin' ? null : normalizeGasState(user.state, today),
        theme: user.theme || 'blue-modern',
        residenceProfile: user.role === 'admin'
          ? null
          : normalizeResidenceProfile(user, today),
        createdAt: user.createdAt || today,
      })).filter((user) => user.id && user.email)
    }
  } catch {
    // Recria base local caso esteja corrompida.
  }

  const users = createSeedUsers(today)
  saveUsers(users)
  return users
}

export function saveUsers(users) {
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users))
}

export function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_SESSION_KEY))
  } catch {
    return null
  }
}

export function saveSession(session) {
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session))
}

export function clearSession() {
  localStorage.removeItem(AUTH_SESSION_KEY)
}

export function createUser({ name, homeName, email, password }) {
  const today = formatDateInput(new Date())

  return {
    id: `user-${Date.now()}`,
    name,
    homeName,
    email: email.toLowerCase(),
    password,
    role: 'user',
    state: createDefaultGasState(today),
    theme: 'blue-modern',
    residenceProfile: {
      city: '',
      state: '',
      avatar: '',
      updatedAt: today,
    },
    createdAt: today,
  }
}
