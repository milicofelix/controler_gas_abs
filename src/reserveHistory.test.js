import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createReserveHistoryEntry,
  getReserveReasonText,
  getReserveStatusLabel,
  updateReserveHistoryStatus,
} from './reserveHistory.js'

test('cria entrada de historico do reserva com marca normalizada e id deterministico quando informado', () => {
  const entry = createReserveHistoryEntry({
    brand: { id: 'copagaz', name: 'Copagaz', logo: 'logo.png' },
    purchasedAt: '2026-07-10',
    paidValue: '120.00',
    today: '2026-07-25',
    idSuffix: 'teste',
  })

  assert.deepEqual(entry, {
    id: '2026-07-10-copagaz-teste',
    brandId: 'copagaz',
    brandName: 'Copagaz',
    brandLogo: 'logo.png',
    purchasedAt: '2026-07-10',
    paidValue: '120.00',
    status: 'available',
    usedAt: '',
    notes: '',
    createdAt: '2026-07-25',
  })
})

test('atualiza somente a entrada de reserva selecionada', () => {
  const history = [
    { id: 'reserva-1', status: 'available', notes: '' },
    { id: 'reserva-2', status: 'available', notes: '' },
  ]

  const updated = updateReserveHistoryStatus(history, 'reserva-2', 'used', {
    usedAt: '2026-07-25',
    notes: 'Usado como principal.',
  })

  assert.equal(updated[0].status, 'available')
  assert.equal(updated[1].status, 'used')
  assert.equal(updated[1].usedAt, '2026-07-25')
  assert.equal(updated[1].notes, 'Usado como principal.')
})

test('mantem historico intacto quando nao ha reserva selecionada', () => {
  const history = [{ id: 'reserva-1', status: 'available' }]

  assert.equal(updateReserveHistoryStatus(history, '', 'used'), history)
})

test('traduz status conhecido e usa fallback para status desconhecido', () => {
  assert.equal(getReserveStatusLabel('available'), 'Disponível')
  assert.equal(getReserveStatusLabel('used'), 'Usado')
  assert.equal(getReserveStatusLabel('removed'), 'Removido')
  assert.equal(getReserveStatusLabel('replaced'), 'Substituído')
  assert.equal(getReserveStatusLabel('audit'), 'Registrado')
})

test('traduz motivos de uso do reserva para texto de historico', () => {
  assert.equal(getReserveReasonText('acabou'), 'Gás acabou.')
  assert.equal(getReserveReasonText('vazamento'), 'Suspeita de vazamento.')
  assert.equal(getReserveReasonText('preventivo'), 'Troca preventiva.')
  assert.equal(getReserveReasonText('outro', '  Regulador com defeito  '), 'Regulador com defeito')
  assert.equal(getReserveReasonText('outro', '   '), 'Outro motivo informado.')
  assert.equal(getReserveReasonText('desconhecido'), 'Outro motivo informado.')
})
