import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { AUTH_USERS_KEY, normalizeGasState } from '../../../authStorage.js'
import { formatDateInput, formatDisplayDate } from '../../../gasMath.js'
import { validateBackupPayload } from '../../../backupValidation.js'
import { formatWhatsAppDisplay } from '../../../whatsappStatus.js'
import { ProfileAvatar } from '../../../components/GasVisuals.jsx'

const APP_VERSION = '0.0.0 (desenvolvimento)'

function downloadJson(payload, filename) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function backupPayload(currentUser, state) {
  return {
    app: 'Controle Gás',
    version: 2,
    exportedAt: new Date().toISOString(),
    user: {
      name: currentUser.name,
      homeName: currentUser.homeName,
      email: currentUser.email,
      theme: currentUser.theme,
      residenceProfile: currentUser.residenceProfile,
    },
    data: state,
  }
}

export default function ProfileSettingsFeature({
  currentUser,
  state,
  profileForm,
  themes,
  currentTheme,
  storageStatus,
  lastSyncedAt,
  standaloneMode,
  profileStatus,
  onProfileFieldChange,
  onUploadAvatar,
  onSaveProfile,
  onUpdateTheme,
  onApplyImportedState,
  onRestoreServer,
  installPromptAvailable,
  onRequestInstall,
}) {
  const [status, setStatus] = useState('')
  const [pendingImport, setPendingImport] = useState(null)
  const [confirmAction, setConfirmAction] = useState('')
  const [notificationPermission, setNotificationPermission] = useState('Verificando…')
  const [updateStatus, setUpdateStatus] = useState('Verificando…')

  useEffect(() => {
    async function inspectApplication() {
      try {
        if (Capacitor.isNativePlatform()) {
          const permission = await LocalNotifications.checkPermissions()
          setNotificationPermission(permission.display === 'granted' ? 'Permitida' : permission.display === 'denied' ? 'Negada' : 'Ainda não solicitada')
        } else if ('Notification' in window) {
          setNotificationPermission(window.Notification.permission === 'granted' ? 'Permitida' : window.Notification.permission === 'denied' ? 'Negada' : 'Ainda não solicitada')
        } else {
          setNotificationPermission('Não suportada neste navegador')
        }
      } catch {
        setNotificationPermission('Não foi possível verificar')
      }

      try {
        const registration = await navigator.serviceWorker?.getRegistration()
        setUpdateStatus(registration?.waiting ? 'Atualização disponível' : registration ? 'Aplicativo atualizado' : 'Verificação offline ainda não instalada')
      } catch {
        setUpdateStatus('Não foi possível verificar')
      }
    }
    void inspectApplication()
  }, [])

  function exportBackup(label = 'backup') {
    const safeHome = currentUser.homeName.replaceAll(' ', '-').toLowerCase()
    downloadJson(backupPayload(currentUser, state), `controle-gas-${safeHome}-${label}-${formatDateInput(new Date())}.json`)
    setStatus('Backup exportado com sucesso.')
  }

  function selectImport(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const validation = validateBackupPayload(JSON.parse(reader.result))
        if (!validation.ok) {
          setStatus(validation.message)
          setPendingImport(null)
          return
        }
        setPendingImport(validation)
        setStatus('Arquivo validado. Confira o resumo antes de substituir.')
      } catch {
        setStatus('Não foi possível ler este arquivo JSON.')
        setPendingImport(null)
      } finally {
        event.target.value = ''
      }
    }
    reader.readAsText(file)
  }

  function confirmImport() {
    if (!pendingImport) return
    exportBackup('antes-da-importacao')
    onApplyImportedState(normalizeGasState(pendingImport.data))
    setPendingImport(null)
    setStatus('Importação concluída. Uma cópia dos dados anteriores foi baixada.')
  }

  function clearLocalData() {
    localStorage.removeItem(AUTH_USERS_KEY)
    setConfirmAction('')
    setStatus('Cópia local removida. Os dados desta sessão e do servidor não foram apagados.')
  }

  async function restoreServerData() {
    setStatus('Buscando dados do servidor…')
    const result = await onRestoreServer()
    setConfirmAction('')
    setStatus(result.message)
  }

  async function installApplication() {
    const result = await onRequestInstall()
    setStatus(result.message)
  }

  function submitProfile(event) {
    setStatus('')
    onSaveProfile(event)
  }

  function uploadAvatar(event) {
    setStatus('')
    onUploadAvatar(event)
  }

  return (
    <div className="profile-settings">
      <section className="settings-group residence-settings">
        <div className="settings-group-heading"><div><span className="eyebrow">Residência</span><h2>Dados da casa</h2></div><small>Identificação e contato</small></div>
        <form className="profile-form" onSubmit={submitProfile}>
          <div className="profile-avatar-panel">
            {profileForm.avatar ? <img className="profile-avatar large" src={profileForm.avatar} alt={profileForm.name || 'Perfil'} /> : <ProfileAvatar user={{ ...currentUser, name: profileForm.name, residenceProfile: { avatar: '' } }} />}
            <div><span className="eyebrow">Foto</span><strong>{profileForm.homeName || currentUser.homeName}</strong><label className="file-action compact">Escolher foto<input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAvatar} /></label></div>
          </div>
          <div className="profile-fields-grid">
            <label>Responsável<input value={profileForm.name} onChange={(event) => onProfileFieldChange('name', event.target.value)} /></label>
            <label>Nome da residência<input value={profileForm.homeName} onChange={(event) => onProfileFieldChange('homeName', event.target.value)} /></label>
            <label>Cidade<input value={profileForm.city} onChange={(event) => onProfileFieldChange('city', event.target.value)} /></label>
            <label>Estado<input value={profileForm.state} maxLength="2" onChange={(event) => onProfileFieldChange('state', event.target.value.toUpperCase())} /></label>
            <label>WhatsApp<input inputMode="tel" value={formatWhatsAppDisplay(profileForm.whatsapp)} onChange={(event) => onProfileFieldChange('whatsapp', event.target.value)} /></label>
            <label>E-mail<input type="email" value={profileForm.email} onChange={(event) => onProfileFieldChange('email', event.target.value)} /></label>
            <label>Senha<input type="password" value={profileForm.password} onChange={(event) => onProfileFieldChange('password', event.target.value)} /></label>
          </div>
          <button type="submit" className="primary">Salvar residência</button>
        </form>
      </section>

      <section className="settings-group appearance-settings">
        <div className="settings-group-heading"><div><span className="eyebrow">Aparência</span><h2>Cores e modo visual</h2></div><small>Tema atual: {currentTheme.name}</small></div>
        <div className="theme-grid" role="radiogroup" aria-label="Preferência de cores">{themes.map((theme) => <button key={theme.id} type="button" className={`theme-option ${theme.id} ${currentUser.theme === theme.id ? 'active' : ''}`} onClick={() => onUpdateTheme(theme.id)} aria-pressed={currentUser.theme === theme.id}><span className="theme-preview" aria-hidden="true"><i></i><b></b></span><strong>{theme.name}</strong><small>{theme.id === 'dark-premium' ? 'Modo escuro' : 'Modo claro'}</small></button>)}</div>
        <p className="settings-help">O tema Escuro Premium ativa o modo escuro. Os demais temas utilizam modo claro com diferentes preferências de cor.</p>
      </section>

      <section className="settings-group data-settings">
        <div className="settings-group-heading"><div><span className="eyebrow">Dados</span><h2>Backup e sincronização</h2></div><small>{storageStatus}</small></div>
        <div className="settings-facts"><article><span>Última sincronização</span><strong>{lastSyncedAt ? formatDisplayDate(lastSyncedAt.slice(0, 10)) : 'Ainda não concluída'}</strong></article><article><span>Ciclos armazenados</span><strong>{state.history.length}</strong></article></div>
        <div className="settings-action-grid"><button type="button" className="primary" onClick={() => exportBackup()}>Exportar backup</button><label className="file-action">Selecionar backup<input type="file" accept="application/json" onChange={selectImport} /></label><button type="button" className="ghost" onClick={() => setConfirmAction('restore')}>Restaurar do servidor</button><button type="button" className="danger-button" onClick={() => setConfirmAction('clear')}>Limpar dados locais</button></div>
      </section>

      <section className="settings-group application-settings">
        <div className="settings-group-heading"><div><span className="eyebrow">Aplicativo</span><h2>Instalação e permissões</h2></div></div>
        <div className="application-facts"><article><span>Versão</span><strong>{APP_VERSION}</strong></article><article><span>Instalação</span><strong>{Capacitor.isNativePlatform() ? 'Aplicativo nativo' : standaloneMode ? 'PWA instalada' : 'Aberto no navegador'}</strong></article><article><span>Atualização</span><strong>{updateStatus}</strong></article><article><span>Notificações</span><strong>{notificationPermission}</strong></article></div>
        {!Capacitor.isNativePlatform() && !standaloneMode && <div className="install-instructions"><div><strong>Instale para usar como aplicativo</strong><p>No iPhone, use Compartilhar → Adicionar à Tela de Início. No Android ou desktop, use a opção Instalar do navegador.</p></div><button type="button" className="primary" onClick={installApplication}>{installPromptAvailable ? 'Instalar aplicativo' : 'Ver como instalar'}</button></div>}
      </section>

      {(status || profileStatus) && <div className="settings-status" role="status">{status || profileStatus}</div>}

      {pendingImport && <div className="operation-sheet-backdrop" role="presentation"><section className="operation-sheet" role="dialog" aria-modal="true" aria-labelledby="import-title"><div className="operation-sheet-handle"></div><header><div><span className="eyebrow">Revisar importação</span><h2 id="import-title">Substituir os dados atuais?</h2></div><button type="button" className="sheet-close" onClick={() => setPendingImport(null)}>×</button></header><dl className="operation-summary"><div><dt>Ciclos</dt><dd>{pendingImport.summary.cycles}</dd></div><div><dt>Reservas</dt><dd>{pendingImport.summary.reserves}</dd></div><div><dt>Duplicidades</dt><dd>{pendingImport.summary.duplicates}</dd></div><div><dt>Inconsistências</dt><dd>{pendingImport.summary.inconsistencies}</dd></div><div><dt>Botijão ativo</dt><dd>{pendingImport.summary.hasActiveCylinder ? 'Sim' : 'Não'}</dd></div><div><dt>Reserva disponível</dt><dd>{pendingImport.summary.hasReserve ? 'Sim' : 'Não'}</dd></div></dl>{(pendingImport.summary.duplicates > 0 || pendingImport.summary.inconsistencies > 0) && <div className="import-warning">O arquivo possui alertas. Revise os números antes de continuar.</div>}<footer><button type="button" className="ghost" onClick={() => setPendingImport(null)}>Cancelar</button><button type="button" className="primary" onClick={confirmImport}>Criar cópia e importar</button></footer></section></div>}

      {confirmAction && <div className="operation-sheet-backdrop" role="presentation"><section className="operation-sheet" role="dialog" aria-modal="true" aria-labelledby="data-confirm-title"><div className="operation-sheet-handle"></div><header><div><span className="eyebrow">Confirmação</span><h2 id="data-confirm-title">{confirmAction === 'clear' ? 'Limpar cópia local?' : 'Restaurar dados do servidor?'}</h2></div><button type="button" className="sheet-close" onClick={() => setConfirmAction('')}>×</button></header><div className="permission-fallback"><p>{confirmAction === 'clear' ? 'A sessão atual e os dados do servidor não serão apagados. O cache poderá ser criado novamente durante o uso.' : 'O estado operacional atual será substituído pela versão encontrada no servidor.'}</p></div><footer><button type="button" className="ghost" onClick={() => setConfirmAction('')}>Cancelar</button><button type="button" className={confirmAction === 'clear' ? 'danger-button' : 'primary'} onClick={confirmAction === 'clear' ? clearLocalData : restoreServerData}>Confirmar</button></footer></section></div>}
    </div>
  )
}
