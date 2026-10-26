import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  clearSession,
  clearPendingSync,
  loadSession,
  loadPendingSync,
  loadRemoteUsers,
  loadUsers,
  saveSession,
  queuePendingSync,
  saveRemoteUsers,
  saveUsers,
} from './authStorage.js'
import { activateServiceWorkerUpdate, clearApplicationCaches } from './pwa.js'
import { formatDateInput } from './gasMath.js'
import { getThemeOption } from './appOptions.js'
import LoginScreen from './auth/LoginScreen.jsx'
import AdminDashboard from './admin/AdminDashboard.jsx'
import OperationalApp from './operational/OperationalApp.jsx'
import OperationalLaunchScreen from './operational/components/OperationalLaunchScreen.jsx'
import './App.css'

function App() {
  const [users, setUsers] = useState(loadUsers)
  const [session, setSession] = useState(loadSession)
  const [storageStatus, setStorageStatus] = useState('Sincronizando com MySQL...')
  const [lastSyncedAt, setLastSyncedAt] = useState('')
  const [installPrompt, setInstallPrompt] = useState(null)
  const [installationStatus, setInstallationStatus] = useState('')
  const [updateRegistration, setUpdateRegistration] = useState(null)
  const [remoteReady, setRemoteReady] = useState(false)
  const saveTimerRef = useRef(null)

  const currentUser = useMemo(
    () => users.find((user) => user.id === session?.userId) || null,
    [session, users],
  )

  useEffect(() => {
    function captureInstallPrompt(event) {
      event.preventDefault()
      setInstallPrompt(event)
    }
    window.addEventListener('beforeinstallprompt', captureInstallPrompt)
    function handleInstalled() {
      setInstallPrompt(null)
      setInstallationStatus('Aplicativo instalado com sucesso.')
    }
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', captureInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  useEffect(() => {
    function handleUpdate(event) {
      setUpdateRegistration(event.detail)
    }
    window.addEventListener('pwa:update-available', handleUpdate)
    return () => window.removeEventListener('pwa:update-available', handleUpdate)
  }, [])

  useEffect(() => {
    let isActive = true

    loadRemoteUsers()
      .then((remoteUsers) => {
        if (!isActive) return
        setUsers(remoteUsers)
        setStorageStatus('Dados sincronizados com MySQL.')
        setLastSyncedAt(new Date().toISOString())
      })
      .catch(() => {
        if (!isActive) return
        setStorageStatus('MySQL indisponível. Usando cópia local neste dispositivo.')
      })
      .finally(() => {
        if (isActive) setRemoteReady(true)
      })

    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    saveUsers(users)

    if (!remoteReady) return undefined

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }

    saveTimerRef.current = setTimeout(() => {
      saveRemoteUsers(users)
        .then(() => {
          clearPendingSync()
          setStorageStatus('Dados sincronizados com MySQL.')
          setLastSyncedAt(new Date().toISOString())
        })
        .catch(() => {
          queuePendingSync()
          setStorageStatus('MySQL indisponível. Alterações salvas localmente e aguardando sincronização.')
        })
    }, 500)

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [remoteReady, users])

  useEffect(() => {
    async function synchronizePendingChanges() {
      if (!loadPendingSync()) return
      try {
        await saveRemoteUsers(users)
        clearPendingSync()
        setStorageStatus('Alterações pendentes sincronizadas.')
        setLastSyncedAt(new Date().toISOString())
      } catch {
        queuePendingSync('retry-failed')
        setStorageStatus('Sincronização pendente. Tentaremos novamente quando houver conexão.')
      }
    }
    window.addEventListener('online', synchronizePendingChanges)
    window.addEventListener('pwa:sync-requested', synchronizePendingChanges)
    return () => {
      window.removeEventListener('online', synchronizePendingChanges)
      window.removeEventListener('pwa:sync-requested', synchronizePendingChanges)
    }
  }, [users])

  useEffect(() => {
    const theme = currentUser?.theme || 'blue-modern'
    document.documentElement.dataset.theme = theme
  }, [currentUser?.theme])

  function login(user) {
    const nextSession = { userId: user.id, role: user.role }
    setSession(nextSession)
    saveSession(nextSession)
  }

  async function logout() {
    setSession(null)
    clearSession()
    clearPendingSync()
    try {
      await clearApplicationCaches()
    } catch {
      // O encerramento da sessão não deve depender da disponibilidade do Cache API.
    }
  }

  function createNewUser(user) {
    setUsers((current) => [...current, user])
  }

  function updateUserProfile(userId, profile) {
    const normalizedEmail = profile.email.trim().toLowerCase()
    const emailAlreadyExists = users.some((user) => user.id !== userId && user.email === normalizedEmail)

    if (emailAlreadyExists) {
      return { ok: false, message: 'Já existe outro usuário com este e-mail.' }
    }

    setUsers((current) => current.map((user) => (
      user.id === userId
        ? {
            ...user,
            name: profile.name.trim(),
            homeName: profile.homeName.trim(),
            email: normalizedEmail,
            password: profile.password.trim(),
            residenceProfile: {
              city: profile.residenceProfile?.city || '',
              state: profile.residenceProfile?.state || '',
              whatsapp: profile.residenceProfile?.whatsapp || '',
              avatar: profile.residenceProfile?.avatar || '',
              updatedAt: formatDateInput(new Date()),
            },
          }
        : user
    )))

    return { ok: true, message: 'Cadastro atualizado.' }
  }

  function updateUserTheme(userId, themeId) {
    const nextTheme = getThemeOption(themeId).id

    setUsers((current) => current.map((user) => (
      user.id === userId ? { ...user, theme: nextTheme } : user
    )))
  }

  const updateUserState = useCallback((userId, nextState) => {
    setUsers((current) => {
      let hasChanges = false

      const nextUsers = current.map((user) => {
        if (user.id !== userId) return user

        const currentState = JSON.stringify(user.state)
        const incomingState = JSON.stringify(nextState)

        if (currentState === incomingState) {
          return user
        }

        hasChanges = true
        return { ...user, state: nextState }
      })

      return hasChanges ? nextUsers : current
    })
  }, [])

  async function restoreUserFromServer(userId) {
    try {
      const remoteUsers = await loadRemoteUsers()
      const restoredUser = remoteUsers.find((user) => user.id === userId)
      if (!restoredUser) return { ok: false, message: 'Usuário não encontrado no servidor.' }
      setUsers(remoteUsers)
      setStorageStatus('Dados restaurados do servidor.')
      setLastSyncedAt(new Date().toISOString())
      return { ok: true, message: 'Dados restaurados do servidor.', user: restoredUser }
    } catch {
      setStorageStatus('Servidor indisponível. A restauração não foi realizada.')
      return { ok: false, message: 'Não foi possível restaurar os dados do servidor.' }
    }
  }

  async function requestApplicationInstall() {
    if (!installPrompt) return { ok: false, message: 'Use o menu do navegador e escolha “Adicionar à Tela de Início” ou “Instalar aplicativo”.' }
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    setInstallPrompt(null)
    return choice.outcome === 'accepted'
      ? { ok: true, message: 'Instalação iniciada.' }
      : { ok: false, message: 'Instalação cancelada.' }
  }

  function updateApplicationNow() {
    if (!activateServiceWorkerUpdate(updateRegistration)) return
    setStorageStatus('Atualizando o aplicativo…')
  }

  if (!remoteReady && session?.role === 'user') {
    return <OperationalLaunchScreen themeId={getThemeOption(currentUser?.theme).id} />
  }

  if (!currentUser) {
    return <LoginScreen users={users} onLogin={login} onCreateUser={createNewUser} />
  }

  if (currentUser.role === 'admin') {
    return <AdminDashboard users={users} onLogout={logout} />
  }

  return (
    <OperationalApp
      key={currentUser.id}
      currentUser={currentUser}
      onUpdateUserState={updateUserState}
      onUpdateUserProfile={updateUserProfile}
      onUpdateUserTheme={updateUserTheme}
      onLogout={logout}
      storageStatus={storageStatus}
      lastSyncedAt={lastSyncedAt}
      onRestoreUserFromServer={restoreUserFromServer}
      installPromptAvailable={Boolean(installPrompt)}
      installationStatus={installationStatus}
      onRequestInstall={requestApplicationInstall}
      updateAvailable={Boolean(updateRegistration?.waiting)}
      onUpdateNow={updateApplicationNow}
    />
  )
}

export default App
