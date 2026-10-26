import { formatDisplayDate } from '../../../gasMath.js'
import { STATUS_STEPS } from '../../../appOptions.js'
import { BrandLogo, CylinderGauge } from '../../../components/GasVisuals.jsx'
import { useOnlineStatus } from '../../hooks/useOnlineStatus.js'

export default function DashboardFeature({
  state,
  stats,
  intelligence,
  currentBrand,
  hasActiveCylinder,
  primaryAlert,
  notificationStatus,
  onNavigate,
  onUseReserve,
  onScheduleReminder,
}) {
  const isOnline = useOnlineStatus()
  const reserveAvailable = Boolean(state.inventory?.reserveAvailable)

  return (
    <div className="operational-dashboard">
      <section className="operational-context" aria-label="Resumo operacional">
        <div>
          <span className="eyebrow">Visão operacional</span>
          <strong>{hasActiveCylinder ? 'Acompanhamento ativo' : 'Controle ainda não iniciado'}</strong>
        </div>
        <span className={`connection-pill ${isOnline ? 'online' : 'offline'}`} role="status">
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </section>

      <section className={`dashboard-card ${stats.status.tone}`}>
        <div className="dashboard-decoration kitchen" aria-hidden="true">
          <span></span><span></span><span></span>
        </div>
        <CylinderGauge percent={stats.percent} tone={stats.status.tone} />

        <div className="reading-panel">
          <span className="reading-label">Nível atual</span>
          <strong>{stats.percent}%</strong>
          <div className={`mini-level ${stats.status.tone}`}>Nível: {stats.status.label}</div>
          <p>
            {!hasActiveCylinder
              ? 'Cadastre a instalação para iniciar o acompanhamento.'
              : intelligence.isUsingRealAverage
                ? 'Estimativa baseada no seu consumo médio.'
                : 'Estimativa baseada no ciclo inicial de referência.'}
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

      <section className="metrics-grid" aria-label="Indicadores principais">
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
          <p>{hasActiveCylinder ? `Em aproximadamente ${stats.remainingDays} dias` : 'Informe a data de instalação'}</p>
        </div>
        <div className={`forecast-ring ${stats.status.tone}`} style={{ '--gas-progress': stats.percent }} aria-hidden="true">
          <span>▣</span>
        </div>
      </section>

      {primaryAlert && hasActiveCylinder && (
        <section className={`dashboard-priority ${primaryAlert.tone}`}>
          <div>
            <span className="eyebrow">Prioridade agora</span>
            <h2>{primaryAlert.title}</h2>
            <p>{primaryAlert.message}</p>
          </div>
          <button type="button" className="ghost compact-button" onClick={() => onNavigate('alerts')}>
            Ver alertas
          </button>
        </section>
      )}

      <section className="dashboard-actions" aria-label="Ações rápidas">
        <div className="dashboard-section-heading">
          <span className="eyebrow">Ações rápidas</span>
          <strong>O que você precisa fazer?</strong>
        </div>
        <div className="dashboard-action-grid">
          <button type="button" className="primary" onClick={() => onNavigate('stock')}>
            {hasActiveCylinder ? 'Trocar botijão' : 'Iniciar controle'}
          </button>
          {reserveAvailable ? (
            <button type="button" className="ghost" onClick={onUseReserve}>Usar reserva</button>
          ) : (
            <button type="button" className="ghost" onClick={() => onNavigate('stock')}>Cadastrar reserva</button>
          )}
          <button type="button" className="ghost" onClick={onScheduleReminder} disabled={!hasActiveCylinder}>
            {state.reminder?.enabled ? 'Reagendar lembrete' : 'Ativar lembrete'}
          </button>
          <button type="button" className="ghost" onClick={() => onNavigate('history')}>Ver histórico</button>
        </div>
        {notificationStatus && <p className="dashboard-action-status" role="status">{notificationStatus}</p>}
      </section>

      <section className="home-secondary-grid">
        <article className="brand-dashboard-card">
          <div>
            <span className="eyebrow">Botijão atual</span>
            <h2>{hasActiveCylinder ? currentBrand.name : 'Não cadastrado'}</h2>
            <p>{hasActiveCylinder ? `Em uso desde ${formatDisplayDate(state.startedAt)}` : 'Nenhum botijão em uso'}</p>
          </div>
          <BrandLogo brand={currentBrand} />
        </article>

        <article className={`stock-card reserve-card ${reserveAvailable ? 'available' : ''}`}>
          <div>
            <span className="eyebrow">Botijão reserva</span>
            <h2>{reserveAvailable ? 'Disponível' : 'Sem reserva'}</h2>
            <p>
              {reserveAvailable
                ? `Pronto para troca${state.inventory.reserveBrand?.name ? ` • ${state.inventory.reserveBrand.name}` : ''}.`
                : 'Cadastre um segundo botijão para emergências.'}
            </p>
          </div>
          <button type="button" className="primary compact-button" onClick={() => onNavigate('stock')}>
            Gerenciar
          </button>
        </article>
      </section>
    </div>
  )
}
