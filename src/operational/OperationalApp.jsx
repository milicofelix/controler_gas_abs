import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { normalizeWhatsAppPhone } from '../whatsappStatus.js'
import {
  createReserveHistoryEntry,
  updateReserveHistoryStatus,
} from '../reserveHistory.js'
import { replaceActiveCylinder, startCylinderControl } from '../gasStateTransitions.js'
import { readImageFile } from '../imageUpload.js'
import { PAGE_OPTIONS, THEME_OPTIONS, getThemeOption } from '../appOptions.js'
import {
  AppLogo,
  cancelGasReminder,
} from '../components/GasVisuals.jsx'
import OperationalShell from './components/OperationalShell.jsx'
import DashboardFeature from './features/dashboard/DashboardFeature.jsx'
import CylinderOperationsFeature from './features/cylinders/CylinderOperationsFeature.jsx'
import HistoryTimelineFeature from './features/history/HistoryTimelineFeature.jsx'
import AlertsCenterFeature from './features/alerts/AlertsCenterFeature.jsx'
import AnalyticsFeature from './features/analytics/AnalyticsFeature.jsx'
import ProfileSettingsFeature from './features/profile/ProfileSettingsFeature.jsx'
import { useOperationalNavigation } from './hooks/useOperationalNavigation.js'

function isRunningStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

export default function OperationalApp({ currentUser, onUpdateUserState, onUpdateUserProfile, onUpdateUserTheme, onLogout, storageStatus, lastSyncedAt, onRestoreUserFromServer, installPromptAvailable, installationStatus, onRequestInstall, updateAvailable, onUpdateNow }) {
  const { activePage, navigate: setActivePage } = useOperationalNavigation(PAGE_OPTIONS)
  const [state, setState] = useState(() => normalizeGasState(currentUser.state))
  const [stockIntent, setStockIntent] = useState('')
  const [alertsIntent, setAlertsIntent] = useState('')
  const [notificationStatus, setNotificationStatus] = useState('')
  const [settingsStatus, setSettingsStatus] = useState('')
  const [standaloneMode, setStandaloneMode] = useState(isRunningStandalone)
  const [editingContexts, setEditingContexts] = useState({})
  const [updateProtectionMessage, setUpdateProtectionMessage] = useState('')
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
  const hasUnsavedForm = Object.values(editingContexts).some(Boolean)

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

  useEffect(() => {
    const url = new URL(window.location.href)
    const shortcutAction = url.searchParams.get('action')
    if (!['replace', 'replace-reserve', 'reserve'].includes(shortcutAction)) return
    setStockIntent(shortcutAction)
    setActivePage('stock')
    url.searchParams.delete('action')
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
  }, [setActivePage])


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

  const setEditingContext = useCallback((context, active) => {
    setEditingContexts((current) => {
      if (current[context] === active) return current
      return { ...current, [context]: active }
    })
  }, [])
  const handleCylinderEditing = useCallback((active) => setEditingContext('cylinder-operation', active), [setEditingContext])
  const handleProfileEditing = useCallback((active) => setEditingContext('profile', active), [setEditingContext])

  function requestApplicationUpdate() {
    if (hasUnsavedForm) {
      setUpdateProtectionMessage('Conclua ou cancele o formulário aberto antes de atualizar. Seus dados preenchidos foram preservados.')
      return
    }
    setUpdateProtectionMessage('')
    onUpdateNow()
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

  function applyImportedState(nextState) {
    setState(normalizeGasState(nextState, today))
  }

  async function restoreFromServer() {
    const result = await onRestoreUserFromServer(currentUser.id)
    if (result.ok) {
      setState(normalizeGasState(result.user.state, today))
      setProfileForm({
        name: result.user.name || '',
        homeName: result.user.homeName || '',
        email: result.user.email || '',
        password: result.user.password || '',
        city: result.user.residenceProfile?.city || '',
        state: result.user.residenceProfile?.state || '',
        whatsapp: result.user.residenceProfile?.whatsapp || '',
        avatar: result.user.residenceProfile?.avatar || '',
      })
    }
    return result
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

      {updateAvailable && (
        <section className="pwa-update-banner" role="status">
          <div><strong>Atualização disponível</strong><span>{hasUnsavedForm ? 'Finalize o formulário aberto para atualizar com segurança.' : 'Uma nova versão do Meu Gás está pronta.'}</span>{updateProtectionMessage && <small>{updateProtectionMessage}</small>}</div>
          <button type="button" className="primary" onClick={requestApplicationUpdate}>Atualizar agora</button>
        </section>
      )}

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
          onEditingChange={handleCylinderEditing}
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
        <ProfileSettingsFeature
          currentUser={currentUser}
          state={state}
          profileForm={profileForm}
          themes={THEME_OPTIONS}
          currentTheme={currentTheme}
          storageStatus={storageStatus}
          lastSyncedAt={lastSyncedAt}
          standaloneMode={standaloneMode}
          profileStatus={settingsStatus}
          onProfileFieldChange={updateProfileField}
          onUploadAvatar={uploadProfileAvatar}
          onSaveProfile={saveProfile}
          onUpdateTheme={(themeId) => onUpdateUserTheme(currentUser.id, themeId)}
          onApplyImportedState={applyImportedState}
          onRestoreServer={restoreFromServer}
          installPromptAvailable={installPromptAvailable}
          installationStatus={installationStatus}
          onRequestInstall={onRequestInstall}
          updateAvailable={updateAvailable}
          onUpdateNow={requestApplicationUpdate}
          updateBlocked={hasUnsavedForm}
          onEditingChange={handleProfileEditing}
        />
      )}


    </OperationalShell>
  )
}

