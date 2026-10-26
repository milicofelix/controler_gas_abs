import { useMemo } from 'react'
import {
  DEFAULT_CYCLE_DAYS,
  calculateBrandStats,
  calculateConsumptionStats,
  calculateFinancialStats,
  calculateTrendStats,
  formatDisplayDate,
  formatMoney,
  getAnalyticsHistoryAudit,
} from '../../../gasMath.js'
import { BrandLogo } from '../../../components/GasVisuals.jsx'

function MetricCard({ label, value, helper, estimated = false }) {
  return (
    <article className="analytics-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{estimated ? 'Estimativa' : 'Dado real'} • {helper}</small>
    </article>
  )
}

export default function AnalyticsFeature({ history }) {
  const audit = useMemo(() => getAnalyticsHistoryAudit(history), [history])
  const consumption = useMemo(() => calculateConsumptionStats(audit.validCycles), [audit.validCycles])
  const financial = useMemo(() => calculateFinancialStats(audit.validCycles), [audit.validCycles])
  const trend = useMemo(() => calculateTrendStats(audit.validCycles), [audit.validCycles])
  const brands = useMemo(() => calculateBrandStats(audit.validCycles), [audit.validCycles])
  const durationSeries = audit.validCycles.slice(0, 8).reverse()
  const priceSeries = audit.validCycles.filter((cycle) => {
    const value = Number(cycle.paidValue)
    return Number.isFinite(value) && value > 0
  }).slice(0, 8).reverse()
  const maxDuration = Math.max(1, ...durationSeries.map((cycle) => cycle.duration))
  const maxPrice = Math.max(1, ...priceSeries.map((cycle) => Number(cycle.paidValue)))
  const maxBrandAverage = Math.max(1, ...brands.map((brand) => brand.averageDuration))
  const hasCycles = audit.validCycles.length > 0
  const hasFinancialData = financial.averagePaid > 0
  const projectedAnnualConsumption = hasCycles
    ? consumption.annualConsumption
    : Math.round(365 / DEFAULT_CYCLE_DAYS)

  return (
    <div className="mobile-analytics">
      <section className="analytics-header-card">
        <div><span className="eyebrow">Análises e indicadores</span><h2>Entenda seu consumo</h2><p>Somente ciclos válidos participam dos cálculos.</p></div>
        <div className="analytics-sample"><strong>{audit.validCycles.length}</strong><span>{audit.validCycles.length === 1 ? 'ciclo válido' : 'ciclos válidos'}</span></div>
      </section>

      {audit.excludedCycles.length > 0 && (
        <section className="analytics-quality-warning" role="status">
          <span aria-hidden="true">!</span>
          <div><strong>{audit.excludedCycles.length} {audit.excludedCycles.length === 1 ? 'registro foi excluído' : 'registros foram excluídos'} dos cálculos</strong><p>Ciclos com duração inválida, acima de 180 dias ou incompatível com as datas não alteram seus indicadores.</p></div>
        </section>
      )}

      <section className="analytics-section">
        <div className="analytics-section-heading"><div><span className="eyebrow">Consumo</span><h2>Duração dos botijões</h2></div><span className={`data-origin-badge ${hasCycles ? 'real' : 'estimated'}`}>{hasCycles ? 'Dados reais' : 'Estimativa inicial'}</span></div>
        <div className="analytics-metric-grid">
          <MetricCard label="Média de duração" value={hasCycles ? `${consumption.averageDuration} dias` : `${DEFAULT_CYCLE_DAYS} dias`} helper={hasCycles ? `${audit.validCycles.length} ciclos` : 'referência inicial'} estimated={!hasCycles} />
          <MetricCard label="Menor ciclo" value={hasCycles ? `${consumption.shortestDuration} dias` : '—'} helper={hasCycles ? 'menor duração válida' : 'sem dados suficientes'} estimated={!hasCycles} />
          <MetricCard label="Maior ciclo" value={hasCycles ? `${consumption.longestDuration} dias` : '—'} helper={hasCycles ? 'maior duração válida' : 'sem dados suficientes'} estimated={!hasCycles} />
          <MetricCard label="Consumo anual" value={`~${projectedAnnualConsumption} botijões`} helper={hasCycles ? 'projeção pela média real' : 'projeção por 35 dias'} estimated />
        </div>
      </section>

      <section className={`analytics-trend-card ${trend.consumptionTone}`}>
        <div><span className="eyebrow">Tendência de consumo</span><h2>{trend.consumptionLabel}</h2><p>{trend.consumptionMessage}</p></div>
        <div className="trend-comparison"><span>Recente<strong>{trend.recentAverage ? `${trend.recentAverage} dias` : '—'}</strong></span><span>Anterior<strong>{trend.previousAverage ? `${trend.previousAverage} dias` : '—'}</strong></span></div>
      </section>

      <section className="analytics-section">
        <div className="analytics-section-heading"><div><span className="eyebrow">Custos</span><h2>Quanto o gás representa</h2></div><span className={`data-origin-badge ${hasFinancialData ? 'real' : 'estimated'}`}>{hasFinancialData ? 'Valores informados' : 'Sem valores'}</span></div>
        <div className="analytics-metric-grid financial">
          <MetricCard label="Valor médio" value={hasFinancialData ? formatMoney(financial.averagePaid) : '—'} helper={hasFinancialData ? 'média dos valores válidos' : 'informe valores nas trocas'} estimated={!hasFinancialData} />
          <MetricCard label="Gasto mensal" value={hasFinancialData ? formatMoney(financial.monthlySpend) : '—'} helper={hasFinancialData ? 'estimado pela duração média' : 'sem dados suficientes'} estimated />
          <MetricCard label="Gasto anual" value={hasFinancialData ? formatMoney(financial.annualSpend) : '—'} helper={hasFinancialData ? 'projeção para 12 meses' : 'sem dados suficientes'} estimated />
          <MetricCard label="Variação de preço" value={hasFinancialData && financial.priceDelta ? formatMoney(financial.priceDelta) : '—'} helper={priceSeries.length >= 2 ? trend.priceTrendLabel.toLowerCase() : 'requer pelo menos 2 valores'} estimated={priceSeries.length < 2} />
        </div>
      </section>

      <section className="analytics-chart-card">
        <div className="analytics-section-heading"><div><span className="eyebrow">Gráfico responsivo</span><h2>Histórico de duração</h2></div></div>
        {durationSeries.length ? <div className="mobile-chart">{durationSeries.map((cycle) => <div className="mobile-chart-row" key={cycle.id}><span>{formatDisplayDate(cycle.endedAt)}</span><div><i style={{ width: `${Math.max(8, (cycle.duration / maxDuration) * 100)}%` }}></i></div><strong>{cycle.duration}d</strong></div>)}</div> : <div className="analytics-empty"><strong>Sem ciclos suficientes</strong><span>Finalize um ciclo para iniciar este gráfico.</span></div>}
      </section>

      <section className="analytics-chart-card">
        <div className="analytics-section-heading"><div><span className="eyebrow">Evolução de custos</span><h2>Histórico de preços</h2></div></div>
        {priceSeries.length ? <div className="mobile-chart price">{priceSeries.map((cycle) => <div className="mobile-chart-row" key={cycle.id}><span>{formatDisplayDate(cycle.endedAt)}</span><div><i style={{ width: `${Math.max(8, (Number(cycle.paidValue) / maxPrice) * 100)}%` }}></i></div><strong>{formatMoney(cycle.paidValue)}</strong></div>)}</div> : <div className="analytics-empty"><strong>Nenhum valor informado</strong><span>Informe o valor pago nas próximas trocas.</span></div>}
      </section>

      <section className="analytics-chart-card">
        <div className="analytics-section-heading"><div><span className="eyebrow">Comparação por marca</span><h2>Rendimento médio</h2></div></div>
        {brands.length ? <div className="mobile-brand-ranking">{brands.map((brand) => <article key={brand.name}><BrandLogo brand={brand} /><div><span><strong>{brand.name}</strong><small>{brand.cycles} {brand.cycles === 1 ? 'ciclo' : 'ciclos'}</small></span><div className="brand-duration-bar"><i style={{ width: `${Math.max(10, (brand.averageDuration / maxBrandAverage) * 100)}%` }}></i></div><p>Média {brand.averageDuration} dias • menor {brand.shortestDuration} • maior {brand.longestDuration}</p></div></article>)}</div> : <div className="analytics-empty"><strong>Sem comparação disponível</strong><span>Registre ciclos para comparar as marcas.</span></div>}
      </section>
    </div>
  )
}
