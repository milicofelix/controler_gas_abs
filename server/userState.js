const DEFAULT_CYCLE_DAYS = 35
const DEFAULT_GAS_BRAND = { id: 'ultragaz', name: 'Ultragaz' }

const SUPER_ADMIN_EMAIL = 'admin@gas.local'
const SUPER_ADMIN_PASSWORD = 'admin123'
const DEMO_USER_EMAIL = 'casa@gas.local'
const DEMO_USER_PASSWORD = 'casa123'

function formatDateInput(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

function normalizeBrand(brand = DEFAULT_GAS_BRAND) {
  return {
    id: brand?.id || DEFAULT_GAS_BRAND.id,
    name: brand?.name || DEFAULT_GAS_BRAND.name,
    logo: brand?.logo || '',
  }
}

function createManualFields({ startedAt, endedAt, paidValue = '', notes = '' }) {
  return {
    installedAt: startedAt,
    endedAt,
    paidValue,
    notes,
  }
}

function createDefaultGasState(today = formatDateInput(), hasActiveCylinder = true) {
  const startedAt = hasActiveCylinder ? today : ''

  return {
    hasActiveCylinder,
    startedAt,
    cycleDays: DEFAULT_CYCLE_DAYS,
    history: [],
    manual: createManualFields({ startedAt, endedAt: today }),
    lastFinishedCycle: null,
    reminder: { enabled: false, scheduledFor: '' },
    currentBrand: normalizeBrand(DEFAULT_GAS_BRAND),
    inventory: { reserveAvailable: false, reserveBrand: null, reservePurchasedAt: '', reservePaidValue: '', reserveId: '' },
    reserveHistory: [],
  }
}

function normalizeGasState(nextState, today = formatDateInput()) {
  const hasSavedState = nextState && typeof nextState === 'object'
  const hasActiveCylinder = hasSavedState
    ? (typeof nextState.hasActiveCylinder === 'boolean' ? nextState.hasActiveCylinder : Boolean(nextState.startedAt))
    : false
  const restoredStartedAt = hasActiveCylinder ? (nextState?.startedAt || today) : ''
  const restoredManual = nextState?.manual
    ? {
        installedAt: nextState.manual.installedAt || restoredStartedAt,
        endedAt: nextState.manual.endedAt || today,
        paidValue: nextState.manual.paidValue || '',
        notes: nextState.manual.notes || '',
      }
    : createManualFields({ startedAt: restoredStartedAt, endedAt: today })

  return {
    hasActiveCylinder,
    startedAt: hasActiveCylinder ? (restoredManual.installedAt || restoredStartedAt) : restoredStartedAt,
    cycleDays: DEFAULT_CYCLE_DAYS,
    history: Array.isArray(nextState?.history) ? nextState.history : [],
    manual: restoredManual,
    lastFinishedCycle: nextState?.lastFinishedCycle || null,
    reminder: nextState?.reminder || { enabled: false, scheduledFor: '' },
    currentBrand: normalizeBrand(nextState?.currentBrand),
    inventory: {
      reserveAvailable: Boolean(nextState?.inventory?.reserveAvailable),
      reserveBrand: nextState?.inventory?.reserveBrand ? normalizeBrand(nextState.inventory.reserveBrand) : null,
      reservePurchasedAt: nextState?.inventory?.reservePurchasedAt || '',
      reservePaidValue: nextState?.inventory?.reservePaidValue || '',
      reserveId: nextState?.inventory?.reserveId || '',
    },
    reserveHistory: Array.isArray(nextState?.reserveHistory) ? nextState.reserveHistory : [],
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

export function createSeedUsers(today = formatDateInput()) {
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
      state: createDefaultGasState(today),
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

export function normalizeAuthUsers(users = []) {
  const today = formatDateInput()

  return users
    .map((user) => {
      if (typeof user !== 'string') return user

      try {
        return JSON.parse(user)
      } catch {
        return null
      }
    })
    .filter((user) => user && typeof user === 'object')
    .map((user) => ({
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
    }))
    .filter((user) => user.id && user.email)
}
