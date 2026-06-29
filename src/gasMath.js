export const STORAGE_KEY = 'gas-control-state-v1'
export const DEFAULT_CYCLE_DAYS = 35
export const MOVING_AVERAGE_LIMIT = 3
export const BUY_BUFFER_DAYS = 3
export const GAS_REMINDER_NOTIFICATION_ID = 1301

export const GAS_BRANDS = [
  { id: 'ultragaz', name: 'Ultragaz' },
  { id: 'copagaz', name: 'Copagaz' },
  { id: 'liquigas', name: 'Liquigás' },
  { id: 'consigaz', name: 'Consigaz' },
  { id: 'supergasbras', name: 'Supergasbras' },
  { id: 'nacional-gas', name: 'Nacional Gás' },
  { id: 'outra', name: 'Outra' },
]

export const DEFAULT_GAS_BRAND = GAS_BRANDS[0]

const MS_PER_DAY = 1000 * 60 * 60 * 24

export function createManualFields({ startedAt, endedAt, paidValue = '', notes = '' }) {
  return {
    installedAt: startedAt,
    endedAt,
    paidValue,
    notes,
  }
}

export function normalizeBrand(brand = DEFAULT_GAS_BRAND) {
  const matchedBrand = GAS_BRANDS.find((item) => item.id === brand?.id)
  const fallback = matchedBrand || DEFAULT_GAS_BRAND
  const name = brand?.name?.trim() || matchedBrand?.name || fallback.name

  return {
    id: matchedBrand?.id || brand?.id || fallback.id,
    name,
    logo: brand?.logo || '',
  }
}

export function createHistoryEntry({ installedAt, endedAt, duration, paidValue = '', notes = '', brand = DEFAULT_GAS_BRAND }) {
  const uniqueSuffix = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const normalizedBrand = normalizeBrand(brand)

  return {
    id: `${endedAt}-${installedAt}-${duration}-${uniqueSuffix}`,
    installedAt,
    endedAt,
    duration,
    paidValue,
    notes,
    brandId: normalizedBrand.id,
    brandName: normalizedBrand.name,
    brandLogo: normalizedBrand.logo,
  }
}

export function normalizeHistory(history = []) {
  const usedIds = new Set()

  return history
    .map((entry, index) => {
      if (typeof entry === 'number') {
        return createHistoryEntry({
          installedAt: '',
          endedAt: '',
          duration: entry,
        })
      }

      if (!entry || typeof entry !== 'object') return null

      const baseId = entry.id || `${entry.endedAt || 'sem-data'}-${entry.installedAt || 'sem-inicio'}-${entry.duration || 0}`
      const id = usedIds.has(baseId) ? `${baseId}-${index}` : baseId
      usedIds.add(id)

      return {
        id,
        installedAt: entry.installedAt || '',
        endedAt: entry.endedAt || '',
        duration: Number(entry.duration) || 0,
        paidValue: entry.paidValue || '',
        notes: entry.notes || '',
        brandId: entry.brandId || entry.brand?.id || DEFAULT_GAS_BRAND.id,
        brandName: entry.brandName || entry.brand?.name || DEFAULT_GAS_BRAND.name,
        brandLogo: entry.brandLogo || entry.brand?.logo || '',
      }
    })
    .filter((entry) => entry && entry.duration > 0)
}

export function formatDateInput(date) {
  return date.toISOString().slice(0, 10)
}

export function formatDisplayDate(date) {
  if (!date) return 'Sem data'
  return date.split('-').reverse().join('/')
}

