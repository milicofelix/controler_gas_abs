import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LocalNotifications } from '@capacitor/local-notifications'
import {
  DEFAULT_CYCLE_DAYS,
  DEFAULT_GAS_BRAND,
  GAS_REMINDER_NOTIFICATION_ID,
  GAS_BRANDS,
  MOVING_AVERAGE_LIMIT,
  averageDuration,
  calculateBrandStats,
  calculateConsumptionStats,
  calculateFinancialStats,
  calculateStats,
  calculateTrendStats,
  createHistoryEntry,
  createManualFields,
  daysBetween,
  detectConsumptionPattern,
  formatDateInput,
  formatDisplayDate,
  formatMoney,
  getAlert,
  getReminderDate,
  getSmartAlerts,
  normalizeBrand,
  parseMoneyInput,
} from './gasMath'
import {
  DEMO_USER_EMAIL,
  DEMO_USER_PASSWORD,
  SUPER_ADMIN_EMAIL,
  SUPER_ADMIN_PASSWORD,
  clearSession,
  createDefaultGasState,
  createUser,
  loadSession,
  loadRemoteUsers,
  loadUsers,
  normalizeGasState,
  saveSession,
  saveRemoteUsers,
  saveUsers,
} from './authStorage'
import './App.css'


const THEME_OPTIONS = [
  { id: 'blue-modern', name: 'Azul Moderno', description: 'Leve, claro e com cara de app financeiro.' },
  { id: 'dark-premium', name: 'Escuro Premium', description: 'Visual noturno, premium e otimizado para OLED.' },
  { id: 'green-clean', name: 'Verde Clean', description: 'Tema doméstico, suave e inspirado em cozinha.' },
  { id: 'realistic', name: 'Botijão Realista', description: 'Medidor físico com botijão em destaque.' },
]

function getThemeOption(themeId) {
  return THEME_OPTIONS.find((theme) => theme.id === themeId) || THEME_OPTIONS[0]
}

const PAGE_OPTIONS = [
  { id: 'home', label: 'Início', icon: '⌂' },
  { id: 'history', label: 'Histórico', icon: '↺' },
  { id: 'stock', label: 'Estoque', icon: '▣' },
  { id: 'stats', label: 'Análises', icon: '▥' },
  { id: 'alerts', label: 'Alertas', icon: '!' },
  { id: 'profile', label: 'Perfil', icon: '♙' },
]

const STATUS_STEPS = [
  { label: 'Cheio', tone: 'full' },
  { label: 'Médio', tone: 'medium' },
  { label: 'Baixo', tone: 'low' },
  { label: 'Crítico', tone: 'critical' },
]

function AppLogo({ className = '' }) {
  return (
    <img
      className={`app-logo ${className}`}
      src="/logo-controle-gas-abs.png"
      alt="Controle de Gás ABS"
    />
  )
}

async function cancelGasReminder() {
  try {
    await LocalNotifications.cancel({
      notifications: [{ id: GAS_REMINDER_NOTIFICATION_ID }],
    })
  } catch {
    // O cancelamento pode falhar no navegador; o app segue funcionando.
  }
}

function buildIntelligence(history) {
  const recentCycles = history.slice(0, MOVING_AVERAGE_LIMIT)
  const movingAverage = averageDuration(recentCycles)
  const projectedCycleDays = movingAverage || DEFAULT_CYCLE_DAYS

  return {
    projectedCycleDays,
    movingAverage,
    isUsingRealAverage: movingAverage > 0,
    sampleSize: recentCycles.length,
    pattern: detectConsumptionPattern(history, movingAverage),
  }
}

function getUserStats(user, today = formatDateInput(new Date())) {
  const state = normalizeGasState(user.state, today)
  const hasActiveCylinder = Boolean(state.hasActiveCylinder && state.startedAt)
  const intelligence = buildIntelligence(state.history)
  const stats = hasActiveCylinder
    ? calculateStats({
        startedAt: state.startedAt,
        today,
        projectedCycleDays: intelligence.projectedCycleDays,
      })
    : {
        elapsedDays: 0,
        percent: 0,
        remainingDays: 0,
        buyInDays: 0,
        status: { label: 'Sem botijão', tone: 'empty' },
        expectedEnd: '',
        recommendation: 'Cadastre um botijão',
      }

  return { state, intelligence, stats }
}

function getBrandInitials(name) {
  return String(name || 'Gás')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function BrandLogo({ brand, className = '' }) {
  const normalizedBrand = normalizeBrand(brand)

  if (normalizedBrand.logo) {
    return (
      <img
        className={`brand-logo uploaded ${className}`}
        src={normalizedBrand.logo}
        alt={`Logo ${normalizedBrand.name}`}
      />
    )
  }

  return (
    <span className={`brand-logo fallback ${className}`} aria-hidden="true">
      {getBrandInitials(normalizedBrand.name)}
    </span>
  )
}

function ProfileAvatar({ user }) {
  const avatar = user.residenceProfile?.avatar

  if (avatar) {
    return <img className="profile-avatar" src={avatar} alt={user.name} />
  }

  return <span className="profile-avatar fallback" aria-hidden="true">{getBrandInitials(user.name)}</span>
}

function readImageFile(file, onSuccess, onError) {
  if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    onError('Use uma imagem JPG, PNG ou WEBP.')
    return
  }

  if (file.size > 1024 * 1024) {
    onError('Use uma imagem de até 1 MB.')
    return
  }

  const reader = new FileReader()

  reader.onload = () => onSuccess(String(reader.result || ''))
  reader.onerror = () => onError('Não foi possível carregar a imagem.')
  reader.readAsDataURL(file)
}

function CylinderGauge({ percent, tone }) {
  const fillHeight = `${percent}%`

  return (
    <div className={`cylinder-stage ${tone}`}>
      <div className="gauge-arc" aria-hidden="true">
        <span className="arc-fill"></span>
        <small className="arc-start">0%</small>
        <small className="arc-end">100%</small>
      </div>

      <div className={`cylinder-wrap ${tone}`} aria-label={`Botijão com ${percent}% de gás estimado`}>
        <div className="cylinder-top-ring"></div>
        <div className="cylinder-neck"></div>
        <div className="cylinder-handle">
          <span></span>
          <i></i>
        </div>
        <div className="cylinder-body">
          <div className="cylinder-inner-window">
            <div className="cylinder-fill" style={{ height: fillHeight }}></div>
            <div className="liquid-reflection"></div>
          </div>
          <div className="cylinder-shine"></div>
          <div className="cylinder-label">
            <strong>{percent}%</strong>
            <small>P13 • 13kg</small>
          </div>
        </div>
        <div className="cylinder-foot left"></div>
        <div className="cylinder-foot right"></div>
        <div className="cylinder-base"></div>
      </div>
    </div>
  )
}

