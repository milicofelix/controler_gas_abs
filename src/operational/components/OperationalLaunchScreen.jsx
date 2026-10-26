import { AppLogo } from '../../components/GasVisuals.jsx'

export default function OperationalLaunchScreen({ themeId = 'blue-modern' }) {
  return (
    <main
      className={`app-shell user-shell operational-launch-screen ${themeId}`}
      role="status"
      aria-live="polite"
      aria-label="Carregando área operacional"
    >
      <section className="launch-brand">
        <AppLogo className="launch-logo" />
        <div>
          <strong>Meu Gás</strong>
          <span>Preparando sua área operacional…</span>
        </div>
      </section>

      <section className="launch-dashboard-skeleton" aria-hidden="true">
        <span className="launch-skeleton launch-skeleton-title"></span>
        <span className="launch-skeleton launch-skeleton-cylinder"></span>
        <span className="launch-skeleton launch-skeleton-reading"></span>
      </section>

      <section className="launch-metrics" aria-hidden="true">
        <span className="launch-skeleton"></span>
        <span className="launch-skeleton"></span>
        <span className="launch-skeleton"></span>
      </section>

      <span className="sr-only">Carregando dados do botijão e da residência.</span>
    </main>
  )
}
