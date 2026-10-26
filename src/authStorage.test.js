import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeGasState } from './authStorage.js'

test('mantem startedAt como fonte oficial ao restaurar formulario antigo', () => {
  const state = normalizeGasState({
    hasActiveCylinder: true,
    startedAt: '2026-09-22',
    manual: {
      installedAt: '2026-08-23',
      endedAt: '2026-10-23',
      paidValue: '115.00',
      notes: '',
    },
  }, '2026-10-26')

  assert.equal(state.startedAt, '2026-09-22')
  assert.equal(state.manual.installedAt, '2026-09-22')
})
