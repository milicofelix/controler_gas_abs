import { useMemo, useState } from 'react'
import { formatDisplayDate, formatMoney } from '../../../gasMath.js'
import { getReserveStatusLabel } from '../../../reserveHistory.js'
import { BrandLogo } from '../../../components/GasVisuals.jsx'

const FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'changes', label: 'Trocas' },
  { id: 'purchases', label: 'Compras' },
  { id: 'reserves', label: 'Reservas' },
]

const EVENT_META = {
  cycle: { label: 'Ciclo encerrado', icon: '↺', tone: 'change' },
  purchase: { label: 'Compra de reserva', icon: '+', tone: 'purchase' },
  used: { label: 'Reserva utilizada', icon: '↑', tone: 'used' },
  removed: { label: 'Reserva removida', icon: '×', tone: 'removed' },
  replaced: { label: 'Reserva substituída', icon: '⇄', tone: 'replaced' },
}

function inferCycleSource(cycle) {
  if (cycle.nextCylinderSource) return cycle.nextCylinderSource
  const notes = cycle.notes || ''
  if (/reserva/i.test(notes)) return 'reserve'
  if (/comprado diretamente|compra direta/i.test(notes)) return 'direct'
  if (/outro botijão/i.test(notes)) return 'other'
  return 'manual'
}

function sourceLabel(source) {
  return {
    reserve: 'Botijão reserva',
    direct: 'Compra direta',
    other: 'Outro botijão',
    manual: 'Não informada',
  }[source] || 'Não informada'
}

function inferCycleReason(cycle) {
  if (cycle.replacementReason) return cycle.replacementReason
  const match = (cycle.notes || '').match(/Motivo:\s*(.+)$/i)
  return match?.[1]?.trim() || 'Não informado'
}

function buildTimeline(history = [], reserveHistory = []) {
  const cycles = history.map((cycle) => ({
    id: `cycle-${cycle.id}`,
    kind: 'cycle',
    date: cycle.endedAt,
    cycle,
  }))

  const reserves = reserveHistory.flatMap((entry) => {
    const events = [{
      id: `purchase-${entry.id}`,
      kind: 'purchase',
      date: entry.purchasedAt || entry.createdAt,
      reserve: entry,
    }]

    if (['used', 'removed', 'replaced'].includes(entry.status)) {
      events.push({
        id: `${entry.status}-${entry.id}`,
        kind: entry.status,
        date: entry.usedAt || entry.createdAt || entry.purchasedAt,
        reserve: entry,
      })
    }

    return events
  })

  return [...cycles, ...reserves].sort((a, b) => {
    const byDate = String(b.date || '').localeCompare(String(a.date || ''))
    return byDate || b.id.localeCompare(a.id)
  })
}

