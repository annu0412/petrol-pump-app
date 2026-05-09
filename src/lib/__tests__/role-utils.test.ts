import test from 'node:test'
import assert from 'node:assert/strict'
import { canManage, isOwner } from '../role-utils.ts'

test('role-utils canManage', (t) => {
  assert.strictEqual(canManage('owner'), true, 'canManage(owner) should be true')
  assert.strictEqual(canManage('manager'), true, 'canManage(manager) should be true')
  assert.strictEqual(canManage('employee'), false, 'canManage(employee) should be false')
  assert.strictEqual(canManage(''), false, 'canManage("") should be false')
  assert.strictEqual(canManage('random'), false, 'canManage("random") should be false')
})

test('role-utils isOwner', (t) => {
  assert.strictEqual(isOwner('owner'), true, 'isOwner(owner) should be true')
  assert.strictEqual(isOwner('manager'), false, 'isOwner(manager) should be false')
  assert.strictEqual(isOwner('employee'), false, 'isOwner(employee) should be false')
  assert.strictEqual(isOwner(''), false, 'isOwner("") should be false')
  assert.strictEqual(isOwner('random'), false, 'isOwner("random") should be false')
})
