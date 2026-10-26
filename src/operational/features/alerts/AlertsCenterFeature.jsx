import { useEffect, useMemo, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { formatDisplayDate } from '../../../gasMath.js'
import { useOnlineStatus } from '../../hooks/useOnlineStatus.js'

function platformLabel() {
  const platform = Capacitor.getPlatform()
  if (platform === 'android') return 'Android / Capacitor'
  if (platform === 'ios') return 'iOS / Capacitor'
  return 'Navegador / PWA'
}

export default function AlertsCenterFeature({
  state,
  stats,
  hasActiveCylinder,
  storageStatus,
  notificationStatus,
  initialIntent,
  onIntentHandled,
  onRegisterReserve,
  onUseReserve,
  onOpenOperation,
  onActivateReminder,
  onCancelReminder,
}) {
  const isOnline = useOnlineStatus()
  const [permissionSheetOpen, setPermissionSheetOpen] = useState(false)
  const [activating, setActivating] = useState(false)
  const reserveAvailable = Boolean(state.inventory?.reserveAvailable)
  const syncFailed = !isOnline || /indisponível|localmente|falha|erro/i.test(storageStatus || '')

  useEffect(() => {
    if (initialIntent === 'reminder') setPermissionSheetOpen(true)
    if (initialIntent) onIntentHandled()
  }, [initialIntent, onIntentHandled])

  const alerts = useMemo(() => {
    const next = []

    if (syncFailed) next.push({
      id: 'sync', tone: 'warning', icon: '↻', title: 'Falha de sincronização',
      message: isOnline ? storageStatus : 'Sem conexão. As alterações continuam salvas neste dispositivo.',
      action: 'operation', actionLabel: 'Continuar no aplicativo',
    })

    if (!hasActiveCylinder) next.push({
      id: 'no-cylinder', tone: 'warning', icon: '+', title: 'Controle ainda não iniciado',
      message: 'Cadastre o botijão em uso para habilitar previsões e alertas.',
      action: 'operation', actionLabel: 'Iniciar controle',
    })

    if (hasActiveCylinder && stats.percent <= 10) next.push({
      id: 'critical', tone: 'critical', icon: '!', title: 'Nível crítico',
      message: `Estimativa atual de ${stats.percent}% de gás restante.`,
      action: reserveAvailable ? 'use-reserve' : 'operation',
      actionLabel: reserveAvailable ? 'Usar reserva' : 'Abrir troca',
    })

    if (hasActiveCylinder && stats.remainingDays <= 7) next.push({
      id: 'forecast', tone: stats.remainingDays <= 2 ? 'critical' : 'warning', icon: '⌛',
      title: 'Previsão de término próxima',
      message: `Término estimado para ${formatDisplayDate(stats.expectedEnd)} (${stats.remainingDays} dias).`,
      action: reserveAvailable ? 'use-reserve' : 'register-reserve',
      actionLabel: reserveAvailable ? 'Usar reserva' : 'Cadastrar reserva',
    })

    if (!reserveAvailable) next.push({
      id: 'no-reserve', tone: 'warning', icon: '▣', title: 'Nenhuma reserva disponível',
      message: 'Cadastre uma reserva para evitar interrupção quando o botijão atual terminar.',
      action: 'register-reserve', actionLabel: 'Cadastrar reserva',
    })

    if (hasActiveCylinder && !reserveAvailable && stats.buyInDays <= 7) next.push({
      id: 'replacement', tone: 'critical', icon: '↓', title: 'Comprar reposição',
      message: stats.recommendation,
      action: 'register-reserve', actionLabel: 'Registrar compra',
    })

    if (state.reminder?.enabled) next.push({
      id: 'reminder', tone: 'scheduled', icon: '●', title: 'Lembrete agendado',
      message: `Alerta programado para ${formatDisplayDate(state.reminder.scheduledFor)}.`,
      action: 'reschedule', actionLabel: 'Reagendar', secondaryAction: 'cancel', secondaryLabel: 'Cancelar',
    })

    return next
  }, [hasActiveCylinder, isOnline, reserveAvailable, state.reminder?.enabled, state.reminder?.scheduledFor, stats, storageStatus, syncFailed])

  function runAction(action) {
    if (action === 'register-reserve') onRegisterReserve()
    if (action === 'use-reserve') onUseReserve()
    if (action === 'operation') onOpenOperation()
    if (action === 'reschedule') setPermissionSheetOpen(true)
    if (action === 'cancel') onCancelReminder()
  }

  async function confirmReminder() {
    if (activating) return
    setActivating(true)
    await onActivateReminder()
    setActivating(false)
    setPermissionSheetOpen(false)
  }

  return (
    <div className="alerts-center">
      <section className="alerts-center-header">
        <div><span className="eyebrow">Central de alertas</span><h2>O que precisa de atenção</h2><p>Cada alerta leva diretamente à operação recomendada.</p></div>
        <span className={`alerts-count ${alerts.some((alert) => alert.tone === 'critical') ? 'critical' : ''}`}>{alerts.length} {alerts.length === 1 ? 'alerta' : 'alertas'}</span>
      </section>

      {notificationStatus && <div className="alert-operation-feedback" role="status">{notificationStatus}</div>}

      <section className="actionable-alert-list">
        {alerts.length ? alerts.map((alert) => (
          <article key={alert.id} className={`actionable-alert ${alert.tone}`}>
            <span className="actionable-alert-icon" aria-hidden="true">{alert.icon}</span>
            <div className="actionable-alert-copy"><span className="eyebrow">Ação recomendada</span><h2>{alert.title}</h2><p>{alert.message}</p></div>
            <div className="actionable-alert-actions">
              <button type="button" className="primary" onClick={() => runAction(alert.action)}>{alert.actionLabel}</button>
              {alert.secondaryAction && <button type="button" className="ghost" onClick={() => runAction(alert.secondaryAction)}>{alert.secondaryLabel}</button>}
            </div>
          </article>
        )) : (
          <div className="alerts-empty"><span aria-hidden="true">✓</span><strong>Nenhuma ação necessária agora</strong><p>O botijão, a reserva e a sincronização estão em situação normal.</p></div>
        )}
      </section>

      {!state.reminder?.enabled && hasActiveCylinder && (
        <section className="visual-reminder-card">
          <div><span className="eyebrow">Lembrete de compra</span><h2>Receba um aviso antes do gás acabar</h2><p>A permissão só será solicitada depois que você confirmar.</p></div>
          <button type="button" className="primary" onClick={() => setPermissionSheetOpen(true)}>Ativar lembrete</button>
        </section>
      )}

      <section className="notification-environment">
        <span>Ambiente atual</span><strong>{platformLabel()}</strong><small>O alerta visual permanece disponível dentro do aplicativo mesmo sem permissão do sistema.</small>
      </section>

      {permissionSheetOpen && (
        <div className="operation-sheet-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setPermissionSheetOpen(false)}>
          <section className="operation-sheet permission-sheet" role="dialog" aria-modal="true" aria-labelledby="permission-title">
            <div className="operation-sheet-handle" aria-hidden="true"></div>
            <header><div><span className="eyebrow">Notificação opcional</span><h2 id="permission-title">Por que precisamos da permissão?</h2></div><button type="button" className="sheet-close" onClick={() => setPermissionSheetOpen(false)} aria-label="Fechar">×</button></header>
            <div className="permission-explanation"><span aria-hidden="true">●</span><p>Ela permite avisar sobre a compra mesmo quando esta tela não estiver aberta. Não enviamos publicidade e você pode cancelar quando quiser.</p></div>
            <div className="permission-fallback"><strong>Se você negar</strong><p>O lembrete continuará visível nesta central. Em navegadores sem agendamento em segundo plano, essa alternativa visual será usada automaticamente.</p></div>
            <footer><button type="button" className="ghost" onClick={() => setPermissionSheetOpen(false)}>Agora não</button><button type="button" className="primary" disabled={activating} onClick={confirmReminder}>{activating ? 'Ativando…' : 'Continuar e permitir'}</button></footer>
          </section>
        </div>
      )}
    </div>
  )
}
