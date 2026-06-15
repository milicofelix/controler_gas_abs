import { useEffect, useMemo, useState } from 'react'
import './App.css'

const STORAGE_KEY = 'gas-control-state-v1'
const DEFAULT_CYCLE_DAYS = 35
const MS_PER_DAY = 1000 * 60 * 60 * 24
const STATUS_STEPS = [
  { label: 'Cheio', tone: 'full' },
  { label: 'Médio', tone: 'medium' },
  { label: 'Baixo', tone: 'low' },
  { label: 'Crítico', tone: 'critical' },
]

function createManualFields({ startedAt, paidValue = '', notes = '' }) {
  return {
    installedAt: startedAt,
    paidValue,
    notes,
  }
}

function formatDateInput(date) {
  return date.toISOString().slice(0, 10)
}

function daysBetween(start, end) {
  const startDate = new Date(`${start}T00:00:00`)
  const endDate = new Date(`${end}T00:00:00`)
  return Math.max(0, Math.floor((endDate - startDate) / MS_PER_DAY))
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function getStatus(percent) {
  if (percent <= 10) return { label: 'Crítico', tone: 'critical', message: 'Compre hoje para evitar ficar sem gás.' }
  if (percent <= 25) return { label: 'Baixo', tone: 'low', message: 'Já vale programar a próxima compra.' }
  if (percent <= 55) return { label: 'Médio', tone: 'medium', message: 'Consumo dentro do esperado.' }
  return { label: 'Cheio', tone: 'full', message: 'Botijão ainda com boa margem.' }
}

function loadInitialState() {
  const today = formatDateInput(new Date())

  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (stored?.startedAt) {
      const manual = stored.manual || createManualFields({
        startedAt: stored.startedAt,
        paidValue: stored.paidValue,
        notes: stored.notes,
      })

      return {
        startedAt: manual.installedAt || stored.startedAt,
        cycleDays: DEFAULT_CYCLE_DAYS,
        history: Array.isArray(stored.history) ? stored.history : [],
        manual,
        lastFinishedCycle: stored.lastFinishedCycle || null,
      }
    }
  } catch {
    // Mantém o estado inicial padrão caso o localStorage tenha dado problema.
  }

  return {
    startedAt: today,
    cycleDays: DEFAULT_CYCLE_DAYS,
    history: [],
    manual: createManualFields({ startedAt: today }),
    lastFinishedCycle: null,
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

  const today = formatDateInput(new Date())

  const stats = useMemo(() => {
    const elapsedDays = daysBetween(state.startedAt, today)
    const usedPercent = clamp((elapsedDays / state.cycleDays) * 100, 0, 100)
    const percent = Math.round(100 - usedPercent)
    const remainingDays = Math.max(0, Math.ceil(state.cycleDays - elapsedDays))
    const status = getStatus(percent)
    const expectedEnd = new Date(`${state.startedAt}T00:00:00`)
    expectedEnd.setDate(expectedEnd.getDate() + Number(state.cycleDays))

    return {
      elapsedDays,
      percent,
      remainingDays,
      status,
      expectedEnd: formatDateInput(expectedEnd),
    }
  }, [state.startedAt, state.cycleDays, today])

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

  function registerEmptyCylinderToday() {
    const duration = Math.max(1, daysBetween(state.startedAt, today))
    const nextHistory = [duration, ...state.history].slice(0, 6)
    const lastFinishedCycle = {
      installedAt: state.startedAt,
      endedAt: today,
      duration,
      paidValue: state.manual?.paidValue || '',
      notes: state.manual?.notes || '',
    }

    setState({
      startedAt: today,
      cycleDays: DEFAULT_CYCLE_DAYS,
      history: nextHistory,
      manual: createManualFields({ startedAt: today }),
      lastFinishedCycle,
    })
  }

  function startNewCylinder() {
    setState((current) => ({
      ...current,
      startedAt: today,
      manual: createManualFields({ startedAt: today }),
    }))
  }

  function resetDemo() {
    setState({
      startedAt: today,
      cycleDays: DEFAULT_CYCLE_DAYS,
      history: [],
      manual: createManualFields({ startedAt: today }),
      lastFinishedCycle: null,
    })
  }

  return (
    <main className="app-shell">
      <section className="hero-card">
        <div className="hero-copy">
          <span className="eyebrow">Controle visual do gás</span>
          <h1>Botijão de cozinha</h1>
          <p>
            Estimativa inicial baseada em {DEFAULT_CYCLE_DAYS} dias de consumo. A previsão inteligente entra nas próximas fases.
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
          <button type="button" className="primary" onClick={registerEmptyCylinderToday}>
            Botijão acabou
          </button>
          <button type="button" onClick={startNewCylinder}>Novo botijão hoje</button>
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
          <h2>Histórico usado na inteligência</h2>
          <div className="history-list">
            {state.history.map((days, index) => (
              <span key={`${days}-${index}`}>{days} dias</span>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

export default App
