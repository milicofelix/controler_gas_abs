export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_IMAGE_BYTES = 1024 * 1024

export function validateImageFile(file) {
  if (!file || !ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, message: 'Use uma imagem JPG, PNG ou WEBP.' }
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return { valid: false, message: 'Use uma imagem de até 1 MB.' }
  }

  return { valid: true, message: '' }
}

export function readImageFile(file, onSuccess, onError) {
  const validation = validateImageFile(file)

  if (!validation.valid) {
    onError(validation.message)
    return
  }

  const reader = new FileReader()

  reader.onload = () => onSuccess(String(reader.result || ''))
  reader.onerror = () => onError('Não foi possível carregar a imagem.')
  reader.readAsDataURL(file)
}
