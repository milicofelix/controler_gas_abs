import assert from 'node:assert/strict'
import test from 'node:test'
import { PAGE_OPTIONS, STATUS_STEPS, THEME_OPTIONS, getThemeOption } from './appOptions.js'

test('keeps the expected app pages in navigation order', () => {
  assert.deepEqual(PAGE_OPTIONS.map((page) => page.id), [
    'home',
    'history',
    'stock',
    'stats',
    'alerts',
    'profile',
  ])
})

test('keeps the expected gas status order', () => {
  assert.deepEqual(STATUS_STEPS.map((status) => status.tone), [
    'full',
    'medium',
    'low',
    'critical',
  ])
})

test('finds a theme by id and falls back to the first theme', () => {
  assert.equal(getThemeOption('green-clean').name, 'Verde Clean')
  assert.equal(getThemeOption('unknown-theme'), THEME_OPTIONS[0])
})
