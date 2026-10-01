import { expect, test } from 'vitest'
import { isBlockedUrl } from '#local/browser.ts'

test('isBlockedUrl allows public http(s) urls and inline resources', () => {
  expect(isBlockedUrl('https://example.com/app.js')).toBe(false)
  expect(isBlockedUrl('http://cdn.example.com/x')).toBe(false)
  expect(isBlockedUrl('data:text/plain,hi')).toBe(false)
})

test('isBlockedUrl blocks local network and non-http urls', () => {
  expect(isBlockedUrl('http://localhost:3000')).toBe(true)
  expect(isBlockedUrl('http://foo.localhost')).toBe(true)
  expect(isBlockedUrl('http://127.0.0.1')).toBe(true)
  expect(isBlockedUrl('http://192.168.1.1/admin')).toBe(true)
  expect(isBlockedUrl('http://[::1]:8080')).toBe(true)
  expect(isBlockedUrl('file:///etc/passwd')).toBe(true)
  expect(isBlockedUrl('ws://example.com')).toBe(true)
  expect(isBlockedUrl('not a url')).toBe(true)
})
