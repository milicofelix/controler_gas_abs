import { useEffect, useMemo, useRef, useState } from 'react'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Capacitor } from '@capacitor/core'
import {
  GAS_REMINDER_NOTIFICATION_ID,
  averageDuration,
  formatDateInput,
  formatDisplayDate,
  getReminderDate,
  getSmartAlerts,
  getAnalyticsHistoryAudit,
  normalizeBrand,
} from '../gasMath.js'
import { normalizeGasState } from '../authStorage.js'
import { buildIntelligence, getUserStats } from '../userStats.js'
import { formatWhatsAppDisplay, normalizeWhatsAppPhone } from '../whatsappStatus.js'
import {
  createReserveHistoryEntry,
  updateReserveHistoryStatus,
} from '../reserveHistory.js'
import { replaceActiveCylinder, startCylinderControl } from '../gasStateTransitions.js'
import { readImageFile } from '../imageUpload.js'
import { PAGE_OPTIONS, THEME_OPTIONS, getThemeOption } from '../appOptions.js'
import {
  AppLogo,
  ProfileAvatar,
  cancelGasReminder,
} from '../components/GasVisuals.jsx'
import OperationalShell from './components/OperationalShell.jsx'
import DashboardFeature from './features/dashboard/DashboardFeature.jsx'
import CylinderOperationsFeature from './features/cylinders/CylinderOperationsFeature.jsx'
import HistoryTimelineFeature from './features/history/HistoryTimelineFeature.jsx'
import AlertsCenterFeature from './features/alerts/AlertsCenterFeature.jsx'
import AnalyticsFeature from './features/analytics/AnalyticsFeature.jsx'
import { useOperationalNavigation } from './hooks/useOperationalNavigation.js'

function isRunningStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

