export { default as DashboardFeature } from './dashboard/DashboardFeature.jsx'
export { default as CylinderOperationsFeature } from './cylinders/CylinderOperationsFeature.jsx'
export { default as HistoryTimelineFeature } from './history/HistoryTimelineFeature.jsx'
export { default as AlertsCenterFeature } from './alerts/AlertsCenterFeature.jsx'

export const OPERATIONAL_FEATURES = Object.freeze({
  home: { module: 'dashboard', label: 'Início', implemented: true },
  stock: { module: 'cylinders', label: 'Operação', implemented: true },
  history: { module: 'history', label: 'Histórico', implemented: true },
  alerts: { module: 'alerts', label: 'Alertas', implemented: true },
  stats: { module: 'analytics', label: 'Análises' },
  profile: { module: 'profile', label: 'Perfil' },
})
