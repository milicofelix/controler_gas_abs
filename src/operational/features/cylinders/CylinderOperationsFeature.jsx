import { useEffect, useRef, useState } from 'react'
import {
  DEFAULT_GAS_BRAND,
  GAS_BRANDS,
  formatDisplayDate,
  formatMoney,
  normalizeBrand,
  parseMoneyInput,
} from '../../../gasMath.js'
import { getReserveReasonText, getReserveStatusLabel } from '../../../reserveHistory.js'
import { CylinderGauge } from '../../../components/GasVisuals.jsx'

const REASON_OPTIONS = [
  { id: 'acabou', label: 'Acabou o gás' },
  { id: 'vazamento', label: 'Suspeita de vazamento' },
  { id: 'preventivo', label: 'Troca preventiva' },
  { id: 'outro', label: 'Outro motivo' },
]

const SOURCE_OPTIONS = [
  { id: 'reserve', label: 'Botijão reserva' },
  { id: 'direct', label: 'Compra direta' },
  { id: 'other', label: 'Outro botijão' },
]

function resolveBrand(brandId, customName = '') {
  const selected = GAS_BRANDS.find((brand) => brand.id === brandId) || DEFAULT_GAS_BRAND
  return normalizeBrand({
    ...selected,
    name: selected.id === 'outra' ? customName.trim() || selected.name : selected.name,
  })
}

