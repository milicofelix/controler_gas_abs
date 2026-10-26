import OperationalNavigation from './OperationalNavigation.jsx'

export default function OperationalShell({ themeId, activePage, pages, onNavigate, children }) {
  return (
    <main className={`app-shell user-shell ${themeId}`}>
      {children}
      <OperationalNavigation activePage={activePage} pages={pages} onNavigate={onNavigate} />
    </main>
  )
}
