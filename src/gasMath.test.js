import assert from 'node:assert/strict'
import test from 'node:test'
import {
  addDays,
  averageDuration,
  calculateBrandStats,
  calculateStats,
  daysBetween,
  detectConsumptionPattern,
  getAlert,
} from './gasMath.js'

test('calcula dias entre datas sem contar o dia de instalacao', () => {
  assert.equal(daysBetween('2026-06-14', '2026-06-15'), 1)
})

test('mantem a previsao inicial em 35 dias', () => {
  const stats = calculateStats({
    startedAt: '2026-06-14',
    today: '2026-06-15',
    projectedCycleDays: 35,
  })

  assert.equal(stats.elapsedDays, 1)
  assert.equal(stats.remainingDays, 34)
  assert.equal(stats.percent, 97)
  assert.equal(stats.expectedEnd, '2026-07-19')
  assert.equal(stats.recommendation, 'Comprar em 31 dias')
})

test('soma dias para previsao de fim', () => {
  assert.equal(addDays('2026-06-14', 35), '2026-07-19')
})

test('calcula media arredondada dos ciclos', () => {
  assert.equal(averageDuration([{ duration: 30 }, { duration: 10 }]), 20)
})

test('identifica alertas baixo e critico', () => {
  assert.equal(getAlert(25).tone, 'low')
  assert.equal(getAlert(10).tone, 'critical')
  assert.equal(getAlert(26), null)
})

test('detecta consumo acima do padrao quando ultimo ciclo cai muito', () => {
  const pattern = detectConsumptionPattern([
    { duration: 10 },
    { duration: 30 },
    { duration: 30 },
    { duration: 30 },
  ], 25)

  assert.equal(pattern.tone, 'warning')
  assert.equal(pattern.label, 'Consumo acima do padrão')
})

test('calcula ranking de duracao por marca', () => {
  const stats = calculateBrandStats([
    { duration: 36, paidValue: '120', brandName: 'Ultragaz', endedAt: '2026-06-01' },
    { duration: 38, paidValue: '122', brandName: 'Ultragaz', endedAt: '2026-05-01' },
    { duration: 32, paidValue: '118', brandName: 'Copagaz', endedAt: '2026-04-01' },
  ])

  assert.equal(stats[0].name, 'Ultragaz')
  assert.equal(stats[0].averageDuration, 37)
  assert.equal(stats[0].shortestDuration, 36)
  assert.equal(stats[0].longestDuration, 38)
  assert.equal(stats[0].cycles, 2)
  assert.equal(stats[0].lastCycleEndedAt, '2026-06-01')
  assert.equal(stats[1].name, 'Copagaz')
})