export function formatMoney(value) {
  if (!value) return ''

  return Number(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export function parseMoneyInput(value) {
  const digits = String(value || '').replace(/\D/g, '')

  if (!digits) return ''

  return (Number(digits) / 100).toFixed(2)
}

export function addDays(date, days) {
  const nextDate = new Date(`${date}T00:00:00`)
  nextDate.setDate(nextDate.getDate() + Number(days))
  return formatDateInput(nextDate)
}

export function averageDuration(cycles) {
  if (cycles.length === 0) return 0
  return Math.round(cycles.reduce((sum, entry) => sum + entry.duration, 0) / cycles.length)
}

export function detectConsumptionPattern(history, movingAverage) {
  if (history.length < 4) {
    return {
      tone: 'neutral',
      label: 'Aguardando mais dados',
      message: 'Com pelo menos 4 trocas, o app consegue comparar melhor o padrão.',
    }
  }

  const [latestCycle, ...previousCycles] = history
  const previousAverage = averageDuration(previousCycles.slice(0, MOVING_AVERAGE_LIMIT))
  const lowerLimit = previousAverage * 0.75
  const upperLimit = previousAverage * 1.25

  if (latestCycle.duration < lowerLimit) {
    return {
      tone: 'warning',
      label: 'Consumo acima do padrão',
      message: `O último ciclo durou ${latestCycle.duration} dias, abaixo da média recente de ${previousAverage} dias.`,
    }
  }

  if (latestCycle.duration > upperLimit) {
    return {
      tone: 'positive',
      label: 'Consumo abaixo do padrão',
      message: `O último ciclo durou ${latestCycle.duration} dias, acima da média recente de ${previousAverage} dias.`,
    }
  }

  return {
    tone: 'stable',
    label: 'Consumo dentro do padrão',
    message: `Os últimos ciclos estão próximos da média móvel de ${movingAverage} dias.`,
  }
}

export function daysBetween(start, end) {
  const startDate = new Date(`${start}T00:00:00`)
  const endDate = new Date(`${end}T00:00:00`)
  return Math.max(0, Math.floor((endDate - startDate) / MS_PER_DAY))
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function getStatus(percent) {
  if (percent <= 10) return { label: 'Crítico', tone: 'critical', message: 'Compre hoje para evitar ficar sem gás.' }
  if (percent <= 25) return { label: 'Baixo', tone: 'low', message: 'Já vale programar a próxima compra.' }
  if (percent <= 55) return { label: 'Médio', tone: 'medium', message: 'Consumo dentro do esperado.' }
  return { label: 'Cheio', tone: 'full', message: 'Botijão ainda com boa margem.' }
}

export function getAlert(percent) {
  if (percent <= 10) {
    return {
      tone: 'critical',
      title: 'Alerta crítico',
      message: 'O gás está abaixo de 10%. Compre ou troque o botijão o quanto antes.',
    }
  }

  if (percent <= 25) {
    return {
      tone: 'low',
      title: 'Alerta de gás baixo',
      message: 'O gás está abaixo de 25%. Programe a compra para evitar emergência.',
    }
  }

  return null
}

export function getReminderDate(today, buyInDays) {
  const reminderDate = new Date(`${addDays(today, buyInDays)}T09:00:00`)
  const now = new Date()

  if (reminderDate <= now) {
    reminderDate.setTime(now.getTime() + 60 * 1000)
  }

  return reminderDate
}

export function calculateStats({ startedAt, today, projectedCycleDays }) {
  const elapsedDays = daysBetween(startedAt, today)
  const usedPercent = clamp((elapsedDays / projectedCycleDays) * 100, 0, 100)
  const percent = Math.round(100 - usedPercent)
  const remainingDays = Math.max(0, Math.ceil(projectedCycleDays - elapsedDays))
  const buyInDays = Math.max(0, remainingDays - BUY_BUFFER_DAYS)

  return {
    elapsedDays,
    percent,
    remainingDays,
    buyInDays,
    status: getStatus(percent),
    expectedEnd: addDays(startedAt, projectedCycleDays),
    recommendation: buyInDays === 0 ? 'Comprar agora' : `Comprar em ${buyInDays} dias`,
  }
}

export function calculateConsumptionStats(history = []) {
  if (history.length === 0) {
    return {
      averageDuration: 0,
      shortestDuration: 0,
      longestDuration: 0,
      annualConsumption: 0,
    }
  }

  const durations = history.map((entry) => entry.duration)
  const average = averageDuration(history)

  return {
    averageDuration: average,
    shortestDuration: Math.min(...durations),
    longestDuration: Math.max(...durations),
    annualConsumption: average > 0 ? Math.round(365 / average) : 0,
  }
}

export function calculateFinancialStats(history = []) {
  const paidValues = history
    .map((entry) => Number(entry.paidValue))
    .filter((value) => Number.isFinite(value) && value > 0)

  if (paidValues.length === 0) {
    return {
      averagePaid: 0,
      monthlySpend: 0,
      annualSpend: 0,
      priceDelta: 0,
    }
  }

  const averagePaid = paidValues.reduce((sum, value) => sum + value, 0) / paidValues.length
  const newestPrice = paidValues[0]
  const oldestPrice = paidValues[paidValues.length - 1]

  return {
    averagePaid,
    monthlySpend: averagePaid / (DEFAULT_CYCLE_DAYS / 30),
    annualSpend: averagePaid * (365 / DEFAULT_CYCLE_DAYS),
    priceDelta: newestPrice - oldestPrice,
  }
}

export function calculateBrandStats(history = []) {
  const brandMap = new Map()

  history.forEach((entry) => {
    const brandName = entry.brandName || DEFAULT_GAS_BRAND.name
    const current = brandMap.get(brandName) || {
      name: brandName,
      logo: entry.brandLogo || '',
      cycles: 0,
      totalDuration: 0,
      shortestDuration: 0,
      longestDuration: 0,
      lastCycleEndedAt: '',
      totalPaid: 0,
      paidCount: 0,
    }
    const paidValue = Number(entry.paidValue)

    current.cycles += 1
    current.totalDuration += entry.duration
    current.shortestDuration = current.shortestDuration
      ? Math.min(current.shortestDuration, entry.duration)
      : entry.duration
    current.longestDuration = Math.max(current.longestDuration, entry.duration)
    current.lastCycleEndedAt = current.lastCycleEndedAt && current.lastCycleEndedAt > entry.endedAt
      ? current.lastCycleEndedAt
      : entry.endedAt

    if (Number.isFinite(paidValue) && paidValue > 0) {
      current.totalPaid += paidValue
      current.paidCount += 1
    }

    brandMap.set(brandName, current)
  })

  return [...brandMap.values()]
    .map((brand) => ({
      ...brand,
      averageDuration: Math.round(brand.totalDuration / brand.cycles),
      averagePaid: brand.paidCount > 0 ? brand.totalPaid / brand.paidCount : 0,
    }))
    .sort((a, b) => b.averageDuration - a.averageDuration)
}

export function calculateTrendStats(history = []) {
  const recentCycles = history.slice(0, 3)
  const previousCycles = history.slice(3, 6)
  const recentAverage = averageDuration(recentCycles)
  const previousAverage = averageDuration(previousCycles)
  const paidValues = history
    .map((entry) => Number(entry.paidValue))
    .filter((value) => Number.isFinite(value) && value > 0)
  const newestPrice = paidValues[0] || 0
  const previousPrice = paidValues[1] || 0
  const priceDelta = newestPrice && previousPrice ? newestPrice - previousPrice : 0

  let consumptionTone = 'neutral'
  let consumptionLabel = 'Aguardando dados'
  let consumptionMessage = 'Registre pelo menos 6 ciclos para comparar a tendência recente com a anterior.'

  if (recentAverage && previousAverage) {
    const delta = recentAverage - previousAverage

    if (delta <= -3) {
      consumptionTone = 'warning'
      consumptionLabel = 'Consumo acelerando'
      consumptionMessage = `Os últimos ciclos duraram ${Math.abs(delta)} dias a menos que os ciclos anteriores.`
    } else if (delta >= 3) {
      consumptionTone = 'positive'
      consumptionLabel = 'Rendimento melhorando'
      consumptionMessage = `Os últimos ciclos duraram ${delta} dias a mais que os ciclos anteriores.`
    } else {
      consumptionTone = 'stable'
      consumptionLabel = 'Consumo estável'
      consumptionMessage = 'A média recente está próxima do padrão anterior.'
    }
  }

  return {
    recentAverage,
    previousAverage,
    consumptionTone,
    consumptionLabel,
    consumptionMessage,
    priceDelta,
    priceTrendLabel: priceDelta > 0 ? 'Preço subiu' : priceDelta < 0 ? 'Preço caiu' : 'Preço estável',
  }
}

export function getSmartAlerts({
  stats,
  reserveAvailable = false,
  reminderEnabled = false,
  scheduledFor = '',
}) {
  const shouldBuySoon = stats.buyInDays <= 7 || stats.percent <= 25
  const isCritical = stats.percent <= 10

  return [
    {
      tone: isCritical ? 'critical' : shouldBuySoon ? 'low' : 'stable',
      title: shouldBuySoon ? 'Comprar em breve' : 'Compra programada',
      message: shouldBuySoon
        ? `Recomendação atual: ${stats.recommendation.toLowerCase()}.`
        : `Ainda há margem. ${stats.recommendation}.`,
    },
    {
      tone: isCritical ? 'critical' : reserveAvailable ? 'stable' : 'neutral',
      title: isCritical ? 'Estoque crítico' : 'Estoque monitorado',
      message: isCritical
        ? reserveAvailable
          ? 'Troque pelo botijão reserva e compre um novo para repor o estoque.'
          : 'O gás está no limite. Compre ou troque o botijão hoje.'
        : reserveAvailable
          ? 'Há um botijão reserva disponível para emergência.'
          : 'Sem reserva cadastrada. Vale manter um segundo botijão quando possível.',
    },
    {
      tone: 'neutral',
      title: 'Previsão de término',
      message: `Este botijão está previsto para acabar em ${formatDisplayDate(stats.expectedEnd)}.`,
    },
    {
      tone: reminderEnabled ? 'stable' : 'neutral',
      title: 'Notificação local',
      message: reminderEnabled
        ? `Lembrete ativo para ${formatDisplayDate(scheduledFor)}.`
        : 'Ative um lembrete local para receber o aviso de compra no celular.',
    },
  ]
}
