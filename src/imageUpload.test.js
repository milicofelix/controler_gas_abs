import assert from 'node:assert/strict'
import test from 'node:test'
import { MAX_IMAGE_BYTES, validateImageFile } from './imageUpload.js'

test('accepts jpg, png and webp images up to 1 MB', () => {
  assert.deepEqual(validateImageFile({ type: 'image/jpeg', size: MAX_IMAGE_BYTES }), { valid: true, message: '' })
  assert.deepEqual(validateImageFile({ type: 'image/png', size: 128 }), { valid: true, message: '' })
  assert.deepEqual(validateImageFile({ type: 'image/webp', size: 128 }), { valid: true, message: '' })
})

test('rejects missing files and unsupported image types', () => {
  assert.deepEqual(validateImageFile(null), {
    valid: false,
    message: 'Use uma imagem JPG, PNG ou WEBP.',
  })
  assert.deepEqual(validateImageFile({ type: 'image/gif', size: 128 }), {
    valid: false,
    message: 'Use uma imagem JPG, PNG ou WEBP.',
  })
})

test('rejects images larger than 1 MB', () => {
  assert.deepEqual(validateImageFile({ type: 'image/png', size: MAX_IMAGE_BYTES + 1 }), {
    valid: false,
    message: 'Use uma imagem de até 1 MB.',
  })
})
