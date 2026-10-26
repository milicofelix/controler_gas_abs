import { useEffect, useMemo, useRef, useState } from 'react'
import { LocalNotifications } from '@capacitor/local-notifications'
import {
  DEFAULT_GAS_BRAND,
  GAS_REMINDER_NOTIFICATION_ID,
  GAS_BRANDS,
  averageDuration,
  calculateBrandStats,
  calculateConsumptionStats,
  calculateFinancialStats,
  calculateTrendStats,
  createManualFields,
  formatDateInput,
  formatDisplayDate,
  formatMoney,
  getAlert,
  getReminderDate,
  getSmartAlerts,
  normalizeBrand,
  parseMoneyInput,
} from '../gasMath.js'
import { createDefaultGasState, normalizeGasState } from '../authStorage.js'
import { buildIntelligence, getUserStats } from '../userStats.js'
import { formatWhatsAppDisplay, normalizeWhatsAppPhone } from '../whatsappStatus.js'
import {
  createReserveHistoryEntry,
  getReserveReasonText,
  getReserveStatusLabel,
  updateReserveHistoryStatus,
} from '../reserveHistory.js'
import { replaceActiveCylinder } from '../gasStateTransitions.js'
import { readImageFile } from '../imageUpload.js'
import { PAGE_OPTIONS, THEME_OPTIONS, getThemeOption } from '../appOptions.js'
import {
  AppLogo,
  BrandLogo,
  ProfileAvatar,
  CylinderGauge,
  cancelGasReminder,
} from '../components/GasVisuals.jsx'
import OperationalShell from './components/OperationalShell.jsx'
import DashboardFeature from './features/dashboard/DashboardFeature.jsx'
import { useOperationalNavigation } from './hooks/useOperationalNavigation.js'

export default function OperationalApp({ currentUser, onUpdateUserState, onUpdateUserProfile, onUpdateUserTheme, onLogout }) {
  const { activePage, navigate: setActivePage } = useOperationalNavigation(PAGE_OPTIONS)
  const [state, setState] = useState(() => normalizeGasState(currentUser.state))
  const [reserveConfirmationOpen, setReserveConfirmationOpen] = useState(false)
  const [resetConfirmationOpen, setResetConfirmationOpen] = useState(false)
  const [reserveReason, setReserveReason] = useState('acabou')
  const [reserveReasonNotes, setReserveReasonNotes] = useState('')
  const [reserveSwitchDate, setReserveSwitchDate] = useState(formatDateInput(new Date()))
  const [reserveForm, setReserveForm] = useState(() => ({
    brandId: currentUser.state?.inventory?.reserveBrand?.id || currentUser.state?.currentBrand?.id || DEFAULT_GAS_BRAND.id,
    purchasedAt: currentUser.state?.inventory?.reservePurchasedAt || formatDateInput(new Date()),
    paidValue: currentUser.state?.inventory?.reservePaidValue || '',
  }))
  const [notificationStatus, setNotificationStatus] = useState('')
  const [settingsStatus, setSettingsStatus] = useState('')
  const [brandUploadStatus, setBrandUploadStatus] = useState('')
  const [cycleOperationStatus, setCycleOperationStatus] = useState('')
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

  function registerReservePurchase(event) {
    event.preventDefault()
    const reserveBrand = GAS_BRANDS.find((brand) => brand.id === reserveForm.brandId) || DEFAULT_GAS_BRAND
    const purchasedAt = reserveForm.purchasedAt || today
    const reserveEntry = createReserveHistoryEntry({
      brand: reserveBrand,
      purchasedAt,
      paidValue: reserveForm.paidValue || '',
      today,
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

  function requestUseReserveCylinder() {
    const manualEndedAt = state.manual?.endedAt
    setReserveSwitchDate(manualEndedAt && manualEndedAt > state.startedAt ? manualEndedAt : today)
    setReserveConfirmationOpen(true)
  }

  function confirmUseReserveCylinder(event) {
    event.preventDefault()
    const reasonText = getReserveReasonText(reserveReason, reserveReasonNotes)
    const switchedAt = reserveSwitchDate || today

    const result = applyReserveCylinder(reasonText, switchedAt)
    if (!result.ok) return

    setReserveConfirmationOpen(false)
    setReserveReason('acabou')
    setReserveReasonNotes('')
    setReserveSwitchDate(today)
  }

  function applyReserveCylinder(reasonText, switchedAt = today) {
    return performCylinderReplacement({
      endedAt: switchedAt,
      source: 'reserve',
      reasonText,
    })
  }

  function performCylinderReplacement(options) {
    if (replacementLockRef.current) {
      const result = { ok: false, message: 'A troca já está sendo processada.' }
      setCycleOperationStatus(result.message)
      return result
    }

    replacementLockRef.current = true
    const result = replaceActiveCylinder(state, options)
    setCycleOperationStatus(result.message)

    if (result.ok) {
      setState(result.state)
      void cancelGasReminder()
    }

    queueMicrotask(() => {
      replacementLockRef.current = false
    })

    return result
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

    performCylinderReplacement({
      endedAt: state.manual?.endedAt || today,
      source: 'manual',
    })
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
          onScheduleReminder={scheduleBuyReminder}
        />
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

        <section className="form-card">
          <div className="form-header">
            <span className="eyebrow">Operação</span>
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
            <button type="button" className="ghost" onClick={requestResetDemo}>Resetar</button>
          </div>

          {cycleOperationStatus && (
            <div className="cycle-feedback" role="status">
              {cycleOperationStatus}
            </div>
          )}

          {state.lastFinishedCycle && (
            <div className="cycle-feedback" role="status">
              Último ciclo fechado com {state.lastFinishedCycle.duration} dias.
            </div>
          )}
        </section>

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
        <section className="history-card">
          <div className="history-header">
            <div>
              <span className="eyebrow">Histórico</span>
              <h2>Últimas trocas</h2>
            </div>
            {state.history.length > 0 && (
              <div className="history-average">
                <span>Média real</span>
                <strong>{historyStats.averageDuration} dias</strong>
              </div>
            )}
          </div>

          {state.history.length > 0 ? (
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
          ) : (
            <div className="empty-state">
              Nenhuma troca registrada ainda. Para iniciar ou encerrar um botijão, use a tela Estoque.
            </div>
          )}
        </section>
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

      {reserveConfirmationOpen && (
        <section className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="reserve-confirm-title">
          <form className="modal-card" onSubmit={confirmUseReserveCylinder}>
            <div>
              <span className="eyebrow">Confirmar troca</span>
              <h2 id="reserve-confirm-title">Usar botijão reserva?</h2>
              <p>
                Informe a data real em que a troca aconteceu. Isso evita que o histórico,
                a média e a previsão usem a data de hoje quando você registrou atrasado.
              </p>
            </div>

            <label>
              Data da troca
              <input
                type="date"
                value={reserveSwitchDate}
                min={hasActiveCylinder ? state.startedAt : undefined}
                max={today}
                onChange={(event) => setReserveSwitchDate(event.target.value || today)}
                onInput={(event) => setReserveSwitchDate(event.target.value || today)}
              />
            </label>

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

    </OperationalShell>
  )
}