function BrandFields({ prefix, form, onChange }) {
  return (
    <>
      <label>
        Marca
        <select value={form.brandId} onChange={(event) => onChange('brandId', event.target.value)}>
          {GAS_BRANDS.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
        </select>
      </label>
      {form.brandId === 'outra' && (
        <label>
          Nome da marca
          <input
            value={form.customBrandName || ''}
            onChange={(event) => onChange('customBrandName', event.target.value)}
            placeholder={`Marca do ${prefix}`}
          />
        </label>
      )}
    </>
  )
}

export default function CylinderOperationsFeature({
  state,
  stats,
  currentBrand,
  hasActiveCylinder,
  today,
  initialIntent,
  onIntentHandled,
  onStartControl,
  onReplaceCylinder,
  onSaveReserve,
  onRemoveReserve,
}) {
  const reserveAvailable = Boolean(state.inventory?.reserveAvailable)
  const [journey, setJourney] = useState(null)
  const [reviewing, setReviewing] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [saving, setSaving] = useState(false)
  const submitLockRef = useRef(false)
  const [startForm, setStartForm] = useState({
    installedAt: today,
    brandId: currentBrand.id,
    customBrandName: currentBrand.id === 'outra' ? currentBrand.name : '',
    paidValue: '',
  })
  const [replaceForm, setReplaceForm] = useState({
    endedAt: today,
    reason: 'acabou',
    reasonNotes: '',
    source: reserveAvailable ? 'reserve' : 'direct',
    brandId: currentBrand.id,
    customBrandName: currentBrand.id === 'outra' ? currentBrand.name : '',
    paidValue: '',
  })
  const [reserveForm, setReserveForm] = useState({
    purchasedAt: today,
    brandId: state.inventory?.reserveBrand?.id || currentBrand.id,
    customBrandName: state.inventory?.reserveBrand?.id === 'outra' ? state.inventory.reserveBrand.name : '',
    paidValue: state.inventory?.reservePaidValue || '',
    replacementReason: '',
  })
  const [removeReason, setRemoveReason] = useState('')

  useEffect(() => {
    if (!initialIntent) return

    if (initialIntent === 'replace-reserve' && hasActiveCylinder && reserveAvailable) {
      setReplaceForm((current) => ({ ...current, source: 'reserve', endedAt: today }))
      setJourney('replace')
    }

    if (initialIntent === 'start' && !hasActiveCylinder) setJourney('start')
    if (initialIntent === 'reserve') setJourney('reserve')
    if (initialIntent === 'replace' && hasActiveCylinder) setJourney('replace')
    onIntentHandled()
  }, [hasActiveCylinder, initialIntent, onIntentHandled, reserveAvailable, today])

  function openJourney(nextJourney) {
    setFeedback('')
    setReviewing(false)
    setJourney(nextJourney)
  }

  function closeJourney() {
    if (saving) return
    setJourney(null)
    setReviewing(false)
  }

  function updateForm(setter, field, value) {
    setter((current) => ({
      ...current,
      [field]: field === 'paidValue' ? parseMoneyInput(value) : value,
    }))
  }

  function validateJourney() {
    if (journey === 'start') {
      if (!startForm.installedAt) return 'Informe a data da instalação.'
      if (startForm.installedAt > today) return 'A instalação não pode estar no futuro.'
      if (startForm.brandId === 'outra' && !startForm.customBrandName.trim()) return 'Informe o nome da marca.'
    }

    if (journey === 'replace') {
      if (!replaceForm.endedAt) return 'Informe a data da troca.'
      if (replaceForm.endedAt <= state.startedAt) return 'A troca deve ocorrer depois da instalação atual.'
      if (replaceForm.endedAt > today) return 'A troca não pode estar no futuro.'
      if (replaceForm.source === 'reserve' && !reserveAvailable) return 'Não há reserva disponível.'
      if (replaceForm.reason === 'outro' && !replaceForm.reasonNotes.trim()) return 'Descreva o motivo da troca.'
      if (replaceForm.source !== 'reserve' && replaceForm.brandId === 'outra' && !replaceForm.customBrandName.trim()) return 'Informe o nome da marca.'
    }

    if (journey === 'reserve') {
      if (!reserveForm.purchasedAt) return 'Informe a data da compra.'
      if (reserveForm.purchasedAt > today) return 'A compra não pode estar no futuro.'
      if (reserveAvailable && state.inventory?.reservePurchasedAt && reserveForm.purchasedAt < state.inventory.reservePurchasedAt) return 'A nova reserva não pode ter data anterior à reserva atual.'
      if (reserveForm.brandId === 'outra' && !reserveForm.customBrandName.trim()) return 'Informe o nome da marca.'
      if (reserveAvailable && !reserveForm.replacementReason.trim()) return 'Informe o motivo da substituição da reserva.'
    }

    if (journey === 'remove' && !removeReason.trim()) return 'Informe o motivo da remoção.'
    return ''
  }

  function requestReview(event) {
    event.preventDefault()
    const error = validateJourney()
    if (error) {
      setFeedback(error)
      return
    }

    setFeedback('')
    setReviewing(true)
  }

  function confirmJourney() {
    if (submitLockRef.current) return
    submitLockRef.current = true
    setSaving(true)

    let result
    if (journey === 'start') {
      result = onStartControl({
        installedAt: startForm.installedAt,
        brand: resolveBrand(startForm.brandId, startForm.customBrandName),
        paidValue: startForm.paidValue,
      })
    } else if (journey === 'replace') {
      const reasonText = getReserveReasonText(replaceForm.reason, replaceForm.reasonNotes)
      result = onReplaceCylinder({
        endedAt: replaceForm.endedAt,
        source: replaceForm.source,
        reasonText,
        nextCylinder: replaceForm.source === 'reserve' ? undefined : {
          brand: resolveBrand(replaceForm.brandId, replaceForm.customBrandName),
          paidValue: replaceForm.paidValue,
        },
      })
    } else if (journey === 'reserve') {
      result = onSaveReserve({
        purchasedAt: reserveForm.purchasedAt,
        brand: resolveBrand(reserveForm.brandId, reserveForm.customBrandName),
        paidValue: reserveForm.paidValue,
        reason: reserveForm.replacementReason.trim(),
      })
    } else {
      result = onRemoveReserve({ reason: removeReason.trim() })
    }

    setFeedback(result.message)
    if (result.ok) {
      setJourney(null)
      setReviewing(false)
    }

    queueMicrotask(() => {
      submitLockRef.current = false
      setSaving(false)
    })
  }

  function renderReview() {
    if (journey === 'start') return (
      <dl className="operation-summary">
        <div><dt>Operação</dt><dd>Iniciar controle</dd></div>
        <div><dt>Instalação</dt><dd>{formatDisplayDate(startForm.installedAt)}</dd></div>
        <div><dt>Marca</dt><dd>{resolveBrand(startForm.brandId, startForm.customBrandName).name}</dd></div>
        <div><dt>Valor</dt><dd>{startForm.paidValue ? formatMoney(startForm.paidValue) : 'Não informado'}</dd></div>
      </dl>
    )

    if (journey === 'replace') return (
      <dl className="operation-summary">
        <div><dt>Ciclo encerrado</dt><dd>{formatDisplayDate(state.startedAt)} até {formatDisplayDate(replaceForm.endedAt)}</dd></div>
        <div><dt>Motivo</dt><dd>{getReserveReasonText(replaceForm.reason, replaceForm.reasonNotes)}</dd></div>
        <div><dt>Origem</dt><dd>{SOURCE_OPTIONS.find((option) => option.id === replaceForm.source)?.label}</dd></div>
        <div><dt>Novo botijão</dt><dd>{replaceForm.source === 'reserve' ? state.inventory?.reserveBrand?.name : resolveBrand(replaceForm.brandId, replaceForm.customBrandName).name}</dd></div>
        <div><dt>Valor do novo</dt><dd>{replaceForm.source === 'reserve' ? formatMoney(state.inventory?.reservePaidValue) || 'Não informado' : formatMoney(replaceForm.paidValue) || 'Não informado'}</dd></div>
      </dl>
    )

    if (journey === 'reserve') return (
      <dl className="operation-summary">
        <div><dt>Operação</dt><dd>{reserveAvailable ? 'Substituir reserva cadastrada' : 'Cadastrar reserva'}</dd></div>
        <div><dt>Compra</dt><dd>{formatDisplayDate(reserveForm.purchasedAt)}</dd></div>
        <div><dt>Marca</dt><dd>{resolveBrand(reserveForm.brandId, reserveForm.customBrandName).name}</dd></div>
        <div><dt>Valor</dt><dd>{formatMoney(reserveForm.paidValue) || 'Não informado'}</dd></div>
        {reserveAvailable && <div><dt>Motivo</dt><dd>{reserveForm.replacementReason}</dd></div>}
      </dl>
    )

    return (
      <dl className="operation-summary">
        <div><dt>Operação</dt><dd>Remover botijão reserva</dd></div>
        <div><dt>Reserva</dt><dd>{state.inventory?.reserveBrand?.name || 'Sem marca'}</dd></div>
        <div><dt>Motivo</dt><dd>{removeReason}</dd></div>
        <div><dt>Consumo</dt><dd>Nenhum ciclo será criado</dd></div>
      </dl>
    )
  }

  return (
    <div className="cylinder-operations">
      <section className="operation-status-grid">
        <article className={`operation-status-card current ${hasActiveCylinder ? stats.status.tone : 'empty'}`}>
          <CylinderGauge percent={stats.percent} tone={stats.status.tone} />
          <div>
            <span className="eyebrow">Botijão em uso</span>
            <h2>{hasActiveCylinder ? currentBrand.name : 'Não cadastrado'}</h2>
            <p>{hasActiveCylinder ? `Instalado em ${formatDisplayDate(state.startedAt)}.` : 'Inicie o controle para acompanhar consumo e previsão.'}</p>
          </div>
        </article>

        <article className={`operation-status-card reserve ${reserveAvailable ? 'available' : 'empty'}`}>
          <div className="reserve-symbol" aria-hidden="true">{reserveAvailable ? 'P13' : '+'}</div>
          <div>
            <span className="eyebrow">Botijão reserva</span>
            <h2>{reserveAvailable ? state.inventory.reserveBrand?.name || 'Disponível' : 'Não cadastrado'}</h2>
            <p>{reserveAvailable ? `Comprado em ${formatDisplayDate(state.inventory.reservePurchasedAt)}.` : 'Cadastre um botijão para emergências.'}</p>
          </div>
        </article>
      </section>

      <section className="operation-journeys">
        <div className="operation-section-heading">
          <span className="eyebrow">Operações</span>
          <h2>Escolha o que aconteceu</h2>
          <p>Cada opção possui uma jornada própria e mostra um resumo antes de salvar.</p>
        </div>

        <div className="operation-journey-grid">
          {!hasActiveCylinder ? (
            <button type="button" className="operation-journey primary-journey" onClick={() => openJourney('start')}>
              <span aria-hidden="true">▶</span><strong>Iniciar controle</strong><small>Cadastrar o primeiro botijão em uso</small>
            </button>
          ) : (
            <button type="button" className="operation-journey primary-journey" onClick={() => openJourney('replace')}>
              <span aria-hidden="true">↺</span><strong>Realizar troca</strong><small>Encerrar o atual e iniciar o próximo</small>
            </button>
          )}
          <button type="button" className="operation-journey" onClick={() => openJourney('reserve')}>
            <span aria-hidden="true">▣</span><strong>{reserveAvailable ? 'Substituir reserva' : 'Cadastrar reserva'}</strong><small>Somente estoque, sem encerrar ciclo</small>
          </button>
          {reserveAvailable && (
            <button type="button" className="operation-journey danger-journey" onClick={() => openJourney('remove')}>
              <span aria-hidden="true">×</span><strong>Remover reserva</strong><small>Exige motivo e confirmação</small>
            </button>
          )}
        </div>
      </section>

      {feedback && !journey && <div className="operation-feedback" role="status">{feedback}</div>}

      <section className="reserve-history-card operation-reserve-history">
        <div><span className="eyebrow">Histórico do reserva</span><h2>Compras e movimentações</h2></div>
        {state.reserveHistory?.length ? (
          <div className="reserve-history-list">
            {state.reserveHistory.slice(0, 6).map((entry) => (
              <article key={entry.id} className={`reserve-history-item ${entry.status}`}>
                <div>
                  <strong>{entry.brandName}</strong>
                  <span>Compra: {formatDisplayDate(entry.purchasedAt)}{entry.usedAt && ` • Saída: ${formatDisplayDate(entry.usedAt)}`}</span>
                  {entry.notes && <small>{entry.notes}</small>}
                </div>
                <div className="reserve-history-meta"><span>{getReserveStatusLabel(entry.status)}</span>{entry.paidValue && <strong>{formatMoney(entry.paidValue)}</strong>}</div>
              </article>
            ))}
          </div>
        ) : <p className="empty-state">Nenhuma movimentação de reserva registrada.</p>}
      </section>

      {journey && (
        <div className="operation-sheet-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeJourney()}>
          <section className="operation-sheet" role="dialog" aria-modal="true" aria-labelledby="operation-sheet-title">
            <div className="operation-sheet-handle" aria-hidden="true"></div>
            <header>
              <div>
                <span className="eyebrow">{reviewing ? 'Revisar e confirmar' : 'Jornada operacional'}</span>
                <h2 id="operation-sheet-title">
                  {journey === 'start' && 'Iniciar controle'}
                  {journey === 'replace' && 'Realizar troca'}
                  {journey === 'reserve' && (reserveAvailable ? 'Substituir reserva' : 'Cadastrar reserva')}
                  {journey === 'remove' && 'Remover reserva'}
                </h2>
              </div>
              <button type="button" className="sheet-close" onClick={closeJourney} aria-label="Cancelar e fechar">×</button>
            </header>

            {reviewing ? renderReview() : (
              <form id="operation-journey-form" className="operation-sheet-form" onSubmit={requestReview}>
                {journey === 'start' && (
                  <>
                    <label>Data da instalação<input type="date" value={startForm.installedAt} max={today} onChange={(event) => updateForm(setStartForm, 'installedAt', event.target.value)} /></label>
                    <BrandFields prefix="botijão" form={startForm} onChange={(field, value) => updateForm(setStartForm, field, value)} />
                    <label>Valor pago<input inputMode="numeric" value={formatMoney(startForm.paidValue)} onChange={(event) => updateForm(setStartForm, 'paidValue', event.target.value)} placeholder="Opcional" /></label>
                  </>
                )}

                {journey === 'replace' && (
                  <>
                    <label>Data da troca<input type="date" value={replaceForm.endedAt} min={state.startedAt} max={today} onChange={(event) => updateForm(setReplaceForm, 'endedAt', event.target.value)} /></label>
                    <label>Motivo<select value={replaceForm.reason} onChange={(event) => updateForm(setReplaceForm, 'reason', event.target.value)}>{REASON_OPTIONS.map((reason) => <option key={reason.id} value={reason.id}>{reason.label}</option>)}</select></label>
                    {replaceForm.reason === 'outro' && <label>Descrição do motivo<textarea value={replaceForm.reasonNotes} onChange={(event) => updateForm(setReplaceForm, 'reasonNotes', event.target.value)} /></label>}
                    <fieldset className="source-options"><legend>Origem do novo botijão</legend>{SOURCE_OPTIONS.map((source) => <label key={source.id} className={replaceForm.source === source.id ? 'selected' : ''}><input type="radio" name="replacement-source" value={source.id} checked={replaceForm.source === source.id} disabled={source.id === 'reserve' && !reserveAvailable} onChange={(event) => updateForm(setReplaceForm, 'source', event.target.value)} /><span><strong>{source.label}</strong>{source.id === 'reserve' && !reserveAvailable && <small>Não disponível</small>}</span></label>)}</fieldset>
                    {replaceForm.source !== 'reserve' && <><BrandFields prefix="novo botijão" form={replaceForm} onChange={(field, value) => updateForm(setReplaceForm, field, value)} /><label>Valor do novo botijão<input inputMode="numeric" value={formatMoney(replaceForm.paidValue)} onChange={(event) => updateForm(setReplaceForm, 'paidValue', event.target.value)} placeholder="Opcional" /></label></>}
                  </>
                )}

                {journey === 'reserve' && (
                  <>
                    <label>Data da compra<input type="date" value={reserveForm.purchasedAt} max={today} onChange={(event) => updateForm(setReserveForm, 'purchasedAt', event.target.value)} /></label>
                    <BrandFields prefix="reserva" form={reserveForm} onChange={(field, value) => updateForm(setReserveForm, field, value)} />
                    <label>Valor pago<input inputMode="numeric" value={formatMoney(reserveForm.paidValue)} onChange={(event) => updateForm(setReserveForm, 'paidValue', event.target.value)} placeholder="Opcional" /></label>
                    {reserveAvailable && <label>Motivo da substituição<textarea value={reserveForm.replacementReason} onChange={(event) => updateForm(setReserveForm, 'replacementReason', event.target.value)} placeholder="Ex.: troca por uma marca diferente" /></label>}
                  </>
                )}

                {journey === 'remove' && <label>Motivo da remoção<textarea value={removeReason} onChange={(event) => setRemoveReason(event.target.value)} placeholder="Ex.: reserva devolvida ao fornecedor" /></label>}
              </form>
            )}

            {feedback && <div className="operation-feedback" role="status">{feedback}</div>}

            <footer>
              <button type="button" className="ghost" onClick={reviewing ? () => setReviewing(false) : closeJourney}>{reviewing ? 'Voltar e editar' : 'Cancelar'}</button>
              {reviewing ? (
                <button type="button" className={journey === 'remove' ? 'danger-button' : 'primary'} disabled={saving} onClick={confirmJourney}>{saving ? 'Salvando…' : 'Confirmar operação'}</button>
              ) : <button type="submit" form="operation-journey-form" className="primary">Revisar operação</button>}
            </footer>
          </section>
        </div>
      )}
    </div>
  )
}
