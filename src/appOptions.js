export const THEME_OPTIONS = [
  { id: 'blue-modern', name: 'Azul Moderno', description: 'Leve, claro e com cara de app financeiro.' },
  { id: 'dark-premium', name: 'Escuro Premium', description: 'Visual noturno, premium e otimizado para OLED.' },
  { id: 'green-clean', name: 'Verde Clean', description: 'Tema doméstico, suave e inspirado em cozinha.' },
  { id: 'realistic', name: 'Botijão Realista', description: 'Medidor físico com botijão em destaque.' },
]

export const PAGE_OPTIONS = [
  { id: 'home', label: 'Início', icon: '⌂' },
  { id: 'history', label: 'Histórico', icon: '↺' },
  { id: 'stock', label: 'Estoque', icon: '▣' },
  { id: 'stats', label: 'Análises', icon: '▥' },
  { id: 'alerts', label: 'Alertas', icon: '!' },
  { id: 'profile', label: 'Perfil', icon: '♙' },
]

export const STATUS_STEPS = [
  { label: 'Cheio', tone: 'full' },
  { label: 'Médio', tone: 'medium' },
  { label: 'Baixo', tone: 'low' },
  { label: 'Crítico', tone: 'critical' },
]

export function getThemeOption(themeId) {
  return THEME_OPTIONS.find((theme) => theme.id === themeId) || THEME_OPTIONS[0]
}
