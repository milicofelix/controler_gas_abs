import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  clearSession,
  loadSession,
  loadRemoteUsers,
  loadUsers,
  saveSession,
  saveRemoteUsers,
  saveUsers,
} from './authStorage.js'
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
  const [remoteReady, setRemoteReady] = useState(false)
  const saveTimerRef = useRef(null)

  const currentUser = useMemo(
    () => users.find((user) => user.id === session?.userId) || null,
    [session, users],
  )

  useEffect(() => {
    let isActive = true

    loadRemoteUsers()
      .then((remoteUsers) => {
        if (!isActive) return
        setUsers(remoteUsers)
        setStorageStatus('Dados sincronizados com MySQL.')
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
        .then(() => setStorageStatus('Dados sincronizados com MySQL.'))
        .catch(() => setStorageStatus('MySQL indisponível. Alterações salvas localmente.'))
    }, 500)

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [remoteReady, users])

  useEffect(() => {
    const theme = currentUser?.theme || 'blue-modern'
    document.documentElement.dataset.theme = theme
  }, [currentUser?.theme])

  function login(user) {
    const nextSession = { userId: user.id, role: user.role }
    setSession(nextSession)
    saveSession(nextSession)
  }

  function logout() {
    setSession(null)
    clearSession()
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
    />
  )
}

export default App
