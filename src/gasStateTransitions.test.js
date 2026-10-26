import assert from 'node:assert/strict'
import test from 'node:test'
import { replaceActiveCylinder } from './gasStateTransitions.js'

function createState(overrides = {}) {
  return {
    hasActiveCylinder: true,
    startedAt: '2026-08-23',
    history: [],
    manual: {
      installedAt: '2026-08-23',
      endedAt: '2026-09-22',
      paidValue: '115.00',
      notes: '',
    },
    currentBrand: { id: 'ultragaz', name: 'Ultragaz', logo: '' },
    inventory: {
      reserveAvailable: true,
      reserveBrand: { id: 'ultragaz', name: 'Ultragaz', logo: '' },
      reservePurchasedAt: '2026-08-23',
      reservePaidValue: '115.00',
      reserveId: 'reserva-1',
    },
    reserveHistory: [{ id: 'reserva-1', status: 'available' }],
    reminder: { enabled: true, scheduledFor: '2026-09-20' },
    ...overrides,
  }
}

test('troca pelo reserva encerra um ciclo e atualiza estoque na mesma transicao', () => {
  const result = replaceActiveCylinder(createState(), {
    endedAt: '2026-09-22',
    source: 'reserve',
    reasonText: 'Gás acabou.',
  })

  assert.equal(result.ok, true)
  assert.equal(result.state.history.length, 1)
  assert.equal(result.state.history[0].duration, 30)
  assert.match(result.state.history[0].notes, /Troca pelo botijão reserva/)
  assert.equal(result.state.startedAt, '2026-09-22')
  assert.equal(result.state.inventory.reserveAvailable, false)
  assert.equal(result.state.reserveHistory[0].status, 'used')
  assert.equal(result.state.manual.paidValue, '115.00')
})

test('recusa encerrar novamente o botijao iniciado no mesmo dia', () => {
  const first = replaceActiveCylinder(createState(), {
    endedAt: '2026-09-22',
    source: 'reserve',
    reasonText: 'Gás acabou.',
  })
  const repeated = replaceActiveCylinder(first.state, {
    endedAt: '2026-09-22',
    source: 'manual',
  })

  assert.equal(repeated.ok, false)
  assert.equal(repeated.state.history.length, 1)
  assert.match(repeated.message, /depois da data de instalação/)
})

test('recusa intervalo que ja existe no historico', () => {
  const existingCycle = {
    id: 'existente',
    installedAt: '2026-08-23',
    endedAt: '2026-09-22',
    duration: 30,
  }
  const result = replaceActiveCylinder(createState({ history: [existingCycle] }), {
    endedAt: '2026-09-22',
    source: 'manual',
  })

  assert.equal(result.ok, false)
  assert.equal(result.state.history.length, 1)
  assert.match(result.message, /já foi registrada/)
})

test('cadastro manual e uso do reserva compartilham a mesma regra de duracao', () => {
  const result = replaceActiveCylinder(createState(), {
    endedAt: '2026-09-22',
    source: 'manual',
  })

  assert.equal(result.ok, true)
  assert.equal(result.state.history[0].duration, 30)
  assert.equal(result.state.inventory.reserveAvailable, true)
  assert.equal(result.state.reserveHistory[0].status, 'available')
})
