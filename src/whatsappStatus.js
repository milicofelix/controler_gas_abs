import { formatDisplayDate } from './gasMath.js'

export function normalizeWhatsAppPhone(value = '') {
  const digits = String(value).replace(/\D/g, '')

  if (!digits) return ''
  if (digits.startsWith('55')) return digits
  if (digits.length >= 10 && digits.length <= 11) return `55${digits}`
  return digits
}

export function formatWhatsAppDisplay(value = '') {
  const digits = String(value).replace(/\D/g, '')
  const localDigits = digits.startsWith('55') ? digits.slice(2) : digits

  if (localDigits.length === 11) {
    return `(${localDigits.slice(0, 2)}) ${localDigits.slice(2, 7)}-${localDigits.slice(7)}`
  }

  if (localDigits.length === 10) {
    return `(${localDigits.slice(0, 2)}) ${localDigits.slice(2, 6)}-${localDigits.slice(6)}`
  }

  return value
}

export function buildGasStatusWhatsAppMessage({ user, state, intelligence, stats, today }) {
  const hasActiveCylinder = Boolean(state.hasActiveCylinder && state.startedAt)
  const location = [
    user.residenceProfile?.city,
    user.residenceProfile?.state,
  ].filter(Boolean).join('/')
  const reserveStatus = state.inventory?.reserveAvailable
    ? `Reserva disponível${state.inventory.reserveBrand?.name ? ` (${state.inventory.reserveBrand.name})` : ''}`
    : 'Sem reserva cadastrada'

  return [
    `Olá, ${user.name}!`,
    '',
    `Status do gás - ${user.homeName}`,
    location ? `Local: ${location}` : '',
    `Data da consulta: ${formatDisplayDate(today)}`,
    '',
    hasActiveCylinder
      ? `Botijão em uso desde ${formatDisplayDate(state.startedAt)}.`
      : 'Nenhum botijão em uso cadastrado no app.',
    hasActiveCylinder ? `Dias de uso: ${stats.elapsedDays}` : '',
    hasActiveCylinder ? `Nível estimado: ${stats.percent}% (${stats.status.label})` : '',
    hasActiveCylinder ? `Previsão de término: ${formatDisplayDate(stats.expectedEnd)}` : '',
    hasActiveCylinder ? `Recomendação: ${stats.recommendation}` : 'Recomendação: cadastrar a instalação do botijão.',
    `Média utilizada: ${intelligence.projectedCycleDays} dias/botijão${intelligence.isUsingRealAverage ? ' (média real)' : ' (base inicial)'}.`,
    `Estoque: ${reserveStatus}.`,
    `Marca atual: ${state.currentBrand?.name || 'Não informada'}.`,
    '',
    'Mensagem enviada pelo Controle de Gás ABS.',
  ].filter(Boolean).join('\n')
}

export function buildWhatsAppUrl({ phone, message }) {
  const normalizedPhone = normalizeWhatsAppPhone(phone)
  const encodedMessage = encodeURIComponent(message)

  return normalizedPhone
    ? `https://wa.me/${normalizedPhone}?text=${encodedMessage}`
    : `https://wa.me/?text=${encodedMessage}`
}
