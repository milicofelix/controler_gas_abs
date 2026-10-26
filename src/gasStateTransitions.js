import {
  DEFAULT_GAS_BRAND,
  createHistoryEntry,
  createManualFields,
  daysBetween,
  formatDisplayDate,
  normalizeBrand,
} from './gasMath.js'
import { updateReserveHistoryStatus } from './reserveHistory.js'

function hasFinishedInterval(history = [], installedAt, endedAt) {
  return history.some((cycle) => (
    cycle.installedAt === installedAt && cycle.endedAt === endedAt
  ))
}

export function replaceActiveCylinder(state, {
  endedAt,
  source = 'manual',
  reasonText = '',
  historyLimit = 8,
} = {}) {
  if (!state?.hasActiveCylinder || !state.startedAt) {
    return { ok: false, message: 'Não há um botijão em uso para encerrar.', state }
  }

  if (!endedAt) {
    return { ok: false, message: 'Informe a data da troca.', state }
  }

  const duration = daysBetween(state.startedAt, endedAt)

  if (duration <= 0) {
    return {
      ok: false,
      message: 'A troca deve acontecer depois da data de instalação do botijão atual.',
      state,
    }
  }

  if (hasFinishedInterval(state.history, state.startedAt, endedAt)) {
    return { ok: false, message: 'Esta troca já foi registrada no histórico.', state }
  }

  const usesReserve = source === 'reserve'

  if (usesReserve && !state.inventory?.reserveAvailable) {
    return { ok: false, message: 'Não há um botijão reserva disponível.', state }
  }

  const currentBrand = normalizeBrand(state.currentBrand || DEFAULT_GAS_BRAND)
  const reserveBrand = state.inventory?.reserveBrand
    ? normalizeBrand(state.inventory.reserveBrand)
    : currentBrand
  const cycleNotes = usesReserve
    ? [state.manual?.notes, `Troca pelo botijão reserva. Motivo: ${reasonText}`].filter(Boolean).join(' ')
    : state.manual?.notes || ''
  const finishedCycle = createHistoryEntry({
    installedAt: state.startedAt,
    endedAt,
    duration,
    paidValue: state.manual?.paidValue || '',
    notes: cycleNotes,
    brand: currentBrand,
  })

  const nextState = {
    ...state,
    hasActiveCylinder: true,
    startedAt: endedAt,
    history: [finishedCycle, ...(state.history || [])].slice(0, historyLimit),
    lastFinishedCycle: finishedCycle,
    currentBrand: usesReserve ? reserveBrand : currentBrand,
    manual: usesReserve
      ? createManualFields({
          startedAt: endedAt,
          endedAt,
          paidValue: state.inventory?.reservePaidValue || '',
          notes: state.inventory?.reservePurchasedAt
            ? `Botijão reserva comprado em ${formatDisplayDate(state.inventory.reservePurchasedAt)}.`
            : '',
        })
      : createManualFields({ startedAt: endedAt, endedAt }),
    reminder: { enabled: false, scheduledFor: '' },
  }

  if (usesReserve) {
    nextState.inventory = {
      reserveAvailable: false,
      reserveBrand: null,
      reservePurchasedAt: '',
      reservePaidValue: '',
      reserveId: '',
    }
    nextState.reserveHistory = updateReserveHistoryStatus(
      state.reserveHistory,
      state.inventory?.reserveId,
      'used',
      {
        usedAt: endedAt,
        notes: `Usado como botijão principal. Motivo: ${reasonText}`,
      },
    )
  }

  return { ok: true, message: `Troca registrada com ${duration} dias de uso.`, state: nextState }
}