function LoginScreen({ users, onLogin, onCreateUser }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({
    name: '',
    homeName: '',
    email: DEMO_USER_EMAIL,
    password: DEMO_USER_PASSWORD,
  })
  const [message, setMessage] = useState('')

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function submitLogin(event) {
    event.preventDefault()
    const email = form.email.trim().toLowerCase()
    const user = users.find((item) => item.email === email && item.password === form.password)

    if (!user) {
      setMessage('E-mail ou senha inválidos.')
      return
    }

    setMessage('')
    onLogin(user)
  }

  function submitRegister(event) {
    event.preventDefault()
    const name = form.name.trim()
    const homeName = form.homeName.trim()
    const email = form.email.trim().toLowerCase()
    const password = form.password.trim()

    if (!name || !homeName || !email || password.length < 4) {
      setMessage('Preencha nome, casa, e-mail e uma senha com pelo menos 4 caracteres.')
      return
    }

    if (users.some((user) => user.email === email)) {
      setMessage('Já existe um usuário com este e-mail.')
      return
    }

    onCreateUser(createUser({ name, homeName, email, password }))
    setMessage('Usuário criado. Faça login para acessar sua casa.')
    setMode('login')
  }

  function fillAccess(email, password) {
    setMode('login')
    setMessage('')
    setForm((current) => ({
      ...current,
      email,
      password,
    }))
  }

  return (
    <main className="app-shell auth-shell">
      <section className="hero-card auth-hero">
        <div className="hero-copy">
          <AppLogo className="auth-logo" />
          <div className="auth-benefits">
            <article>
              <span aria-hidden="true">✓</span>
              <div>
                <strong>Mais segurança</strong>
                <p>Monitore seus botijões e evite riscos com alertas inteligentes.</p>
              </div>
            </article>
            <article>
              <span aria-hidden="true">▥</span>
              <div>
                <strong>Mais controle</strong>
                <p>Acompanhe histórico, consumo, marcas e estoque em um só lugar.</p>
              </div>
            </article>
            <article>
              <span aria-hidden="true">$</span>
              <div>
                <strong>Mais economia</strong>
                <p>Veja custos, médias e tendências para comprar melhor.</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="form-card auth-card">
        <div className="secure-badge">
          <span aria-hidden="true">✓</span>
          <div>
            <strong>Acesso seguro</strong>
            <small>Dados sincronizados no seu banco</small>
          </div>
        </div>

        <div className="auth-title">
          <h1>{mode === 'login' ? 'Bem-vindo de volta!' : 'Cadastre sua casa'}</h1>
          <p>{mode === 'login' ? 'Faça login para acessar sua conta.' : 'Crie o acesso para acompanhar seu botijão.'}</p>
        </div>

        <div className="auth-tabs" role="tablist" aria-label="Acesso">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Login</button>
          <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Criar usuário</button>
        </div>

        <form className="auth-form" onSubmit={mode === 'login' ? submitLogin : submitRegister}>
          {mode === 'register' && (
            <>
              <label>
                Nome do responsável
                <input value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Ex.: Adriano" />
              </label>

              <label>
                Nome da casa
                <input value={form.homeName} onChange={(event) => update('homeName', event.target.value)} placeholder="Ex.: Casa da família" />
              </label>
            </>
          )}

          <label>
            E-mail
            <input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="voce@email.com" />
          </label>

          <label>
            Senha
            <input type="password" value={form.password} onChange={(event) => update('password', event.target.value)} placeholder="Sua senha" />
          </label>

          <button type="submit" className="primary">
            {mode === 'login' ? 'Entrar' : 'Criar usuário'}
          </button>
        </form>

        {message && <div className="settings-status" role="status">{message}</div>}

        <div className="demo-access">
          <span className="eyebrow">Ou acesse como</span>
          <div className="demo-access-actions">
            <button type="button" className="ghost" onClick={() => fillAccess(DEMO_USER_EMAIL, DEMO_USER_PASSWORD)}>
              Usuário de teste
            </button>
            <button type="button" className="ghost" onClick={() => fillAccess(SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD)}>
              Super admin
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}

function AdminDashboard({ users, onLogout }) {
  const today = formatDateInput(new Date())
  const userRows = users
    .filter((user) => user.role !== 'admin')
    .map((user) => ({ user, ...getUserStats(user, today) }))
  const criticalCount = userRows.filter((row) => row.stats.percent <= 10).length
  const lowCount = userRows.filter((row) => row.stats.percent > 10 && row.stats.percent <= 25).length
  const riskCount = criticalCount + lowCount
  const staleCount = userRows.filter((row) => row.stats.elapsedDays > row.intelligence.projectedCycleDays + 7).length
  const totalCycles = userRows.reduce((sum, row) => sum + row.state.history.length, 0)
  const averagePercent = userRows.length
    ? Math.round(userRows.reduce((sum, row) => sum + row.stats.percent, 0) / userRows.length)
    : 0
  const allHistory = userRows.flatMap((row) => row.state.history)
  const adminBrandStats = calculateBrandStats(allHistory)
  const adminFinancialStats = calculateFinancialStats(allHistory)
  const mostUsedBrand = adminBrandStats
    .slice()
    .sort((a, b) => b.cycles - a.cycles)[0]

  return (
    <main className="app-shell admin-shell">
      <section className="hero-card">
        <div className="hero-copy">
          <div className="brand-row">
            <AppLogo className="header-logo" />
            <span className="eyebrow">Super admin</span>
          </div>
          <h1>Dashboard geral</h1>
          <p>Visão consolidada dos consumos registrados em cada casa.</p>
        </div>
        <button type="button" className="logout-button" onClick={onLogout}>Encerrar sessão</button>
      </section>

      <section className="admin-metrics">
        <article>
          <span>Total de casas</span>
          <strong>{userRows.length}</strong>
        </article>
        <article>
          <span>Casas em risco</span>
          <strong>{riskCount}</strong>
        </article>
        <article>
          <span>Sem atualização</span>
          <strong>{staleCount}</strong>
        </article>
        <article>
          <span>Nível médio</span>
          <strong>{averagePercent}%</strong>
        </article>
      </section>

      <section className="admin-metrics">
        <article>
          <span>Marca mais usada</span>
          <strong>{mostUsedBrand?.name || 'Sem dados'}</strong>
        </article>
        <article>
          <span>Média por marca</span>
          <strong>{adminBrandStats[0]?.averageDuration || 0} dias</strong>
        </article>
        <article>
          <span>Valor médio</span>
          <strong>{adminFinancialStats.averagePaid ? formatMoney(adminFinancialStats.averagePaid) : 'R$ 0,00'}</strong>
        </article>
        <article>
          <span>Gasto anual</span>
          <strong>{adminFinancialStats.annualSpend ? formatMoney(adminFinancialStats.annualSpend) : 'R$ 0,00'}</strong>
        </article>
      </section>

      <section className="history-card admin-card">
        <div className="history-header">
          <div>
            <span className="eyebrow">Marcas</span>
            <h2>Consumo por marca</h2>
          </div>
        </div>

        <div className="brand-ranking">
          {adminBrandStats.map((brand) => (
            <article key={brand.name}>
              <BrandLogo brand={brand} />
              <div>
                <strong>{brand.name}</strong>
                <span>{brand.cycles} ciclos • média de {brand.averageDuration} dias</span>
              </div>
            </article>
          ))}

          {adminBrandStats.length === 0 && (
            <div className="empty-state">Nenhum ciclo registrado por marca ainda.</div>
          )}
        </div>
      </section>

      <section className="history-card admin-card">
        <div className="history-header">
          <div>
            <span className="eyebrow">Consumos</span>
            <h2>Casas monitoradas</h2>
          </div>
          <div className="history-average">
            <span>Ciclos</span>
            <strong>{totalCycles}</strong>
          </div>
        </div>

        <div className="admin-list">
          {userRows.map(({ user, state, intelligence, stats }) => (
            <article key={user.id} className={`admin-user-card ${stats.status.tone}`}>
              <div className="admin-user-main">
                <div>
                  <strong>{user.homeName}</strong>
                  <span>
                    {user.residenceProfile?.city || 'Cidade não informada'}
                    {user.residenceProfile?.state ? `/${user.residenceProfile.state}` : ''}
                    {' • '}
                    {user.name} • {user.email} • {getThemeOption(user.theme).name}
                  </span>
                </div>
                <div className={`status-pill ${stats.status.tone}`}>{stats.status.label}</div>
              </div>

              <div className={`progress-track ${stats.status.tone}`}>
                <span style={{ width: `${stats.percent}%` }}></span>
              </div>

              <div className="admin-user-grid">
                <span>Nível: <strong>{stats.percent}%</strong></span>
                <span>Uso: <strong>{stats.elapsedDays} dias</strong></span>
                <span>Acaba em: <strong>{formatDisplayDate(stats.expectedEnd)}</strong></span>
                <span>Média: <strong>{intelligence.projectedCycleDays} dias</strong></span>
                <span>Trocas: <strong>{state.history.length}</strong></span>
                <span>Marca: <strong>{state.currentBrand?.name || 'Ultragaz'}</strong></span>
                <span>Recomendação: <strong>{stats.recommendation}</strong></span>
              </div>
            </article>
          ))}

          {userRows.length === 0 && (
            <div className="empty-state">Nenhuma casa cadastrada ainda.</div>
          )}
        </div>
      </section>
    </main>
  )
}

function UserHome({ currentUser, onUpdateUserState, onUpdateUserProfile, onUpdateUserTheme, onLogout }) {
  const [activePage, setActivePage] = useState('home')
  const [state, setState] = useState(() => normalizeGasState(currentUser.state))
  const [reserveConfirmationOpen, setReserveConfirmationOpen] = useState(false)
  const [resetConfirmationOpen, setResetConfirmationOpen] = useState(false)
  const [reserveReason, setReserveReason] = useState('acabou')
  const [reserveReasonNotes, setReserveReasonNotes] = useState('')
  const [reserveForm, setReserveForm] = useState(() => ({
    brandId: currentUser.state?.inventory?.reserveBrand?.id || currentUser.state?.currentBrand?.id || DEFAULT_GAS_BRAND.id,
    purchasedAt: currentUser.state?.inventory?.reservePurchasedAt || formatDateInput(new Date()),
    paidValue: currentUser.state?.inventory?.reservePaidValue || '',
  }))
  const [notificationStatus, setNotificationStatus] = useState('')
  const [settingsStatus, setSettingsStatus] = useState('')
  const [brandUploadStatus, setBrandUploadStatus] = useState('')
  const [profileForm, setProfileForm] = useState(() => ({
    name: currentUser.name || '',
    homeName: currentUser.homeName || '',
    email: currentUser.email || '',
    password: currentUser.password || '',
    city: currentUser.residenceProfile?.city || '',
    state: currentUser.residenceProfile?.state || '',
    avatar: currentUser.residenceProfile?.avatar || '',
  }))
  const currentTheme = getThemeOption(currentUser.theme)
  const currentBrand = normalizeBrand(state.currentBrand)

  const today = formatDateInput(new Date())
  const hasActiveCylinder = Boolean(state.hasActiveCylinder && state.startedAt)

  const intelligence = useMemo(() => buildIntelligence(state.history), [state.history])

  const stats = useMemo(() => (
    hasActiveCylinder
      ? calculateStats({
          startedAt: state.startedAt,
          today,
          projectedCycleDays: intelligence.projectedCycleDays,
        })
      : {
          elapsedDays: 0,
          percent: 0,
          remainingDays: 0,
          buyInDays: 0,
          status: { label: 'Sem botijão', tone: 'empty' },
          expectedEnd: '',
          recommendation: 'Cadastre um botijão',
        }
  ), [hasActiveCylinder, state.startedAt, intelligence.projectedCycleDays, today])

  const visualAlert = hasActiveCylinder ? getAlert(stats.percent) : null
  const smartAlerts = useMemo(() => (
    hasActiveCylinder
      ? getSmartAlerts({
          stats,
          reserveAvailable: state.inventory?.reserveAvailable,
          reminderEnabled: state.reminder?.enabled,
          scheduledFor: state.reminder?.scheduledFor,
        })
      : [{
          tone: 'stable',
          title: 'Nenhum botijão em uso',
          message: 'Cadastre a data de instalação para iniciar o acompanhamento.',
        }]
  ), [hasActiveCylinder, state.inventory?.reserveAvailable, state.reminder?.enabled, state.reminder?.scheduledFor, stats])

  const pageTitle = PAGE_OPTIONS.find((page) => page.id === activePage)?.label || 'Início'
  const brandStats = useMemo(() => calculateBrandStats(state.history), [state.history])
  const bestBrand = brandStats[0] || null
  const shortestBrand = brandStats.length > 0
    ? brandStats.reduce((shortest, brand) => (
        brand.averageDuration < shortest.averageDuration ? brand : shortest
      ), brandStats[0])
    : null
  const maxBrandAverage = Math.max(1, ...brandStats.map((brand) => brand.averageDuration))
  const consumptionStats = useMemo(() => calculateConsumptionStats(state.history), [state.history])
  const financialStats = useMemo(() => calculateFinancialStats(state.history), [state.history])
  const trendStats = useMemo(() => calculateTrendStats(state.history), [state.history])
  const durationSeries = useMemo(() => state.history.slice(0, 6).reverse(), [state.history])
  const maxDuration = Math.max(1, ...durationSeries.map((cycle) => cycle.duration))
  const priceSeries = useMemo(() => state.history
    .filter((cycle) => Number(cycle.paidValue) > 0)
    .slice(0, 6)
    .reverse(), [state.history])
  const maxPrice = Math.max(1, ...priceSeries.map((cycle) => Number(cycle.paidValue)))

  const historyStats = useMemo(() => {
    if (state.history.length === 0) {
      return { averageDuration: 0, totalCycles: 0 }
    }

    return {
      averageDuration: averageDuration(state.history),
      totalCycles: state.history.length,
    }
  }, [state.history])

  useEffect(() => {
    onUpdateUserState(currentUser.id, state)
  }, [currentUser.id, onUpdateUserState, state])


  function updateProfileField(field, value) {
    setProfileForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function saveProfile(event) {
    event.preventDefault()

    const name = profileForm.name.trim()
    const homeName = profileForm.homeName.trim()
    const email = profileForm.email.trim().toLowerCase()
    const password = profileForm.password.trim()

    if (!name || !homeName || !email || password.length < 4) {
      setSettingsStatus('Preencha responsável, local, e-mail e senha com pelo menos 4 caracteres.')
      return
    }

    const result = onUpdateUserProfile(currentUser.id, {
      name,
      homeName,
      email,
      password,
      residenceProfile: {
        city: profileForm.city.trim(),
        state: profileForm.state.trim().toUpperCase(),
        avatar: profileForm.avatar,
      },
    })

    if (!result.ok) {
      setSettingsStatus(result.message)
      return
    }

    setSettingsStatus('Cadastro atualizado.')
  }

  function updateStartedAt(event) {
    const installedAt = event.target.value || today

    setState((current) => ({
      ...current,
      startedAt: current.hasActiveCylinder ? installedAt : current.startedAt,
      manual: {
        ...current.manual,
        installedAt,
        endedAt: current.manual?.endedAt && current.manual.endedAt >= installedAt ? current.manual.endedAt : installedAt,
      },
    }))
  }

  function updateCurrentBrand(nextBrand) {
    setState((current) => ({
      ...current,
      currentBrand: normalizeBrand(nextBrand),
    }))
  }

  function updateBrandFromSelect(brandId) {
    const nextBrand = GAS_BRANDS.find((brand) => brand.id === brandId) || GAS_BRANDS[0]
    updateCurrentBrand({
      id: nextBrand.id,
      name: nextBrand.id === 'outra' ? currentBrand.name : nextBrand.name,
      logo: nextBrand.id === currentBrand.id ? currentBrand.logo : '',
    })
  }

  function updateCustomBrandName(value) {
    setState((current) => ({
      ...current,
      currentBrand: normalizeBrand({
        ...current.currentBrand,
        id: 'outra',
        name: value,
      }),
    }))
  }

  function uploadBrandLogo(event) {
    const file = event.target.files?.[0]

    readImageFile(
      file,
      (logo) => {
        setState((current) => ({
          ...current,
          currentBrand: normalizeBrand({ ...current.currentBrand, logo }),
        }))
        setBrandUploadStatus('Logo personalizado salvo.')
        event.target.value = ''
      },
      (message) => {
        setBrandUploadStatus(message)
        event.target.value = ''
      },
    )
  }

  function removeBrandLogo() {
    setState((current) => ({
      ...current,
      currentBrand: normalizeBrand({ ...current.currentBrand, logo: '' }),
    }))
    setBrandUploadStatus('Logo personalizado removido.')
  }

  function uploadProfileAvatar(event) {
    const file = event.target.files?.[0]

    readImageFile(
      file,
      (avatar) => {
        setProfileForm((current) => ({ ...current, avatar }))
        setSettingsStatus('Foto carregada. Salve o cadastro para persistir.')
        event.target.value = ''
      },
      (message) => {
        setSettingsStatus(message)
        event.target.value = ''
      },
    )
  }

  function updateReserveForm(field, value) {
    setReserveForm((current) => ({
      ...current,
      [field]: field === 'paidValue' ? parseMoneyInput(value) : value,
    }))
  }

  function createReserveHistoryEntry({ brand, purchasedAt, paidValue = '', status = 'available', usedAt = '', notes = '' }) {
    const uniqueSuffix = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const normalizedBrand = normalizeBrand(brand)

    return {
      id: `${purchasedAt}-${normalizedBrand.id}-${uniqueSuffix}`,
      brandId: normalizedBrand.id,
      brandName: normalizedBrand.name,
      brandLogo: normalizedBrand.logo,
      purchasedAt,
      paidValue,
      status,
      usedAt,
      notes,
      createdAt: today,
    }
  }

  function updateReserveHistoryStatus(history = [], reserveId, status, extras = {}) {
    if (!reserveId) return history

    return history.map((entry) => (
      entry.id === reserveId ? { ...entry, status, ...extras } : entry
    ))
  }

  function getReserveStatusLabel(status) {
    const statusLabels = {
      available: 'Disponível',
      used: 'Usado',
      removed: 'Removido',
      replaced: 'Substituído',
    }

    return statusLabels[status] || 'Registrado'
  }

  function registerReservePurchase(event) {
    event.preventDefault()
    const reserveBrand = GAS_BRANDS.find((brand) => brand.id === reserveForm.brandId) || DEFAULT_GAS_BRAND
    const purchasedAt = reserveForm.purchasedAt || today
    const reserveEntry = createReserveHistoryEntry({
      brand: reserveBrand,
      purchasedAt,
      paidValue: reserveForm.paidValue || '',
    })

    setState((current) => ({
      ...current,
      inventory: {
        reserveAvailable: true,
        reserveBrand: normalizeBrand(reserveBrand),
        reservePurchasedAt: purchasedAt,
        reservePaidValue: reserveForm.paidValue || '',
        reserveId: reserveEntry.id,
      },
      reserveHistory: [
        reserveEntry,
        ...updateReserveHistoryStatus(current.reserveHistory, current.inventory?.reserveId, 'replaced', {
          notes: 'Substituído por nova compra de reserva.',
        }),
      ].slice(0, 20),
    }))
  }

  function removeReserveCylinder() {
    setState((current) => ({
      ...current,
      inventory: {
        reserveAvailable: false,
        reserveBrand: null,
        reservePurchasedAt: '',
        reservePaidValue: '',
        reserveId: '',
      },
      reserveHistory: updateReserveHistoryStatus(current.reserveHistory, current.inventory?.reserveId, 'removed', {
        usedAt: today,
        notes: 'Reserva removida manualmente.',
      }),
    }))
  }

  function getReserveReasonText(reason, notes = '') {
    const reasonLabels = {
      acabou: 'Gás acabou.',
      vazamento: 'Suspeita de vazamento.',
      preventivo: 'Troca preventiva.',
      outro: notes.trim() || 'Outro motivo informado.',
    }

    return reasonLabels[reason] || reasonLabels.outro
  }

  function requestUseReserveCylinder() {
    if (stats.percent <= 10) {
      applyReserveCylinder('Gás em nível crítico.')
      return
    }

    setReserveConfirmationOpen(true)
  }

  function confirmUseReserveCylinder(event) {
    event.preventDefault()
    const reasonText = getReserveReasonText(reserveReason, reserveReasonNotes)

    applyReserveCylinder(reasonText)
    setReserveConfirmationOpen(false)
    setReserveReason('acabou')
    setReserveReasonNotes('')
  }

  function applyReserveCylinder(reasonText) {
    const reserveBrand = state.inventory?.reserveBrand
      ? normalizeBrand(state.inventory.reserveBrand)
      : currentBrand
    const lastFinishedCycle = hasActiveCylinder
      ? createHistoryEntry({
          installedAt: state.startedAt,
          endedAt: today,
          duration: Math.max(1, daysBetween(state.startedAt, today)),
          paidValue: state.manual?.paidValue || '',
          notes: [state.manual?.notes, `Troca pelo botijão reserva. Motivo: ${reasonText}`].filter(Boolean).join(' '),
          brand: currentBrand,
        })
      : null
    const nextHistory = lastFinishedCycle ? [lastFinishedCycle, ...state.history].slice(0, 8) : state.history

    setState((current) => ({
      ...current,
      hasActiveCylinder: true,
      startedAt: today,
      history: nextHistory,
      lastFinishedCycle,
      currentBrand: reserveBrand,
      inventory: {
        reserveAvailable: false,
        reserveBrand: null,
        reservePurchasedAt: '',
        reservePaidValue: '',
        reserveId: '',
      },
      reserveHistory: updateReserveHistoryStatus(current.reserveHistory, state.inventory?.reserveId, 'used', {
        usedAt: today,
        notes: `Usado como botijão principal. Motivo: ${reasonText}`,
      }),
      manual: createManualFields({
        startedAt: today,
        endedAt: today,
        paidValue: state.inventory?.reservePaidValue || '',
        notes: state.inventory?.reservePurchasedAt
          ? `Botijão reserva comprado em ${formatDisplayDate(state.inventory.reservePurchasedAt)}.`
          : '',
      }),
      reminder: { enabled: false, scheduledFor: '' },
    }))

    void cancelGasReminder()
  }

  function updateManualField(field, value) {
    setState((current) => ({
      ...current,
      manual: {
        ...current.manual,
        [field]: field === 'paidValue' ? parseMoneyInput(value) : value,
      },
    }))
  }

  function registerCylinderChange() {
    if (!hasActiveCylinder) {
      const installedAt = state.manual?.installedAt || today

      setState((current) => ({
        ...current,
        hasActiveCylinder: true,
        startedAt: installedAt,
        manual: createManualFields({
          startedAt: installedAt,
          endedAt: installedAt,
          paidValue: state.manual?.paidValue || '',
          notes: state.manual?.notes || '',
        }),
        reminder: { enabled: false, scheduledFor: '' },
      }))

      void cancelGasReminder()
      return
    }

    const endedAt = state.manual?.endedAt || today
    const duration = Math.max(1, daysBetween(state.startedAt, endedAt))
    const lastFinishedCycle = createHistoryEntry({
      installedAt: state.startedAt,
      endedAt,
      duration,
      paidValue: state.manual?.paidValue || '',
      notes: state.manual?.notes || '',
      brand: currentBrand,
    })
    const nextHistory = [lastFinishedCycle, ...state.history].slice(0, 8)

    setState({
      hasActiveCylinder: true,
      startedAt: endedAt,
      cycleDays: DEFAULT_CYCLE_DAYS,
      history: nextHistory,
      manual: createManualFields({ startedAt: endedAt, endedAt }),
      lastFinishedCycle,
      currentBrand,
      inventory: state.inventory || { reserveAvailable: false, reserveBrand: null },
      reserveHistory: state.reserveHistory || [],
      reminder: { enabled: false, scheduledFor: '' },
    })

    void cancelGasReminder()
  }

  function startNewCylinder() {
    setState((current) => ({
      ...current,
      hasActiveCylinder: true,
      startedAt: today,
      manual: createManualFields({ startedAt: today, endedAt: today }),
      reminder: { enabled: false, scheduledFor: '' },
    }))

    void cancelGasReminder()
  }

  function requestResetDemo() {
    setResetConfirmationOpen(true)
  }

  function confirmResetDemo() {
    setState(createDefaultGasState(today, false))
    setResetConfirmationOpen(false)
    void cancelGasReminder()
  }

  function exportBackup() {
    const payload = {
      app: 'Controle Gás',
      version: 2,
      exportedAt: new Date().toISOString(),
      user: {
        name: currentUser.name,
        homeName: currentUser.homeName,
        email: currentUser.email,
        theme: currentUser.theme,
        residenceProfile: currentUser.residenceProfile,
      },
      data: state,
    }
    const backup = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(backup)
    const link = document.createElement('a')

    link.href = url
    link.download = `controle-gas-${currentUser.homeName.replaceAll(' ', '-').toLowerCase()}-${today}.json`
    link.click()
    URL.revokeObjectURL(url)
    setSettingsStatus('Backup exportado.')
  }

  function applyRestoredState(nextState) {
    setState(normalizeGasState(nextState, today))
  }

  function importBackup(event) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()

    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result)
        const nextState = parsed.data || parsed

        if (!nextState || typeof nextState !== 'object' || (!nextState.startedAt && typeof nextState.hasActiveCylinder !== 'boolean')) {
          throw new Error('backup-invalido')
        }

        applyRestoredState(nextState)
        setSettingsStatus('Backup importado.')
      } catch {
        setSettingsStatus('Não foi possível importar este arquivo.')
      } finally {
        event.target.value = ''
      }
    }

    reader.readAsText(file)
  }

  async function scheduleBuyReminder() {
    if (!hasActiveCylinder) {
      setNotificationStatus('Cadastre um botijão em uso antes de ativar lembrete.')
      return
    }

    setNotificationStatus('Configurando lembrete...')

    try {
      const currentPermission = await LocalNotifications.checkPermissions()
      const permission = currentPermission.display === 'granted'
        ? currentPermission
        : await LocalNotifications.requestPermissions()

      if (permission.display !== 'granted') {
        setNotificationStatus('Permissão de notificações não concedida.')
        return
      }

      const reminderDate = getReminderDate(today, stats.buyInDays)

      await LocalNotifications.cancel({
        notifications: [{ id: GAS_REMINDER_NOTIFICATION_ID }],
      })

      await LocalNotifications.schedule({
        notifications: [
          {
            id: GAS_REMINDER_NOTIFICATION_ID,
            title: 'Comprar gás',
            body: `Seu botijão está previsto para acabar em ${formatDisplayDate(stats.expectedEnd)}.`,
            schedule: { at: reminderDate },
          },
        ],
      })

      setState((current) => ({
        ...current,
        reminder: {
          enabled: true,
          scheduledFor: formatDateInput(reminderDate),
        },
      }))
      setNotificationStatus(`Lembrete ativo para ${formatDisplayDate(formatDateInput(reminderDate))}.`)
    } catch {
      setNotificationStatus('Notificações locais não estão disponíveis neste ambiente.')
    }
  }

  async function disableBuyReminder() {
    try {
      await cancelGasReminder()
      setState((current) => ({
        ...current,
        reminder: { enabled: false, scheduledFor: '' },
      }))
      setNotificationStatus('Lembrete cancelado.')
    } catch {
      setNotificationStatus('Não foi possível cancelar o lembrete neste ambiente.')
    }
  }

  return (
    <main className={`app-shell user-shell ${currentTheme.id}`}>
      <section className="hero-card">
        <div className="hero-copy">
          <div className="brand-row">
            <button
              type="button"
              className="header-logo-button"
              onClick={() => setActivePage('home')}
              aria-label="Ir para a tela inicial"
            >
              <AppLogo className="header-logo" />
            </button>
            <span className="eyebrow">{currentUser.homeName}</span>
          </div>
          <h1>Meu Gás</h1>
          <p>
            {intelligence.isUsingRealAverage
              ? `Previsão inteligente baseada na média móvel dos últimos ${intelligence.sampleSize} ciclos.`
              : `Estimativa inicial baseada em ${DEFAULT_CYCLE_DAYS} dias de consumo.`}
          </p>
        </div>

        <div className="hero-actions">
          <div className={`status-pill ${stats.status.tone}`}>{stats.status.label}</div>
          <button type="button" className="logout-button" onClick={onLogout}>Encerrar sessão</button>
        </div>
      </section>

      {activePage !== 'home' && (
        <section className="page-heading">
          <span className="eyebrow">Página atual</span>
          <h2>{pageTitle}</h2>
        </section>
      )}

      {activePage === 'home' && (
        <>
      <section className={`dashboard-card ${stats.status.tone}`}>
        <div className="dashboard-decoration kitchen" aria-hidden="true">
          <span></span><span></span><span></span>
        </div>
        <CylinderGauge percent={stats.percent} tone={stats.status.tone} />

        <div className="reading-panel">
          <span className="reading-label">Nível atual</span>
          <strong>{stats.percent}%</strong>
          <div className={`mini-level ${stats.status.tone}`}>☻ Nível: {stats.status.label}</div>
          <p>
            {!hasActiveCylinder
              ? 'Cadastre a instalação para iniciar o acompanhamento'
              : intelligence.isUsingRealAverage
              ? 'Estimativa baseada no seu consumo médio'
              : 'Estimativa baseada em consumo inicial'}
          </p>

          <div className={`progress-track ${stats.status.tone}`}>
            <span style={{ width: `${stats.percent}%` }}></span>
          </div>

          <div className="state-scale" aria-label="Estados visuais do botijão">
            {STATUS_STEPS.map((step) => (
              <span
                key={step.tone}
                className={`${step.tone}${stats.status.tone === step.tone ? ' active' : ''}`}
              >
                {step.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="metrics-grid">
        <article>
          <span>Dias de uso</span>
          <strong>{hasActiveCylinder ? stats.elapsedDays : '-'}</strong>
        </article>
        <article>
          <span>Dias restantes</span>
          <strong>{hasActiveCylinder ? stats.remainingDays : '-'}</strong>
        </article>
        <article>
          <span>Média de consumo</span>
          <strong>{intelligence.projectedCycleDays}</strong>
          <small>dias/botijão</small>
        </article>
      </section>

      <section className="forecast-card">
        <div>
          <span className="eyebrow">Previsão de término</span>
          <h2>{hasActiveCylinder ? formatDisplayDate(stats.expectedEnd) : 'Sem previsão'}</h2>
          <p>{hasActiveCylinder ? `Em ~${stats.remainingDays} dias` : 'Informe a data de instalação'}</p>
        </div>
        <div className={`forecast-ring ${stats.status.tone}`} style={{ '--gas-progress': stats.percent }} aria-hidden="true">
          <span>▣</span>
        </div>
      </section>

      <section className="quick-actions-card">
        <button type="button" className="primary register-main-button" onClick={() => setActivePage('history')}>
          {hasActiveCylinder ? 'Registrar novo botijão' : 'Iniciar controle'}
        </button>
      </section>

      <section className="home-secondary-grid">
        <article className="brand-dashboard-card">
          <div>
            <span className="eyebrow">Botijão atual</span>
            <h2>{currentBrand.name}</h2>
            <p>
              {hasActiveCylinder ? `Compra: ${formatDisplayDate(state.startedAt)}` : 'Nenhum botijão em uso'}
            </p>
          </div>
          <BrandLogo brand={currentBrand} />
        </article>

        <article className={`stock-card reserve-card ${state.inventory?.reserveAvailable ? 'available' : ''}`}>
          <div>
            <span className="eyebrow">Reserva</span>
            <h2>{state.inventory?.reserveAvailable ? 'Disponível' : 'Sem reserva'}</h2>
            <p>
              {state.inventory?.reserveAvailable
                ? `Pronto para troca${state.inventory.reserveBrand?.name ? ` • ${state.inventory.reserveBrand.name}` : ''}.`
                : 'Cadastre se tiver dois botijões.'}
            </p>
          </div>
          <div className="reserve-actions">
            {state.inventory?.reserveAvailable && (
              <button type="button" className="ghost compact-button" onClick={requestUseReserveCylinder}>
                Usar reserva
              </button>
            )}
            <button type="button" className="primary compact-button" onClick={() => setActivePage('stock')}>
              Gerenciar
            </button>
          </div>
        </article>
      </section>
        </>
      )}

      {activePage === 'stock' && (
        <>
      <section className="stock-overview">
        <article className={`stock-state-card in-use ${stats.status.tone}`}>
          <div className="stock-state-visual">
            <CylinderGauge percent={stats.percent} tone={stats.status.tone} />
          </div>
          <div className="stock-state-content">
            <span className="eyebrow">Botijão em uso</span>
            <h2>{hasActiveCylinder ? currentBrand.name : 'Não cadastrado'}</h2>
            <p>
              {hasActiveCylinder
                ? `Instalado em ${formatDisplayDate(state.startedAt)}. Restam aproximadamente ${stats.remainingDays} dias.`
                : 'Cadastre a data de instalação para começar o controle.'}
            </p>

            <div className="stock-state-metrics">
              <span>{stats.percent}%</span>
              <small>{stats.status.label}</small>
            </div>
          </div>
        </article>

        <article className={`stock-state-card reserve ${state.inventory?.reserveAvailable ? 'available' : 'empty'}`}>
          <div className="reserve-symbol" aria-hidden="true">
            {state.inventory?.reserveAvailable ? 'P13' : '+'}
          </div>
          <div className="stock-state-content">
            <span className="eyebrow">Botijão reserva</span>
            <h2>{state.inventory?.reserveAvailable ? 'Disponível' : 'Não cadastrado'}</h2>
            <p>
              {state.inventory?.reserveAvailable
                ? `${state.inventory.reserveBrand?.name || currentBrand.name} pronto para uso em uma emergência.`
                : 'Cadastre um segundo botijão para controlar estoque e troca emergencial.'}
            </p>

            {state.inventory?.reserveAvailable && (
              <div className="reserve-details">
                <span>Compra: {formatDisplayDate(state.inventory.reservePurchasedAt)}</span>
                {state.inventory.reservePaidValue && <span>Valor: {formatMoney(state.inventory.reservePaidValue)}</span>}
              </div>
            )}

            {state.inventory?.reserveAvailable && (
              <div className="stock-actions">
                <button type="button" className="primary" onClick={requestUseReserveCylinder}>
                  Usar reserva
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={removeReserveCylinder}
                >
                  Remover reserva
                </button>
              </div>
            )}
          </div>
        </article>

        <section className="reserve-purchase-card">
          <div>
            <span className="eyebrow">{state.inventory?.reserveAvailable ? 'Reposição' : 'Cadastrar reserva'}</span>
            <h2>{state.inventory?.reserveAvailable ? 'Comprar novo reserva' : 'Registrar botijão reserva'}</h2>
            <p>
              {state.inventory?.reserveAvailable
                ? 'Atualize estes dados quando comprar outro botijão para ficar guardado.'
                : 'Informe os dados do botijão que ficará disponível para troca.'}
            </p>
          </div>

          <form className="reserve-purchase-form" onSubmit={registerReservePurchase}>
            <label>
              Marca
              <select value={reserveForm.brandId} onChange={(event) => updateReserveForm('brandId', event.target.value)}>
                {GAS_BRANDS.map((brand) => (
                  <option key={brand.id} value={brand.id}>{brand.name}</option>
                ))}
              </select>
            </label>

            <label>
              Data da compra
              <input
                type="date"
                value={reserveForm.purchasedAt}
                max={today}
                onChange={(event) => updateReserveForm('purchasedAt', event.target.value || today)}
                onInput={(event) => updateReserveForm('purchasedAt', event.target.value || today)}
              />
            </label>

            <label>
              Valor pago
              <input
                type="text"
                inputMode="numeric"
                value={formatMoney(reserveForm.paidValue)}
                onChange={(event) => updateReserveForm('paidValue', event.target.value)}
                placeholder="Opcional"
              />
            </label>

            <button type="submit" className="primary">
              {state.inventory?.reserveAvailable ? 'Atualizar reserva' : 'Cadastrar reserva'}
            </button>
          </form>
        </section>

        <section className="reserve-history-card">
          <div>
            <span className="eyebrow">Histórico do reserva</span>
            <h2>Compras e reposições</h2>
          </div>

          {state.reserveHistory?.length > 0 ? (
            <div className="reserve-history-list">
              {state.reserveHistory.slice(0, 6).map((entry) => (
                <article key={entry.id} className={`reserve-history-item ${entry.status}`}>
                  <div>
                    <strong>{entry.brandName}</strong>
                    <span>
                      Compra: {formatDisplayDate(entry.purchasedAt)}
                      {entry.usedAt && ` • Saída: ${formatDisplayDate(entry.usedAt)}`}
                    </span>
                    {entry.notes && <small>{entry.notes}</small>}
                  </div>
                  <div className="reserve-history-meta">
                    <span>{getReserveStatusLabel(entry.status)}</span>
                    {entry.paidValue && <strong>{formatMoney(entry.paidValue)}</strong>}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-state">Nenhuma compra de reserva registrada ainda.</p>
          )}
        </section>
      </section>
        </>
      )}

      {activePage === 'alerts' && (
        <>
      <section className="alert-summary-grid">
        <article className={stats.buyInDays <= 7 ? 'low' : 'stable'}>
          <span>Comprar</span>
          <strong>{stats.recommendation}</strong>
        </article>
        <article className={stats.percent <= 10 ? 'critical' : 'stable'}>
          <span>Estoque</span>
          <strong>{!hasActiveCylinder ? 'Sem botijão' : stats.percent <= 10 ? 'Crítico' : state.inventory?.reserveAvailable ? 'Reserva ativa' : 'Monitorado'}</strong>
        </article>
        <article>
          <span>Termina</span>
          <strong>{hasActiveCylinder ? formatDisplayDate(stats.expectedEnd) : 'Sem previsão'}</strong>
        </article>
        <article className={state.reminder?.enabled ? 'stable' : ''}>
          <span>Lembrete</span>
          <strong>{state.reminder?.enabled ? formatDisplayDate(state.reminder.scheduledFor) : 'Inativo'}</strong>
        </article>
      </section>

      <section className="smart-alert-list">
        {smartAlerts.map((alert) => (
          <article key={alert.title} className={`alert-card ${alert.tone}`}>
            <div>
              <span className="eyebrow">Alerta inteligente</span>
              <h2>{alert.title}</h2>
              <p>{alert.message}</p>
            </div>
          </article>
        ))}
      </section>

      {!visualAlert && (
        <section className="alert-card ok">
          <div>
            <span className="eyebrow">Alertas</span>
            <h2>{hasActiveCylinder ? 'Nenhum alerta crítico agora' : 'Nenhum botijão em uso'}</h2>
            <p>
              {hasActiveCylinder
                ? 'O botijão está dentro do nível esperado. Você ainda pode ativar o lembrete de compra.'
                : 'Cadastre a data de instalação para habilitar alertas e previsão de término.'}
            </p>
          </div>
        </section>
      )}

      {hasActiveCylinder && state.inventory?.reserveAvailable && stats.percent <= 10 && (
        <section className="stock-card critical">
          <div>
            <span className="eyebrow">Ação recomendada</span>
            <h2>Troque pelo reserva</h2>
            <p>Depois da troca, compre um novo botijão para voltar a ter estoque de segurança.</p>
          </div>
          <button type="button" className="primary" onClick={requestUseReserveCylinder}>
            Trocar pelo reserva
          </button>
        </section>
      )}

      {reserveConfirmationOpen && (
        <section className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="reserve-confirm-title">
          <form className="modal-card" onSubmit={confirmUseReserveCylinder}>
            <div>
              <span className="eyebrow">Confirmar troca</span>
              <h2 id="reserve-confirm-title">Usar botijão reserva?</h2>
              <p>O botijão atual ainda está com {stats.percent}% estimado. Informe o motivo para registrar a troca.</p>
            </div>

            <label>
              Motivo
              <select value={reserveReason} onChange={(event) => setReserveReason(event.target.value)}>
                <option value="acabou">Acabou o gás</option>
                <option value="vazamento">Suspeita de vazamento</option>
                <option value="preventivo">Troca preventiva</option>
                <option value="outro">Outro motivo</option>
              </select>
            </label>

            {reserveReason === 'outro' && (
              <label>
                Observação
                <textarea
                  value={reserveReasonNotes}
                  onChange={(event) => setReserveReasonNotes(event.target.value)}
                  placeholder="Descreva o motivo da troca"
                />
              </label>
            )}

            <div className="modal-actions">
              <button type="button" className="ghost" onClick={() => setReserveConfirmationOpen(false)}>
                Cancelar
              </button>
              <button type="submit" className="primary">
                Confirmar troca
              </button>
            </div>
          </form>
        </section>
      )}

      <section className={`intelligence-card ${intelligence.pattern.tone}`}>
        <div className="intelligence-header">
          <div>
            <span className="eyebrow">Lembrete</span>
          <h2>{stats.recommendation}</h2>
          </div>
          <div className="intelligence-badge">
            {intelligence.isUsingRealAverage ? 'Média real' : 'Base inicial'}
          </div>
        </div>

        <div className="intelligence-grid">
          <article>
            <span>Comprar em</span>
            <strong>{hasActiveCylinder ? `${stats.buyInDays} dias` : '-'}</strong>
          </article>
          <article>
            <span>Previsão</span>
            <strong>{hasActiveCylinder ? formatDisplayDate(stats.expectedEnd) : 'Sem previsão'}</strong>
          </article>
        </div>

        <div className="reminder-actions">
          <button type="button" className="primary" onClick={scheduleBuyReminder}>
            {state.reminder?.enabled ? 'Reagendar lembrete' : 'Ativar lembrete de compra'}
          </button>

          {state.reminder?.enabled && (
            <button type="button" className="ghost" onClick={disableBuyReminder}>
              Cancelar lembrete
            </button>
          )}

          {(notificationStatus || state.reminder?.enabled) && (
            <span>
              {notificationStatus || `Lembrete ativo para ${formatDisplayDate(state.reminder.scheduledFor)}.`}
            </span>
          )}
        </div>
      </section>
        </>
      )}

      {activePage === 'history' && (
        <>
      <section className="form-card">
        <div className="form-header">
          <span className="eyebrow">Controle manual</span>
          <h2>{hasActiveCylinder ? 'Encerrar ciclo atual' : 'Iniciar botijão'}</h2>
        </div>

        <label>
          Data da instalação
          <input
            type="date"
            value={state.manual?.installedAt || state.startedAt || ''}
            max={today}
            disabled={hasActiveCylinder}
            onChange={updateStartedAt}
            onInput={updateStartedAt}
          />
          <small className="field-hint">
            {hasActiveCylinder
              ? 'Esta é a data em que o botijão atual entrou em uso e fica travada para manter o cálculo correto.'
              : 'Informe quando este botijão foi instalado. Depois de iniciar, esta data fica fixa.'}
          </small>
        </label>

        {hasActiveCylinder && (
          <label>
            Data em que acabou
            <input
              type="date"
              value={state.manual?.endedAt || state.startedAt || today}
              min={state.startedAt || undefined}
              max={today}
              onChange={(event) => updateManualField('endedAt', event.target.value || today)}
              onInput={(event) => updateManualField('endedAt', event.target.value || today)}
            />
            <small className="field-hint">
              Use este campo somente quando for registrar o fim deste botijão.
            </small>
          </label>
        )}

        <label>
          Valor pago
          <input
            type="text"
            inputMode="numeric"
            placeholder="Opcional"
            value={formatMoney(state.manual?.paidValue)}
            onChange={(event) => updateManualField('paidValue', event.target.value)}
          />
        </label>

        <label className="notes-field">
          Observações
          <textarea
            rows="3"
            placeholder="Opcional"
            value={state.manual?.notes || ''}
            onChange={(event) => updateManualField('notes', event.target.value)}
            onInput={(event) => updateManualField('notes', event.target.value)}
          />
        </label>

        <div className="brand-form-panel">
          <div className="brand-form-header">
            <div>
              <span className="eyebrow">Marca do gás</span>
              <strong>{currentBrand.name}</strong>
            </div>
            <BrandLogo brand={currentBrand} className="large" />
          </div>

          <label>
            Marca atual
            <select value={currentBrand.id} onChange={(event) => updateBrandFromSelect(event.target.value)}>
              {GAS_BRANDS.map((brand) => (
                <option key={brand.id} value={brand.id}>{brand.name}</option>
              ))}
            </select>
          </label>

          {currentBrand.id === 'outra' && (
            <label>
              Nome da marca
              <input
                value={currentBrand.name}
                placeholder="Ex.: Marca regional"
                onChange={(event) => updateCustomBrandName(event.target.value)}
              />
            </label>
          )}

          <div className="brand-upload-box">
            <div>
              <span className="eyebrow">Logo personalizado</span>
              <strong>{currentBrand.logo ? 'Preview ativo' : 'Avatar padrão'}</strong>
              <p>Formatos aceitos: JPG, PNG ou WEBP até 1 MB.</p>
            </div>

            <div className="brand-upload-actions">
              <label className="file-action compact">
                Escolher logo
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadBrandLogo} />
              </label>

              {currentBrand.logo && (
                <button type="button" className="ghost compact-button" onClick={removeBrandLogo}>
                  Remover logo
                </button>
              )}
            </div>
          </div>

          {brandUploadStatus && (
            <div className="brand-upload-status" role="status">
              {brandUploadStatus}
            </div>
          )}
        </div>

        <div className="actions">
          <button type="button" className="primary" onClick={registerCylinderChange}>
            {hasActiveCylinder ? 'Registrar botijão acabou' : 'Iniciar controle'}
          </button>
          <button type="button" onClick={startNewCylinder}>Iniciar botijão hoje</button>
          <button type="button" className="ghost" onClick={requestResetDemo}>Resetar</button>
        </div>

        {state.lastFinishedCycle && (
          <div className="cycle-feedback" role="status">
            Último ciclo fechado com {state.lastFinishedCycle.duration} dias.
          </div>
        )}
      </section>

      {state.history.length > 0 && (
        <section className="history-card">
          <div className="history-header">
            <div>
              <span className="eyebrow">Histórico</span>
              <h2>Últimas trocas</h2>
            </div>
            <div className="history-average">
              <span>Média real</span>
              <strong>{historyStats.averageDuration} dias</strong>
            </div>
          </div>

          <div className="history-list">
            {state.history.map((cycle) => (
              <article key={cycle.id} className="history-item">
                <div>
                  <strong>{cycle.duration} dias</strong>
                  <span>{formatDisplayDate(cycle.installedAt)} até {formatDisplayDate(cycle.endedAt)}</span>
                </div>

                <div className="history-brand">
                  <BrandLogo brand={{ name: cycle.brandName, logo: cycle.brandLogo }} />
                  <span>{cycle.brandName || 'Marca não informada'}</span>
                </div>

                {(cycle.paidValue || cycle.notes) && (
                  <div className="history-meta">
                    {cycle.paidValue && <span>{formatMoney(cycle.paidValue)}</span>}
                    {cycle.notes && <p>{cycle.notes}</p>}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
        </>
      )}

      {activePage === 'stats' && (
        <>
          <section className={`intelligence-card ${trendStats.consumptionTone}`}>
            <div className="intelligence-header">
              <div>
                <span className="eyebrow">Inteligência estatística</span>
                <h2>{trendStats.consumptionLabel}</h2>
              </div>
              <div className="intelligence-badge">
                {trendStats.recentAverage ? `${trendStats.recentAverage} dias` : 'Sem amostra'}
              </div>
            </div>

            <div className="trend-grid">
              <article>
                <span>Tendência de consumo</span>
                <strong>{trendStats.consumptionMessage}</strong>
              </article>
              <article>
                <span>Tendência de preço</span>
                <strong>
                  {trendStats.priceTrendLabel}
                  {trendStats.priceDelta ? ` (${formatMoney(Math.abs(trendStats.priceDelta))})` : ''}
                </strong>
              </article>
            </div>
          </section>

          <section className="metrics-grid stats-grid">
            <article>
              <span>Média geral</span>
              <strong>{consumptionStats.averageDuration} dias</strong>
            </article>
            <article>
              <span>Menor duração</span>
              <strong>{consumptionStats.shortestDuration} dias</strong>
            </article>
            <article>
              <span>Maior duração</span>
              <strong>{consumptionStats.longestDuration} dias</strong>
            </article>
            <article>
              <span>Consumo anual</span>
              <strong>{consumptionStats.annualConsumption} botijões</strong>
            </article>
          </section>

          <section className="metrics-grid stats-grid">
            <article>
              <span>Valor médio</span>
              <strong>{financialStats.averagePaid ? formatMoney(financialStats.averagePaid) : 'R$ 0,00'}</strong>
            </article>
            <article>
              <span>Gasto mensal</span>
              <strong>{financialStats.monthlySpend ? formatMoney(financialStats.monthlySpend) : 'R$ 0,00'}</strong>
            </article>
            <article>
              <span>Gasto anual</span>
              <strong>{financialStats.annualSpend ? formatMoney(financialStats.annualSpend) : 'R$ 0,00'}</strong>
            </article>
            <article>
              <span>Evolução</span>
              <strong>{financialStats.priceDelta ? formatMoney(financialStats.priceDelta) : 'R$ 0,00'}</strong>
            </article>
          </section>

          <section className="history-card">
            <div className="history-header">
              <div>
                <span className="eyebrow">Gráficos</span>
                <h2>Histórico de duração</h2>
              </div>
            </div>

            <div className="chart-list">
              {durationSeries.map((cycle) => (
                <div key={cycle.id} className="chart-row">
                  <span>{formatDisplayDate(cycle.endedAt)}</span>
                  <div><i style={{ width: `${Math.max(8, (cycle.duration / maxDuration) * 100)}%` }}></i></div>
                  <strong>{cycle.duration}d</strong>
                </div>
              ))}

              {durationSeries.length === 0 && <div className="empty-state">Registre ciclos para ver o gráfico.</div>}
            </div>
          </section>

          <section className="history-card">
            <div className="history-header">
              <div>
                <span className="eyebrow">Custos</span>
                <h2>Histórico de preços</h2>
              </div>
            </div>

            <div className="chart-list price">
              {priceSeries.map((cycle) => (
                <div key={cycle.id} className="chart-row">
                  <span>{formatDisplayDate(cycle.endedAt)}</span>
                  <div><i style={{ width: `${Math.max(8, (Number(cycle.paidValue) / maxPrice) * 100)}%` }}></i></div>
                  <strong>{formatMoney(cycle.paidValue)}</strong>
                </div>
              ))}

              {priceSeries.length === 0 && <div className="empty-state">Informe valores pagos para ver a evolução.</div>}
            </div>
          </section>

          <section className="history-card">
            <div className="history-header">
              <div>
                <span className="eyebrow">Histórico por marca</span>
                <h2>Média por marca</h2>
              </div>
            </div>

            {brandStats.length > 0 && (
              <div className="brand-highlight-grid">
                <article className="positive">
                  <span>Durou mais</span>
                  <strong>{bestBrand.name}</strong>
                  <small>{bestBrand.averageDuration} dias em média</small>
                </article>
                <article className="warning">
                  <span>Durou menos</span>
                  <strong>{shortestBrand.name}</strong>
                  <small>{shortestBrand.averageDuration} dias em média</small>
                </article>
              </div>
            )}

            <div className="brand-ranking">
              {brandStats.map((brand) => (
                <article key={brand.name}>
                  <BrandLogo brand={brand} />
                  <div className="brand-ranking-content">
                    <strong>{brand.name}</strong>
                    <span>{brand.cycles} ciclos • último em {formatDisplayDate(brand.lastCycleEndedAt)}</span>
                    <div className="brand-duration-bar">
                      <i style={{ width: `${Math.max(10, (brand.averageDuration / maxBrandAverage) * 100)}%` }}></i>
                    </div>
                    <small>
                      Média {brand.averageDuration} dias • menor {brand.shortestDuration} • maior {brand.longestDuration}
                    </small>
                  </div>
                </article>
              ))}

              {brandStats.length === 0 && <div className="empty-state">Registre trocas para comparar marcas.</div>}
            </div>
          </section>
        </>
      )}

      {activePage === 'profile' && (
      <section className="settings-card">
        <div className="settings-header">
          <div>
            <span className="eyebrow">Configurações</span>
            <h2>Editar cadastro</h2>
          </div>
        </div>

        <div className="theme-panel">
          <div className="theme-panel-header">
            <div>
              <span className="eyebrow">Tema atual</span>
              <strong>{currentTheme.name}</strong>
            </div>
            <span>{currentTheme.description}</span>
          </div>

          <div className="theme-grid" role="radiogroup" aria-label="Escolha do tema visual">
            {THEME_OPTIONS.map((theme) => (
              <button
                key={theme.id}
                type="button"
                className={`theme-option ${theme.id} ${currentUser.theme === theme.id ? 'active' : ''}`}
                onClick={() => onUpdateUserTheme(currentUser.id, theme.id)}
                aria-pressed={currentUser.theme === theme.id}
              >
                <span className="theme-preview" aria-hidden="true">
                  <i></i>
                  <b></b>
                </span>
                <strong>{theme.name}</strong>
                <small>{theme.description}</small>
              </button>
            ))}
          </div>
        </div>

        <form className="profile-form" onSubmit={saveProfile}>
          <div className="profile-avatar-panel">
            {profileForm.avatar
              ? <img className="profile-avatar large" src={profileForm.avatar} alt={profileForm.name || 'Perfil'} />
              : <ProfileAvatar user={{ ...currentUser, name: profileForm.name, residenceProfile: { avatar: '' } }} />}
            <div>
              <span className="eyebrow">Foto do perfil</span>
              <strong>{profileForm.homeName || currentUser.homeName}</strong>
              <label className="file-action compact">
                Upload de foto
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadProfileAvatar} />
              </label>
            </div>
          </div>

          <label>
            Nome do responsável
            <input
              value={profileForm.name}
              onChange={(event) => updateProfileField('name', event.target.value)}
              placeholder="Ex.: Adriano"
            />
          </label>

          <label>
            Nome da residência
            <input
              value={profileForm.homeName}
              onChange={(event) => updateProfileField('homeName', event.target.value)}
              placeholder="Ex.: Minha casa"
            />
          </label>

          <label>
            Cidade
            <input
              value={profileForm.city}
              onChange={(event) => updateProfileField('city', event.target.value)}
              placeholder="Ex.: São Paulo"
            />
          </label>

          <label>
            Estado
            <input
              value={profileForm.state}
              maxLength="2"
              onChange={(event) => updateProfileField('state', event.target.value.toUpperCase())}
              placeholder="SP"
            />
          </label>

          <label>
            E-mail de acesso
            <input
              type="email"
              value={profileForm.email}
              onChange={(event) => updateProfileField('email', event.target.value)}
            />
          </label>

          <label>
            Senha
            <input
              type="password"
              value={profileForm.password}
              onChange={(event) => updateProfileField('password', event.target.value)}
            />
          </label>

          <button type="submit" className="primary">Salvar cadastro</button>
        </form>

        <div className="settings-grid">
          <article>
            <span>Usuário</span>
            <strong>{currentUser.name}</strong>
          </article>
          <article>
            <span>Residência</span>
            <strong>
              {currentUser.homeName}
              {currentUser.residenceProfile?.city && ` • ${currentUser.residenceProfile.city}`}
              {currentUser.residenceProfile?.state && `/${currentUser.residenceProfile.state}`}
            </strong>
          </article>
          <article>
            <span>Ciclos salvos</span>
            <strong>{historyStats.totalCycles}</strong>
          </article>
          <article>
            <span>Tema</span>
            <strong>{currentTheme.name}</strong>
          </article>
        </div>

        <div className="settings-actions">
          <button type="button" className="primary" onClick={exportBackup}>
            Exportar backup
          </button>

          <label className="file-action">
            Importar backup
            <input type="file" accept="application/json" onChange={importBackup} />
          </label>
        </div>

        {settingsStatus && (
          <div className="settings-status" role="status">
            {settingsStatus}
          </div>
        )}
      </section>
      )}

      {resetConfirmationOpen && (
        <section className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="reset-confirm-title">
          <div className="modal-card danger-modal">
            <div>
              <span className="eyebrow">Ação irreversível</span>
              <h2 id="reset-confirm-title">Resetar todos os dados?</h2>
              <p>
                Esta ação apaga o controle atual desta casa para começar do zero.
                Use somente se os dados foram cadastrados errado, se está testando o app,
                ou se deseja limpar o histórico local deste usuário.
              </p>
            </div>

            <ul className="reset-warning-list">
              <li>Botijão em uso e previsão atual</li>
              <li>Histórico de trocas e médias calculadas</li>
              <li>Botijão reserva e histórico de estoque</li>
              <li>Lembretes e alertas configurados</li>
            </ul>

            <div className="modal-actions">
              <button type="button" className="ghost" onClick={() => setResetConfirmationOpen(false)}>
                Cancelar
              </button>
              <button type="button" className="danger-button" onClick={confirmResetDemo}>
                Sim, resetar
              </button>
            </div>
          </div>
        </section>
      )}

      <nav className="bottom-nav" aria-label="Navegação principal">
        {PAGE_OPTIONS.map((page) => (
          <button
            key={page.id}
            type="button"
            className={activePage === page.id ? 'active' : ''}
            onClick={() => setActivePage(page.id)}
          >
            <span>{page.icon}</span>
            <small>{page.label}</small>
          </button>
        ))}
      </nav>
    </main>
  )
}

function App() {
  const [users, setUsers] = useState(loadUsers)
  const [session, setSession] = useState(loadSession)
  const [, setStorageStatus] = useState('Sincronizando com MySQL...')
  const [remoteReady, setRemoteReady] = useState(false)
  const saveTimerRef = useRef(null)

  const currentUser = useMemo(
    () => users.find((user) => user.id === session?.userId) || null,
    [session, users],
  )

  useEffect(() => {
    let isActive = true

    loadRemoteUsers()
      .then((remoteUsers) => {
        if (!isActive) return
        setUsers(remoteUsers)
        setStorageStatus('Dados sincronizados com MySQL.')
      })
      .catch(() => {
        if (!isActive) return
        setStorageStatus('MySQL indisponível. Usando cópia local neste dispositivo.')
      })
      .finally(() => {
        if (isActive) setRemoteReady(true)
      })

    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    saveUsers(users)

    if (!remoteReady) return undefined

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }

    saveTimerRef.current = setTimeout(() => {
      saveRemoteUsers(users)
        .then(() => setStorageStatus('Dados sincronizados com MySQL.'))
        .catch(() => setStorageStatus('MySQL indisponível. Alterações salvas localmente.'))
    }, 500)

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [remoteReady, users])

  useEffect(() => {
    const theme = currentUser?.theme || 'blue-modern'
    document.documentElement.dataset.theme = theme
  }, [currentUser?.theme])

  function login(user) {
    const nextSession = { userId: user.id, role: user.role }
    setSession(nextSession)
    saveSession(nextSession)
  }

  function logout() {
    setSession(null)
    clearSession()
  }

  function createNewUser(user) {
    setUsers((current) => [...current, user])
  }

  function updateUserProfile(userId, profile) {
    const normalizedEmail = profile.email.trim().toLowerCase()
    const emailAlreadyExists = users.some((user) => user.id !== userId && user.email === normalizedEmail)

    if (emailAlreadyExists) {
      return { ok: false, message: 'Já existe outro usuário com este e-mail.' }
    }

    setUsers((current) => current.map((user) => (
      user.id === userId
        ? {
            ...user,
            name: profile.name.trim(),
            homeName: profile.homeName.trim(),
            email: normalizedEmail,
            password: profile.password.trim(),
            residenceProfile: {
              city: profile.residenceProfile?.city || '',
              state: profile.residenceProfile?.state || '',
              avatar: profile.residenceProfile?.avatar || '',
              updatedAt: formatDateInput(new Date()),
            },
          }
        : user
    )))

    return { ok: true, message: 'Cadastro atualizado.' }
  }

  function updateUserTheme(userId, themeId) {
    const nextTheme = getThemeOption(themeId).id

    setUsers((current) => current.map((user) => (
      user.id === userId ? { ...user, theme: nextTheme } : user
    )))
  }

  const updateUserState = useCallback((userId, nextState) => {
    setUsers((current) => {
      let hasChanges = false

      const nextUsers = current.map((user) => {
        if (user.id !== userId) return user

        const currentState = JSON.stringify(user.state)
        const incomingState = JSON.stringify(nextState)

        if (currentState === incomingState) {
          return user
        }

        hasChanges = true
        return { ...user, state: nextState }
      })

      return hasChanges ? nextUsers : current
    })
  }, [])

  if (!currentUser) {
    return <LoginScreen users={users} onLogin={login} onCreateUser={createNewUser} />
  }

  if (currentUser.role === 'admin') {
    return <AdminDashboard users={users} onLogout={logout} />
  }

  return (
    <UserHome
      key={currentUser.id}
      currentUser={currentUser}
      onUpdateUserState={updateUserState}
      onUpdateUserProfile={updateUserProfile}
      onUpdateUserTheme={updateUserTheme}
      onLogout={logout}
    />
  )
}

export default App
