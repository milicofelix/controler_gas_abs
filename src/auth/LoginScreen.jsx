import { useState } from 'react'
import {
  DEMO_USER_EMAIL,
  DEMO_USER_PASSWORD,
  SUPER_ADMIN_EMAIL,
  SUPER_ADMIN_PASSWORD,
  createUser,
} from '../authStorage.js'
import { AppLogo } from '../components/GasVisuals.jsx'

export default function LoginScreen({ users, onLogin, onCreateUser }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({
    name: '',
    homeName: '',
    email: DEMO_USER_EMAIL,
    password: DEMO_USER_PASSWORD,
  })
  const [message, setMessage] = useState('')

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function submitLogin(event) {
    event.preventDefault()
    const email = form.email.trim().toLowerCase()
    const user = users.find((item) => item.email === email && item.password === form.password)

    if (!user) {
      setMessage('E-mail ou senha inválidos.')
      return
    }

    setMessage('')
    onLogin(user)
  }

  function submitRegister(event) {
    event.preventDefault()
    const name = form.name.trim()
    const homeName = form.homeName.trim()
    const email = form.email.trim().toLowerCase()
    const password = form.password.trim()

    if (!name || !homeName || !email || password.length < 4) {
      setMessage('Preencha nome, casa, e-mail e uma senha com pelo menos 4 caracteres.')
      return
    }

    if (users.some((user) => user.email === email)) {
      setMessage('Já existe um usuário com este e-mail.')
      return
    }

    onCreateUser(createUser({ name, homeName, email, password }))
    setMessage('Usuário criado. Faça login para acessar sua casa.')
    setMode('login')
  }

  function fillAccess(email, password) {
    setMode('login')
    setMessage('')
    setForm((current) => ({
      ...current,
      email,
      password,
    }))
  }

  return (
    <main className="app-shell auth-shell">
      <section className="hero-card auth-hero">
        <div className="hero-copy">
          <AppLogo className="auth-logo" />
          <div className="auth-benefits">
            <article>
              <span aria-hidden="true">✓</span>
              <div>
                <strong>Mais segurança</strong>
                <p>Monitore seus botijões e evite riscos com alertas inteligentes.</p>
              </div>
            </article>
            <article>
              <span aria-hidden="true">▥</span>
              <div>
                <strong>Mais controle</strong>
                <p>Acompanhe histórico, consumo, marcas e estoque em um só lugar.</p>
              </div>
            </article>
            <article>
              <span aria-hidden="true">$</span>
              <div>
                <strong>Mais economia</strong>
                <p>Veja custos, médias e tendências para comprar melhor.</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="form-card auth-card">
        <div className="auth-title">
          <h1>{mode === 'login' ? 'Bem-vindo de volta!' : 'Cadastre sua casa'}</h1>
          <p>{mode === 'login' ? 'Faça login para acessar sua conta.' : 'Crie o acesso para acompanhar seu botijão.'}</p>
        </div>

        <div className="auth-tabs" role="tablist" aria-label="Acesso">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Login</button>
          <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Criar usuário</button>
        </div>

        <form className="auth-form" onSubmit={mode === 'login' ? submitLogin : submitRegister}>
          {mode === 'register' && (
            <>
              <label>
                Nome do responsável
                <input value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Ex.: Adriano" />
              </label>

              <label>
                Nome da casa
                <input value={form.homeName} onChange={(event) => update('homeName', event.target.value)} placeholder="Ex.: Casa da família" />
              </label>
            </>
          )}

          <label>
            E-mail
            <input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="voce@email.com" />
          </label>

          <label>
            Senha
            <input type="password" value={form.password} onChange={(event) => update('password', event.target.value)} placeholder="Sua senha" />
          </label>

          <button type="submit" className="primary">
            {mode === 'login' ? 'Entrar' : 'Criar usuário'}
          </button>
        </form>

        {message && <div className="settings-status" role="status">{message}</div>}

        <div className="demo-access">
          <span className="eyebrow">Ou acesse como</span>
          <div className="demo-access-actions">
            <button type="button" className="ghost" onClick={() => fillAccess(DEMO_USER_EMAIL, DEMO_USER_PASSWORD)}>
              Usuário de teste
            </button>
            <button type="button" className="ghost" onClick={() => fillAccess(SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD)}>
              Super admin
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}

