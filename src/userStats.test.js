import assert from 'node:assert/strict'
import test from 'node:test'
import { DEFAULT_CYCLE_DAYS } from './gasMath.js'
import { buildIntelligence, createEmptyCylinderStats, getUserStats } from './userStats.js'

test('buildIntelligence falls back to the fixed 35 day cycle without history', () => {
  const intelligence = buildIntelligence([])

  assert.equal(intelligence.projectedCycleDays, DEFAULT_CYCLE_DAYS)
  assert.equal(intelligence.movingAverage, 0)
  assert.equal(intelligence.isUsingRealAverage, false)
  assert.equal(intelligence.sampleSize, 0)
  assert.equal(intelligence.pattern.label, 'Aguardando mais dados')
})

test('buildIntelligence uses a moving average from the latest three cycles', () => {
  const intelligence = buildIntelligence([
    { duration: 30 },
    { duration: 36 },
    { duration: 39 },
    { duration: 50 },
  ])

  assert.equal(intelligence.projectedCycleDays, 35)
  assert.equal(intelligence.movingAverage, 35)
  assert.equal(intelligence.isUsingRealAverage, true)
  assert.equal(intelligence.sampleSize, 3)
})

test('getUserStats returns empty cylinder stats when the user has no active gas cylinder', () => {
  const result = getUserStats({
    state: {
      hasActiveCylinder: false,
      startedAt: '',
      history: [],
    },
  }, '2026-06-29')

  assert.deepEqual(result.stats, createEmptyCylinderStats())
  assert.equal(result.state.hasActiveCylinder, false)
})

test('getUserStats calculates active cylinder progress from the projected cycle', () => {
  const result = getUserStats({
    state: {
      hasActiveCylinder: true,
      startedAt: '2026-06-22',
      history: [
        { duration: 35 },
        { duration: 35 },
        { duration: 35 },
      ],
    },
  }, '2026-06-29')

  assert.equal(result.stats.elapsedDays, 7)
  assert.equal(result.stats.remainingDays, 28)
  assert.equal(result.stats.percent, 80)
  assert.equal(result.stats.expectedEnd, '2026-07-27')
})
