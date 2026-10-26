export { default as DashboardFeature } from './dashboard/DashboardFeature.jsx'
export { default as CylinderOperationsFeature } from './cylinders/CylinderOperationsFeature.jsx'

export const OPERATIONAL_FEATURES = Object.freeze({
  home: { module: 'dashboard', label: 'Início', implemented: true },
  stock: { module: 'cylinders', label: 'Operação', implemented: true },
  history: { module: 'history', label: 'Histórico' },
  alerts: { module: 'alerts', label: 'Alertas' },
  stats: { module: 'analytics', label: 'Análises' },
  profile: { module: 'profile', label: 'Perfil' },
})
