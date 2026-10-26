import { getAnalyticsHistoryAudit } from './gasMath.js'

function duplicateCount(items, keyBuilder) {
  const seen = new Set()
  let duplicates = 0
  items.forEach((item) => {
    const key = keyBuilder(item)
    if (!key) return
    if (seen.has(key)) duplicates += 1
    else seen.add(key)
  })
  return duplicates
}

export function validateBackupPayload(payload) {
  const data = payload?.data || payload
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, message: 'O arquivo não contém um objeto de dados válido.' }
  }

  if (!Array.isArray(data.history) || (data.reserveHistory != null && !Array.isArray(data.reserveHistory))) {
    return { ok: false, message: 'O histórico do arquivo possui formato inválido.' }
  }

  if (typeof data.hasActiveCylinder !== 'boolean' && !data.startedAt) {
    return { ok: false, message: 'O arquivo não informa o estado do botijão atual.' }
  }

  if (data.inventory != null && (typeof data.inventory !== 'object' || Array.isArray(data.inventory))) {
    return { ok: false, message: 'O estoque de reserva possui formato inválido.' }
  }

  const history = data.history
  const reserveHistory = data.reserveHistory || []
  const audit = getAnalyticsHistoryAudit(history)
  const cycleDuplicates = duplicateCount(history, (cycle) => (
    cycle?.installedAt && cycle?.endedAt ? `${cycle.installedAt}|${cycle.endedAt}` : cycle?.id
  ))
  const reserveDuplicates = duplicateCount(reserveHistory, (entry) => entry?.id)
  const malformedCycles = history.filter((cycle) => !cycle || typeof cycle !== 'object').length
  const malformedReserves = reserveHistory.filter((entry) => !entry || typeof entry !== 'object' || !entry.purchasedAt).length

  return {
    ok: true,
    data,
    summary: {
      cycles: history.length,
      reserves: reserveHistory.length,
      duplicates: cycleDuplicates + reserveDuplicates,
      inconsistencies: audit.excludedCycles.length + malformedCycles + malformedReserves,
      hasActiveCylinder: Boolean(data.hasActiveCylinder && data.startedAt),
      hasReserve: Boolean(data.inventory?.reserveAvailable),
      exportedAt: payload?.exportedAt || '',
    },
  }
}

