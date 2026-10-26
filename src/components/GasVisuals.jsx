import { LocalNotifications } from '@capacitor/local-notifications'
import { GAS_REMINDER_NOTIFICATION_ID, normalizeBrand } from '../gasMath.js'

export function AppLogo({ className = '' }) {
  return (
    <img
      className={`app-logo ${className}`}
      src="/logo-controle-gas-abs.png"
      alt="Controle de Gás ABS"
    />
  )
}

export async function cancelGasReminder() {
  try {
    await LocalNotifications.cancel({
      notifications: [{ id: GAS_REMINDER_NOTIFICATION_ID }],
    })
  } catch {
    // O cancelamento pode falhar no navegador; o app segue funcionando.
  }
}

function getBrandInitials(name) {
  return String(name || 'Gás')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function BrandLogo({ brand, className = '' }) {
  const normalizedBrand = normalizeBrand(brand)

  if (normalizedBrand.logo) {
    return (
      <img
        className={`brand-logo uploaded ${className}`}
        src={normalizedBrand.logo}
        alt={`Logo ${normalizedBrand.name}`}
      />
    )
  }

  return (
    <span className={`brand-logo fallback ${className}`} aria-hidden="true">
      {getBrandInitials(normalizedBrand.name)}
    </span>
  )
}

export function ProfileAvatar({ user }) {
  const avatar = user.residenceProfile?.avatar

  if (avatar) {
    return <img className="profile-avatar" src={avatar} alt={user.name} />
  }

  return <span className="profile-avatar fallback" aria-hidden="true">{getBrandInitials(user.name)}</span>
}

export function CylinderGauge({ percent, tone }) {
  const fillHeight = `${percent}%`

  return (
    <div className={`cylinder-stage ${tone}`}>
      <div className="gauge-arc" aria-hidden="true">
        <span className="arc-fill"></span>
        <small className="arc-start">0%</small>
        <small className="arc-end">100%</small>
      </div>

      <div className={`cylinder-wrap ${tone}`} aria-label={`Botijão com ${percent}% de gás estimado`}>
        <div className="cylinder-top-ring"></div>
        <div className="cylinder-neck"></div>
        <div className="cylinder-handle">
          <span></span>
          <i></i>
        </div>
        <div className="cylinder-body">
          <div className="cylinder-inner-window">
            <div className="cylinder-fill" style={{ height: fillHeight }}></div>
            <div className="liquid-reflection"></div>
          </div>
          <div className="cylinder-shine"></div>
          <div className="cylinder-label">
            <strong>{percent}%</strong>
            <small>P13 • 13kg</small>
          </div>
        </div>
        <div className="cylinder-foot left"></div>
        <div className="cylinder-foot right"></div>
        <div className="cylinder-base"></div>
      </div>
    </div>
  )
}

