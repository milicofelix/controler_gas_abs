export default function OperationalNavigation({ activePage, pages, onNavigate }) {
  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      {pages.map((page) => (
        <button
          key={page.id}
          type="button"
          className={activePage === page.id ? 'active' : ''}
          aria-current={activePage === page.id ? 'page' : undefined}
          onClick={() => onNavigate(page.id)}
        >
          <span aria-hidden="true">{page.icon}</span>
          <small>{page.label}</small>
        </button>
      ))}
    </nav>
  )
}