export default function OperationalApp({ currentUser, onUpdateUserState, onUpdateUserProfile, onUpdateUserTheme, onLogout, storageStatus }) {
  const { activePage, navigate: setActivePage } = useOperationalNavigation(PAGE_OPTIONS)
  const [state, setState] = useState(() => normalizeGasState(currentUser.state))
  const [stockIntent, setStockIntent] = useState('')
  const [alertsIntent, setAlertsIntent] = useState('')
  const [notificationStatus, setNotificationStatus] = useState('')
  const [settingsStatus, setSettingsStatus] = useState('')
  const [standaloneMode, setStandaloneMode] = useState(isRunningStandalone)
  const replacementLockRef = useRef(false)
  const [profileForm, setProfileForm] = useState(() => ({
    name: currentUser.name || '',
    homeName: currentUser.homeName || '',
    email: currentUser.email || '',
    password: currentUser.password || '',
    city: currentUser.residenceProfile?.city || '',
    state: currentUser.residenceProfile?.state || '',
    whatsapp: currentUser.residenceProfile?.whatsapp || '',
    avatar: currentUser.residenceProfile?.avatar || '',
  }))
  const currentTheme = getThemeOption(currentUser.theme)
  const currentBrand = normalizeBrand(state.currentBrand)

  const today = formatDateInput(new Date())
  const hasActiveCylinder = Boolean(state.hasActiveCylinder && state.startedAt)

  const intelligence = useMemo(() => buildIntelligence(state.history), [state.history])

  const stats = useMemo(() => (
    getUserStats({ state }, today).stats
  ), [state, today])

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

  const historyStats = useMemo(() => {
    const { validCycles } = getAnalyticsHistoryAudit(state.history)
    if (validCycles.length === 0) {
      return { averageDuration: 0, totalCycles: 0 }
    }

    return {
      averageDuration: averageDuration(validCycles),
      totalCycles: validCycles.length,
    }
  }, [state.history])

  useEffect(() => {
    onUpdateUserState(currentUser.id, state)
  }, [currentUser.id, onUpdateUserState, state])

  useEffect(() => {
    const displayMode = window.matchMedia('(display-mode: standalone)')
    const updateDisplayMode = () => setStandaloneMode(isRunningStandalone())

    displayMode.addEventListener('change', updateDisplayMode)
    return () => displayMode.removeEventListener('change', updateDisplayMode)
  }, [])


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
        whatsapp: normalizeWhatsAppPhone(profileForm.whatsapp),
        avatar: profileForm.avatar,
      },
    })

    if (!result.ok) {
      setSettingsStatus(result.message)
      return
    }

    setSettingsStatus('Cadastro atualizado.')
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

  function requestUseReserveCylinder() {
    setStockIntent('replace-reserve')
    setActivePage('stock')
  }

  function requestRegisterReserve() {
    setStockIntent('reserve')
    setActivePage('stock')
  }

  function requestReminderFlow() {
    setAlertsIntent('reminder')
    setActivePage('alerts')
  }

  function startControl(input) {
    const result = startCylinderControl(state, { ...input, today })
    if (result.ok) {
      setState(result.state)
      void cancelGasReminder()
    }

    return result
  }

  function saveReserve(input) {
    const reserveEntry = createReserveHistoryEntry({
      brand: input.brand,
      purchasedAt: input.purchasedAt,
      paidValue: input.paidValue,
      today,
    })
    const nextState = {
      ...state,
      inventory: {
        reserveAvailable: true,
        reserveBrand: normalizeBrand(input.brand),
        reservePurchasedAt: input.purchasedAt,
        reservePaidValue: input.paidValue || '',
        reserveId: reserveEntry.id,
      },
      reserveHistory: [
        reserveEntry,
        ...updateReserveHistoryStatus(state.reserveHistory, state.inventory?.reserveId, 'replaced', {
          usedAt: input.purchasedAt,
          notes: `Substituído por nova compra de reserva. Motivo: ${input.reason}`,
        }),
      ].slice(0, 20),
    }

    setState(nextState)
    return {
      ok: true,
      message: state.inventory?.reserveAvailable
        ? 'Reserva substituída sem alterar o ciclo atual.'
        : 'Botijão reserva cadastrado.',
      state: nextState,
    }
  }

  function removeReserve({ reason }) {
    if (!state.inventory?.reserveAvailable) {
      return { ok: false, message: 'Não há botijão reserva para remover.', state }
    }

    const nextState = {
      ...state,
      inventory: {
        reserveAvailable: false,
        reserveBrand: null,
        reservePurchasedAt: '',
        reservePaidValue: '',
        reserveId: '',
      },
      reserveHistory: updateReserveHistoryStatus(state.reserveHistory, state.inventory?.reserveId, 'removed', {
        usedAt: today,
        notes: `Reserva removida. Motivo: ${reason}`,
      }),
    }

    setState(nextState)
    return { ok: true, message: 'Reserva removida sem alterar o ciclo atual.', state: nextState }
  }

  function performCylinderReplacement(options) {
    if (replacementLockRef.current) {
      const result = { ok: false, message: 'A troca já está sendo processada.' }
      return result
    }

    replacementLockRef.current = true
    const result = replaceActiveCylinder(state, options)
    if (result.ok) {
      setState(result.state)
      void cancelGasReminder()
    }

    queueMicrotask(() => {
      replacementLockRef.current = false
    })

    return result
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
      const reminderDate = getReminderDate(today, stats.buyInDays)
      let statusMessage = ''

      if (Capacitor.isNativePlatform()) {
        const currentPermission = await LocalNotifications.checkPermissions()
        const permission = currentPermission.display === 'granted'
          ? currentPermission
          : await LocalNotifications.requestPermissions()

        if (permission.display === 'granted') {
          await LocalNotifications.cancel({ notifications: [{ id: GAS_REMINDER_NOTIFICATION_ID }] })
          await LocalNotifications.schedule({
            notifications: [{
              id: GAS_REMINDER_NOTIFICATION_ID,
              title: 'Comprar gás',
              body: `Seu botijão está previsto para acabar em ${formatDisplayDate(stats.expectedEnd)}.`,
              schedule: { at: reminderDate },
            }],
          })
          statusMessage = `Notificação e lembrete visual ativos para ${formatDisplayDate(formatDateInput(reminderDate))}.`
        } else {
          statusMessage = 'Permissão negada. O lembrete visual continuará ativo nesta central.'
        }
      } else if ('Notification' in window) {
        const permission = window.Notification.permission === 'default'
          ? await window.Notification.requestPermission()
          : window.Notification.permission
        statusMessage = permission === 'granted'
          ? 'Permissão concedida. Neste navegador, o lembrete visual permanecerá como alternativa principal.'
          : 'Permissão negada. O lembrete visual continuará ativo nesta central.'
      } else {
        statusMessage = 'Notificações do sistema não são suportadas aqui. O lembrete visual foi ativado.'
      }

      setState((current) => ({
        ...current,
        reminder: {
          enabled: true,
          scheduledFor: formatDateInput(reminderDate),
        },
      }))
      setNotificationStatus(statusMessage)
    } catch {
      const reminderDate = getReminderDate(today, stats.buyInDays)
      setState((current) => ({
        ...current,
        reminder: { enabled: true, scheduledFor: formatDateInput(reminderDate) },
      }))
      setNotificationStatus('Não foi possível ativar a notificação do sistema. O lembrete visual foi mantido.')
    }
  }

  async function disableBuyReminder() {
    let statusMessage = 'Lembrete cancelado.'
    try {
      if (Capacitor.isNativePlatform()) await cancelGasReminder()
    } catch {
      statusMessage = 'A notificação do sistema pode continuar ativa, mas o lembrete visual foi cancelado.'
    }
    setState((current) => ({
      ...current,
      reminder: { enabled: false, scheduledFor: '' },
    }))
    setNotificationStatus(statusMessage)
  }

  return (
    <OperationalShell
      themeId={currentTheme.id}
      activePage={activePage}
      pages={PAGE_OPTIONS}
      onNavigate={setActivePage}
    >
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
            <div className="header-identity">
              <h1>Meu Gás</h1>
              <span>{currentUser.homeName}</span>
              <small>Logado como {currentUser.name}</small>
            </div>
          </div>
        </div>

        <div className="hero-actions">
          <div className="header-session">
            <strong>{currentUser.name}</strong>
            <span>{currentUser.email}</span>
          </div>
          <div className={`status-pill ${stats.status.tone}`}>{stats.status.label}</div>
          <button type="button" className="logout-button" onClick={onLogout}>Encerrar sessão</button>
        </div>
      </section>

      <section className="mobile-area-banner" aria-label="Identificação da área móvel">
        <span className="mobile-area-icon" aria-hidden="true">▣</span>
        <div>
          <strong>Área móvel</strong>
          <small>Operação rápida de botijões</small>
        </div>
        <span className={`mobile-runtime-status ${standaloneMode ? 'standalone' : 'browser'}`}>
          {standaloneMode ? 'Modo aplicativo' : 'Aberto no navegador'}
        </span>
      </section>

      {activePage !== 'home' && (
        <section className="page-heading">
          <span className="eyebrow">Página atual</span>
          <h2>{pageTitle}</h2>
        </section>
      )}

      {activePage === 'home' && (
        <DashboardFeature
          state={state}
          stats={stats}
          intelligence={intelligence}
          currentBrand={currentBrand}
          hasActiveCylinder={hasActiveCylinder}
          primaryAlert={smartAlerts[0]}
          notificationStatus={notificationStatus}
          onNavigate={setActivePage}
          onUseReserve={requestUseReserveCylinder}
          onScheduleReminder={requestReminderFlow}
        />
      )}

      {activePage === 'stock' && (
        <CylinderOperationsFeature
          state={state}
          stats={stats}
          currentBrand={currentBrand}
          hasActiveCylinder={hasActiveCylinder}
          today={today}
          initialIntent={stockIntent}
          onIntentHandled={() => setStockIntent('')}
          onStartControl={startControl}
          onReplaceCylinder={performCylinderReplacement}
          onSaveReserve={saveReserve}
          onRemoveReserve={removeReserve}
        />
      )}

      {activePage === 'alerts' && (
        <AlertsCenterFeature
          state={state}
          stats={stats}
          hasActiveCylinder={hasActiveCylinder}
          storageStatus={storageStatus}
          notificationStatus={notificationStatus}
          initialIntent={alertsIntent}
          onIntentHandled={() => setAlertsIntent('')}
          onRegisterReserve={requestRegisterReserve}
          onUseReserve={requestUseReserveCylinder}
          onOpenOperation={() => setActivePage('stock')}
          onActivateReminder={scheduleBuyReminder}
          onCancelReminder={disableBuyReminder}
        />
      )}

      {activePage === 'history' && (
        <HistoryTimelineFeature
          history={state.history}
          reserveHistory={state.reserveHistory}
          averageDuration={historyStats.averageDuration}
        />
      )}

      {activePage === 'stats' && (
        <AnalyticsFeature history={state.history} />
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
            WhatsApp
            <input
              inputMode="tel"
              value={formatWhatsAppDisplay(profileForm.whatsapp)}
              onChange={(event) => updateProfileField('whatsapp', event.target.value)}
              placeholder="(11) 99999-9999"
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


    </OperationalShell>
  )
}

