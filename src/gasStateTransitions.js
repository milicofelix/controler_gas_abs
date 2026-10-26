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
  nextCylinder = {},
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
  const nextBrand = usesReserve
    ? reserveBrand
    : normalizeBrand(nextCylinder.brand || currentBrand)
  const sourceLabels = {
    reserve: 'Troca pelo botijão reserva.',
    direct: 'Troca por botijão comprado diretamente.',
    other: 'Troca por outro botijão disponível.',
    manual: 'Troca de botijão.',
  }
  const cycleNotes = usesReserve
    ? [state.manual?.notes, `Troca pelo botijão reserva. Motivo: ${reasonText}`].filter(Boolean).join(' ')
    : [state.manual?.notes, sourceLabels[source] || sourceLabels.manual, reasonText && `Motivo: ${reasonText}`]
        .filter(Boolean)
        .join(' ')
  const finishedCycle = createHistoryEntry({
    installedAt: state.startedAt,
    endedAt,
    duration,
    paidValue: state.manual?.paidValue || '',
    notes: cycleNotes,
    brand: currentBrand,
    replacementReason: reasonText,
    nextCylinderSource: source,
  })

  const nextState = {
    ...state,
    hasActiveCylinder: true,
    startedAt: endedAt,
    history: [finishedCycle, ...(state.history || [])].slice(0, historyLimit),
    lastFinishedCycle: finishedCycle,
    currentBrand: nextBrand,
    manual: usesReserve
      ? createManualFields({
          startedAt: endedAt,
          endedAt,
          paidValue: state.inventory?.reservePaidValue || '',
          notes: state.inventory?.reservePurchasedAt
            ? `Botijão reserva comprado em ${formatDisplayDate(state.inventory.reservePurchasedAt)}.`
            : '',
        })
      : createManualFields({
          startedAt: endedAt,
          endedAt,
          paidValue: nextCylinder.paidValue || '',
          notes: nextCylinder.notes || '',
        }),
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

export function startCylinderControl(state, {
  installedAt,
  brand,
  paidValue = '',
  notes = '',
  today,
} = {}) {
  if (state?.hasActiveCylinder) {
    return { ok: false, message: 'Já existe um botijão em uso.', state }
  }

  if (!installedAt) {
    return { ok: false, message: 'Informe a data da instalação.', state }
  }

  if (today && installedAt > today) {
    return { ok: false, message: 'A instalação não pode estar no futuro.', state }
  }

  const nextBrand = normalizeBrand(brand || DEFAULT_GAS_BRAND)
  const nextState = {
    ...state,
    hasActiveCylinder: true,
    startedAt: installedAt,
    currentBrand: nextBrand,
    manual: createManualFields({
      startedAt: installedAt,
      endedAt: installedAt,
      paidValue,
      notes,
    }),
    reminder: { enabled: false, scheduledFor: '' },
  }

  return { ok: true, message: 'Controle do botijão iniciado.', state: nextState }
}
