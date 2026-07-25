import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildGasStatusWhatsAppMessage,
  buildWhatsAppUrl,
  formatWhatsAppDisplay,
  normalizeWhatsAppPhone,
} from './whatsappStatus.js'

test('normaliza e formata telefone brasileiro para WhatsApp', () => {
  assert.equal(normalizeWhatsAppPhone('(11) 99999-8888'), '5511999998888')
  assert.equal(normalizeWhatsAppPhone('5511988887777'), '5511988887777')
  assert.equal(formatWhatsAppDisplay('5511999998888'), '(11) 99999-8888')
  assert.equal(formatWhatsAppDisplay('1133334444'), '(11) 3333-4444')
})

test('monta url do WhatsApp com contato quando houver telefone', () => {
  const url = buildWhatsAppUrl({
    phone: '(11) 99999-8888',
    message: 'Status do gás',
  })

  assert.equal(url, 'https://wa.me/5511999998888?text=Status%20do%20g%C3%A1s')
})

test('monta url do WhatsApp sem contato fixo quando telefone estiver ausente', () => {
  const url = buildWhatsAppUrl({
    phone: '',
    message: 'Escolher contato manualmente',
  })

  assert.equal(url, 'https://wa.me/?text=Escolher%20contato%20manualmente')
})

test('monta mensagem de status com dados principais do botijao', () => {
  const message = buildGasStatusWhatsAppMessage({
    today: '2026-07-25',
    user: {
      name: 'Adriano',
      homeName: 'Casa Adriano',
      residenceProfile: { city: 'São Paulo', state: 'SP' },
    },
    state: {
      hasActiveCylinder: true,
      startedAt: '2026-07-01',
      currentBrand: { name: 'Ultragaz' },
      inventory: {
        reserveAvailable: true,
        reserveBrand: { name: 'Copagaz' },
      },
    },
    intelligence: {
      projectedCycleDays: 35,
      isUsingRealAverage: false,
    },
    stats: {
      elapsedDays: 24,
      percent: 31,
      expectedEnd: '2026-08-05',
      recommendation: 'Comprar em 7 dias',
      status: { label: 'Médio' },
    },
  })

  assert.match(message, /Olá, Adriano!/)
  assert.match(message, /Status do gás - Casa Adriano/)
  assert.match(message, /Dias de uso: 24/)
  assert.match(message, /Nível estimado: 31% \(Médio\)/)
  assert.match(message, /Estoque: Reserva disponível \(Copagaz\)\./)
})
