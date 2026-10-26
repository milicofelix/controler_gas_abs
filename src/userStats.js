import {
  DEFAULT_CYCLE_DAYS,
  MOVING_AVERAGE_LIMIT,
  averageDuration,
  calculateStats,
  detectConsumptionPattern,
  formatDateInput,
  getAnalyticsHistoryAudit,
} from './gasMath.js'
import { normalizeGasState } from './authStorage.js'

export function buildIntelligence(history = []) {
  const { validCycles, excludedCycles } = getAnalyticsHistoryAudit(history)
  const recentCycles = validCycles.slice(0, MOVING_AVERAGE_LIMIT)
  const movingAverage = averageDuration(recentCycles)
  const projectedCycleDays = movingAverage || DEFAULT_CYCLE_DAYS

  return {
    projectedCycleDays,
    movingAverage,
    isUsingRealAverage: movingAverage > 0,
    sampleSize: recentCycles.length,
    excludedCycles: excludedCycles.length,
    pattern: detectConsumptionPattern(validCycles, movingAverage),
  }
}

export function createEmptyCylinderStats() {
  return {
    elapsedDays: 0,
    percent: 0,
    remainingDays: 0,
    buyInDays: 0,
    status: { label: 'Sem botijão', tone: 'empty' },
    expectedEnd: '',
    recommendation: 'Cadastre um botijão',
  }
}

export function getUserStats(user, today = formatDateInput(new Date())) {
  const state = normalizeGasState(user.state, today)
  const hasActiveCylinder = Boolean(state.hasActiveCylinder && state.startedAt)
  const intelligence = buildIntelligence(state.history)
  const stats = hasActiveCylinder
    ? calculateStats({
        startedAt: state.startedAt,
        today,
        projectedCycleDays: intelligence.projectedCycleDays,
      })
    : createEmptyCylinderStats()

  return { state, intelligence, stats }
}
