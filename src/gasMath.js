export const STORAGE_KEY = 'gas-control-state-v1'
export const DEFAULT_CYCLE_DAYS = 35
export const MOVING_AVERAGE_LIMIT = 3
export const BUY_BUFFER_DAYS = 3
export const GAS_REMINDER_NOTIFICATION_ID = 1301

const MS_PER_DAY = 1000 * 60 * 60 * 24

export function createManualFields({ startedAt, endedAt, paidValue = '', notes = '' }) {
  return {
    installedAt: startedAt,
    endedAt,
    paidValue,
    notes,
  }
}

export function createHistoryEntry({ installedAt, endedAt, duration, paidValue = '', notes = '' }) {
  const uniqueSuffix = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

  return {
    id: `${endedAt}-${installedAt}-${duration}-${uniqueSuffix}`,
    installedAt,
    endedAt,
    duration,
    paidValue,
    notes,
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
