import { useEffect, useMemo, useState } from 'react'
import { LocalNotifications } from '@capacitor/local-notifications'
import {
  DEFAULT_CYCLE_DAYS,
  GAS_REMINDER_NOTIFICATION_ID,
  MOVING_AVERAGE_LIMIT,
  STORAGE_KEY,
  averageDuration,
  calculateStats,
  createHistoryEntry,
  createManualFields,
  daysBetween,
  detectConsumptionPattern,
  formatDateInput,
  formatDisplayDate,
  formatMoney,
  getAlert,
  getReminderDate,
  normalizeHistory,
} from './gasMath'
import './App.css'

const STATUS_STEPS = [
  { label: 'Cheio', tone: 'full' },
  { label: 'Médio', tone: 'medium' },
  { label: 'Baixo', tone: 'low' },
  { label: 'Crítico', tone: 'critical' },
]

async function cancelGasReminder() {
  try {
    await LocalNotifications.cancel({
      notifications: [{ id: GAS_REMINDER_NOTIFICATION_ID }],
    })
  } catch {
    // O cancelamento pode falhar no navegador; o app segue funcionando.
  }
}

function loadInitialState() {
  const today = formatDateInput(new Date())

  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (stored?.startedAt) {
      const manual = stored.manual ? {
        installedAt: stored.manual.installedAt || stored.startedAt,
        endedAt: stored.manual.endedAt || today,
        paidValue: stored.manual.paidValue || '',
        notes: stored.manual.notes || '',
      } : createManualFields({
        startedAt: stored.startedAt,
        endedAt: today,
        paidValue: stored.paidValue,
        notes: stored.notes,
      })

      return {
        startedAt: manual.installedAt || stored.startedAt,
        cycleDays: DEFAULT_CYCLE_DAYS,
        history: normalizeHistory(stored.history),
        manual,
        lastFinishedCycle: stored.lastFinishedCycle || null,
        reminder: stored.reminder || { enabled: false, scheduledFor: '' },
      }
    }
  } catch {
    // Mantém o estado inicial padrão caso o localStorage tenha dado problema.
  }

  return {
    startedAt: today,
    cycleDays: DEFAULT_CYCLE_DAYS,
    history: [],
    manual: createManualFields({ startedAt: today, endedAt: today }),
    lastFinishedCycle: null,
    reminder: { enabled: false, scheduledFor: '' },
  }
}

function CylinderGauge({ percent, tone }) {
  const fillHeight = `${percent}%`

  return (
    <div className={`cylinder-wrap ${tone}`} aria-label={`Botijão com ${percent}% de gás estimado`}>
      <div className="cylinder-neck"></div>
      <div className="cylinder-handle">
        <span></span>
      </div>
      <div className="cylinder-body">
        <div className="cylinder-fill" style={{ height: fillHeight }}></div>
        <div className="cylinder-shine"></div>
        <div className="cylinder-label">
          <strong>P13</strong>
          <small>13kg</small>
        </div>
      </div>
      <div className="cylinder-base"></div>
    </div>
  )
}

