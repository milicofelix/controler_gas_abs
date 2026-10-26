import {
  calculateBrandStats,
  calculateFinancialStats,
  formatDateInput,
  formatDisplayDate,
  formatMoney,
} from '../gasMath.js'
import { getUserStats } from '../userStats.js'
import {
  buildGasStatusWhatsAppMessage,
  buildWhatsAppUrl,
  formatWhatsAppDisplay,
} from '../whatsappStatus.js'
import { getThemeOption } from '../appOptions.js'
import { AppLogo, BrandLogo } from '../components/GasVisuals.jsx'

export default function AdminDashboard({ users, onLogout }) {
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

  function openWhatsAppStatus({ user, state, intelligence, stats }) {
    const message = buildGasStatusWhatsAppMessage({ user, state, intelligence, stats, today })
    const url = buildWhatsAppUrl({
      phone: user.residenceProfile?.whatsapp,
      message,
    })

    window.open(url, '_blank', 'noopener,noreferrer')
  }

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
                <span>WhatsApp: <strong>{user.residenceProfile?.whatsapp ? formatWhatsAppDisplay(user.residenceProfile.whatsapp) : 'Escolher contato'}</strong></span>
              </div>

              <div className="admin-user-actions">
                <button
                  type="button"
                  className="whatsapp-button"
                  onClick={() => openWhatsAppStatus({ user, state, intelligence, stats })}
                >
                  Enviar status no WhatsApp
                </button>
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