export default function HistoryTimelineFeature({ history, reserveHistory, averageDuration }) {
  const [filter, setFilter] = useState('all')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [selectedEvent, setSelectedEvent] = useState(null)

  const timeline = useMemo(() => buildTimeline(history, reserveHistory), [history, reserveHistory])
  const visibleEvents = useMemo(() => timeline.filter((event) => {
    const matchesType = filter === 'all'
      || (filter === 'changes' && event.kind === 'cycle')
      || (filter === 'purchases' && event.kind === 'purchase')
      || (filter === 'reserves' && ['used', 'removed', 'replaced'].includes(event.kind))
    const matchesStart = !periodStart || event.date >= periodStart
    const matchesEnd = !periodEnd || event.date <= periodEnd
    return matchesType && matchesStart && matchesEnd
  }), [filter, periodEnd, periodStart, timeline])

  function renderEventDescription(event) {
    if (event.kind === 'cycle') {
      return `${event.cycle.duration} dias • ${event.cycle.brandName || 'Marca não informada'}`
    }
    if (event.kind === 'purchase') {
      return `${event.reserve.brandName || 'Marca não informada'}${event.reserve.paidValue ? ` • ${formatMoney(event.reserve.paidValue)}` : ''}`
    }
    return `${event.reserve.brandName || 'Marca não informada'} • ${getReserveStatusLabel(event.reserve.status)}`
  }

  return (
    <div className="operational-history">
      <section className="history-overview-card">
        <div>
          <span className="eyebrow">Histórico operacional</span>
          <h2>Linha do tempo</h2>
          <p>Trocas e movimentações aparecem juntas, mas continuam separadas nos dados.</p>
        </div>
        <div className="history-average"><span>Média real</span><strong>{averageDuration || 0} dias</strong></div>
      </section>

      <section className="timeline-filters" aria-label="Filtros do histórico">
        <div className="timeline-filter-tabs">
          {FILTERS.map((option) => (
            <button key={option.id} type="button" className={filter === option.id ? 'active' : ''} onClick={() => setFilter(option.id)}>{option.label}</button>
          ))}
        </div>
        <div className="timeline-period">
          <label>De<input type="date" value={periodStart} max={periodEnd || undefined} onChange={(event) => setPeriodStart(event.target.value)} /></label>
          <label>Até<input type="date" value={periodEnd} min={periodStart || undefined} onChange={(event) => setPeriodEnd(event.target.value)} /></label>
          {(periodStart || periodEnd) && <button type="button" className="ghost" onClick={() => { setPeriodStart(''); setPeriodEnd('') }}>Limpar período</button>}
        </div>
      </section>

      <section className="timeline-card">
        {visibleEvents.length ? (
          <div className="timeline-list">
            {visibleEvents.map((event) => {
              const meta = EVENT_META[event.kind]
              const brand = event.cycle
                ? { name: event.cycle.brandName, logo: event.cycle.brandLogo }
                : { name: event.reserve.brandName, logo: event.reserve.brandLogo }
              return (
                <button key={event.id} type="button" className={`timeline-event ${meta.tone}`} onClick={() => setSelectedEvent(event)}>
                  <span className="timeline-marker" aria-hidden="true">{meta.icon}</span>
                  <span className="timeline-event-content">
                    <span className="timeline-event-heading"><strong>{meta.label}</strong><time>{formatDisplayDate(event.date)}</time></span>
                    <span className="timeline-event-detail"><BrandLogo brand={brand} /><span>{renderEventDescription(event)}</span></span>
                  </span>
                  <span className="timeline-chevron" aria-hidden="true">›</span>
                </button>
              )
            })}
          </div>
        ) : <div className="timeline-empty"><strong>Nenhum evento encontrado</strong><span>Ajuste os filtros ou registre uma nova operação.</span></div>}
      </section>

      {selectedEvent && (
        <div className="operation-sheet-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelectedEvent(null)}>
          <section className="operation-sheet history-detail-sheet" role="dialog" aria-modal="true" aria-labelledby="history-detail-title">
            <div className="operation-sheet-handle" aria-hidden="true"></div>
            <header>
              <div><span className="eyebrow">Detalhes do evento</span><h2 id="history-detail-title">{EVENT_META[selectedEvent.kind].label}</h2></div>
              <button type="button" className="sheet-close" onClick={() => setSelectedEvent(null)} aria-label="Fechar detalhes">×</button>
            </header>

            {selectedEvent.kind === 'cycle' ? (
              <dl className="operation-summary">
                <div><dt>Instalação</dt><dd>{formatDisplayDate(selectedEvent.cycle.installedAt)}</dd></div>
                <div><dt>Término</dt><dd>{formatDisplayDate(selectedEvent.cycle.endedAt)}</dd></div>
                <div><dt>Duração</dt><dd>{selectedEvent.cycle.duration} dias</dd></div>
                <div><dt>Marca</dt><dd>{selectedEvent.cycle.brandName || 'Não informada'}</dd></div>
                <div><dt>Valor</dt><dd>{formatMoney(selectedEvent.cycle.paidValue) || 'Não informado'}</dd></div>
                <div><dt>Motivo da troca</dt><dd>{inferCycleReason(selectedEvent.cycle)}</dd></div>
                <div><dt>Origem do novo</dt><dd>{sourceLabel(inferCycleSource(selectedEvent.cycle))}</dd></div>
              </dl>
            ) : (
              <dl className="operation-summary">
                <div><dt>Data do evento</dt><dd>{formatDisplayDate(selectedEvent.date)}</dd></div>
                <div><dt>Data da compra</dt><dd>{formatDisplayDate(selectedEvent.reserve.purchasedAt)}</dd></div>
                <div><dt>Marca</dt><dd>{selectedEvent.reserve.brandName || 'Não informada'}</dd></div>
                <div><dt>Valor</dt><dd>{formatMoney(selectedEvent.reserve.paidValue) || 'Não informado'}</dd></div>
                <div><dt>Situação</dt><dd>{selectedEvent.kind === 'purchase' ? 'Compra registrada' : getReserveStatusLabel(selectedEvent.reserve.status)}</dd></div>
                {selectedEvent.reserve.notes && <div><dt>Motivo/observação</dt><dd>{selectedEvent.reserve.notes}</dd></div>}
              </dl>
            )}

            <div className="future-history-actions">
              <span className="eyebrow">Ações previstas para uma próxima fase</span>
              <div><button type="button" disabled>Corrigir</button><button type="button" disabled>Excluir</button><button type="button" disabled>Restaurar</button><button type="button" disabled>Exportar período</button></div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