function App() {
  const [state, setState] = useState(loadInitialState)
  const [notificationStatus, setNotificationStatus] = useState('')
  const [settingsStatus, setSettingsStatus] = useState('')

  const today = formatDateInput(new Date())

  const intelligence = useMemo(() => {
    const recentCycles = state.history.slice(0, MOVING_AVERAGE_LIMIT)
    const movingAverage = averageDuration(recentCycles)
    const projectedCycleDays = movingAverage || DEFAULT_CYCLE_DAYS
    const isUsingRealAverage = movingAverage > 0

    return {
      projectedCycleDays,
      movingAverage,
      isUsingRealAverage,
      sampleSize: recentCycles.length,
      pattern: detectConsumptionPattern(state.history, movingAverage),
    }
  }, [state.history])

  const stats = useMemo(() => calculateStats({
    startedAt: state.startedAt,
    today,
    projectedCycleDays: intelligence.projectedCycleDays,
  }), [state.startedAt, intelligence.projectedCycleDays, today])

  const visualAlert = getAlert(stats.percent)

  const historyStats = useMemo(() => {
    if (state.history.length === 0) {
      return {
        averageDuration: 0,
        totalCycles: 0,
      }
    }

    return {
      averageDuration: averageDuration(state.history),
      totalCycles: state.history.length,
    }
  }, [state.history])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  function updateStartedAt(event) {
    const installedAt = event.target.value || today

    setState((current) => ({
      ...current,
      startedAt: installedAt,
      manual: {
        ...current.manual,
        installedAt,
        endedAt: current.manual?.endedAt && current.manual.endedAt >= installedAt ? current.manual.endedAt : installedAt,
      },
    }))
  }

  function updateManualField(field, value) {
    setState((current) => ({
      ...current,
      manual: {
        ...current.manual,
        [field]: value,
      },
    }))
  }

  function registerCylinderChange() {
    const endedAt = state.manual?.endedAt || today
    const duration = Math.max(1, daysBetween(state.startedAt, endedAt))
    const lastFinishedCycle = createHistoryEntry({
      installedAt: state.startedAt,
      endedAt,
      duration,
      paidValue: state.manual?.paidValue || '',
      notes: state.manual?.notes || '',
    })
    const nextHistory = [lastFinishedCycle, ...state.history].slice(0, 8)

    setState({
      startedAt: endedAt,
      cycleDays: DEFAULT_CYCLE_DAYS,
      history: nextHistory,
      manual: createManualFields({ startedAt: endedAt, endedAt }),
      lastFinishedCycle,
      reminder: { enabled: false, scheduledFor: '' },
    })

    void cancelGasReminder()
  }

  function startNewCylinder() {
    setState((current) => ({
      ...current,
      startedAt: today,
      manual: createManualFields({ startedAt: today, endedAt: today }),
      reminder: { enabled: false, scheduledFor: '' },
    }))

    void cancelGasReminder()
  }

  function resetDemo() {
    setState({
      startedAt: today,
      cycleDays: DEFAULT_CYCLE_DAYS,
      history: [],
      manual: createManualFields({ startedAt: today, endedAt: today }),
      lastFinishedCycle: null,
      reminder: { enabled: false, scheduledFor: '' },
    })

    void cancelGasReminder()
  }

  function exportBackup() {
    const payload = {
      app: 'Controle Gás',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: state,
    }
    const backup = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(backup)
    const link = document.createElement('a')

    link.href = url
    link.download = `controle-gas-backup-${today}.json`
    link.click()
    URL.revokeObjectURL(url)
    setSettingsStatus('Backup exportado.')
  }

  function applyRestoredState(nextState) {
    const restoredStartedAt = nextState.startedAt || today
    const restoredManual = nextState.manual
      ? {
          installedAt: nextState.manual.installedAt || restoredStartedAt,
          endedAt: nextState.manual.endedAt || today,
          paidValue: nextState.manual.paidValue || '',
          notes: nextState.manual.notes || '',
        }
      : createManualFields({ startedAt: restoredStartedAt, endedAt: today })

    setState({
      startedAt: restoredManual.installedAt || restoredStartedAt,
      cycleDays: DEFAULT_CYCLE_DAYS,
      history: normalizeHistory(nextState.history),
      manual: restoredManual,
      lastFinishedCycle: nextState.lastFinishedCycle || null,
      reminder: nextState.reminder || { enabled: false, scheduledFor: '' },
    })
  }

  function importBackup(event) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()

    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result)
        const nextState = parsed.data || parsed

        if (!nextState || typeof nextState !== 'object' || !nextState.startedAt) {
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

  return (
    <main className="app-shell">
      <section className="hero-card">
        <div className="hero-copy">
          <div className="brand-row">
            <span className="brand-mark" aria-hidden="true">P13</span>
            <span className="eyebrow">Controle Gás</span>
          </div>
          <h1>Botijão P13</h1>
          <p>
            {intelligence.isUsingRealAverage
              ? `Previsão inteligente baseada na média móvel dos últimos ${intelligence.sampleSize} ciclos.`
              : `Estimativa inicial baseada em ${DEFAULT_CYCLE_DAYS} dias de consumo.`}
          </p>
        </div>

        <div className={`status-pill ${stats.status.tone}`}>{stats.status.label}</div>
      </section>

      <section className={`dashboard-card ${stats.status.tone}`}>
        <CylinderGauge percent={stats.percent} tone={stats.status.tone} />

        <div className="reading-panel">
          <span className="reading-label">Nível estimado</span>
          <strong>{stats.percent}%</strong>
          <p>{stats.status.message}</p>

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
          <strong>{stats.elapsedDays}</strong>
        </article>
        <article>
          <span>Dias restantes</span>
          <strong>{stats.remainingDays}</strong>
        </article>
        <article>
          <span>Previsão de acabar</span>
          <strong>{stats.expectedEnd.split('-').reverse().join('/')}</strong>
        </article>
      </section>

      <section className={`intelligence-card ${intelligence.pattern.tone}`}>
        <div className="intelligence-header">
          <div>
            <span className="eyebrow">Inteligência</span>
            <h2>{stats.recommendation}</h2>
          </div>
          <div className="intelligence-badge">
            {intelligence.isUsingRealAverage ? 'Média real' : 'Base inicial'}
          </div>
        </div>

        <div className="intelligence-grid">
          <article>
            <span>Média móvel</span>
            <strong>{intelligence.projectedCycleDays} dias</strong>
          </article>
          <article>
            <span>Previsão</span>
            <strong>{formatDisplayDate(stats.expectedEnd)}</strong>
          </article>
        </div>

        <div className="pattern-note">
          <strong>{intelligence.pattern.label}</strong>
          <p>{intelligence.pattern.message}</p>
        </div>

        <div className="reminder-actions">
          <button type="button" className="primary" onClick={scheduleBuyReminder}>
            Ativar lembrete de compra
          </button>

          {(notificationStatus || state.reminder?.enabled) && (
            <span>
              {notificationStatus || `Lembrete ativo para ${formatDisplayDate(state.reminder.scheduledFor)}.`}
            </span>
          )}
        </div>
      </section>

      {visualAlert && (
        <section className={`alert-card ${visualAlert.tone}`}>
          <div>
            <span className="eyebrow">Alertas</span>
            <h2>{visualAlert.title}</h2>
            <p>{visualAlert.message}</p>
          </div>
        </section>
      )}

      <section className="form-card">
        <div className="form-header">
          <span className="eyebrow">Controle manual</span>
          <h2>Troca do botijão</h2>
        </div>

        <label>
          Data da instalação
          <input type="date" value={state.startedAt} max={today} onChange={updateStartedAt} onInput={updateStartedAt} />
        </label>

        <label>
          Data da troca
          <input
            type="date"
            value={state.manual?.endedAt || today}
            min={state.startedAt}
            max={today}
            onChange={(event) => updateManualField('endedAt', event.target.value || today)}
            onInput={(event) => updateManualField('endedAt', event.target.value || today)}
          />
        </label>

        <label>
          Valor pago
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="Opcional"
            value={state.manual?.paidValue || ''}
            onChange={(event) => updateManualField('paidValue', event.target.value)}
            onInput={(event) => updateManualField('paidValue', event.target.value)}
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

        <div className="actions">
          <button type="button" className="primary" onClick={registerCylinderChange}>
            Registrar troca
          </button>
          <button type="button" onClick={startNewCylinder}>Iniciar botijão hoje</button>
          <button type="button" className="ghost" onClick={resetDemo}>Resetar</button>
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

      <section className="settings-card">
        <div className="settings-header">
          <div>
            <span className="eyebrow">Configurações</span>
            <h2>Dados do app</h2>
          </div>
        </div>

        <div className="settings-grid">
          <article>
            <span>Nome</span>
            <strong>Controle Gás</strong>
          </article>
          <article>
            <span>Ciclos salvos</span>
            <strong>{historyStats.totalCycles}</strong>
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
    </main>
  )
}

export default App
