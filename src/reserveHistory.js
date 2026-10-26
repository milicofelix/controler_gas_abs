import { normalizeBrand } from './gasMath.js'

export function createReserveHistoryEntry({
  brand,
  purchasedAt,
  paidValue = '',
  status = 'available',
  usedAt = '',
  notes = '',
  today,
  idSuffix,
}) {
  const uniqueSuffix = idSuffix || (
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  )
  const normalizedBrand = normalizeBrand(brand)

  return {
    id: `${purchasedAt}-${normalizedBrand.id}-${uniqueSuffix}`,
    brandId: normalizedBrand.id,
    brandName: normalizedBrand.name,
    brandLogo: normalizedBrand.logo,
    purchasedAt,
    paidValue,
    status,
    usedAt,
    notes,
    createdAt: today,
  }
}

export function updateReserveHistoryStatus(history = [], reserveId, status, extras = {}) {
  if (!reserveId) return history

  return history.map((entry) => (
    entry.id === reserveId ? { ...entry, status, ...extras } : entry
  ))
}

export function getReserveReasonText(reason, notes = '') {
  const reasonLabels = {
    acabou: 'Gás acabou.',
    vazamento: 'Suspeita de vazamento.',
    preventivo: 'Troca preventiva.',
    outro: notes.trim() || 'Outro motivo informado.',
  }

  return reasonLabels[reason] || reasonLabels.outro
}

export function getReserveStatusLabel(status) {
  const statusLabels = {
    available: 'Disponível',
    used: 'Usado',
    removed: 'Removido',
    replaced: 'Substituído',
  }

  return statusLabels[status] || 'Registrado'
}
