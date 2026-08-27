import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DESKTOP_RPC_TOKEN,
  isDesktopRequestAuthorized,
} from './desktop-token.ts'

function headers(overrides = {}) {
  return new Headers({
    host: '127.0.0.1:3002',
    'x-desktop-token': DESKTOP_RPC_TOKEN,
    ...overrides,
  })
}

test('desktop request authorization requires the process token', () => {
  assert.ok(DESKTOP_RPC_TOKEN.length >= 32)
  assert.equal(process.env.DESKTOP_RPC_TOKEN, DESKTOP_RPC_TOKEN)
  assert.equal(
    isDesktopRequestAuthorized(
      headers({
        'x-desktop-token': '',
      }),
    ),
    false,
  )
  assert.equal(isDesktopRequestAuthorized(headers()), true)
})

test('desktop request authorization accepts the Electron cookie', () => {
  assert.equal(
    isDesktopRequestAuthorized(
      headers({
        cookie: `desktop-rpc-token=${DESKTOP_RPC_TOKEN}`,
        'x-desktop-token': '',
      }),
    ),
    true,
  )
})

test('desktop request authorization rejects DNS-rebinding hosts', () => {
  assert.equal(
    isDesktopRequestAuthorized(headers({ host: 'attacker.example:3002' })),
    false,
  )
  assert.equal(
    isDesktopRequestAuthorized(headers({ host: 'localhost.attacker:3002' })),
    false,
  )
})

test('desktop request authorization allows loopback host forms', () => {
  for (const host of ['localhost:3002', '127.0.0.1:3002', '[::1]:3002']) {
    assert.equal(isDesktopRequestAuthorized(headers({ host })), true)
  }
})
