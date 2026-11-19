// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
// The shared object/class/field routes are asserted once in @mochi/web, in
// lib/entity-endpoints.test.ts. What is left here is what only projects has:
// templates, merge requests, diff preferences and the repository integration
// behind them.
import { entityEndpoints } from '@mochi/web'
import { describe, it, expect } from 'vitest'
import endpoints from './endpoints'

describe('endpoints.projects', () => {
  it('carries the shared entity table', () => {
    for (const [name, route] of Object.entries(entityEndpoints)) {
      expect(endpoints.projects[name as keyof typeof entityEndpoints]).toBe(
        route
      )
    }
  })

  describe('template and repository endpoints', () => {
    it('should have templates endpoint', () => {
      expect(endpoints.projects.templates).toBe('-/templates')
    })

    it('should have repositories endpoint', () => {
      expect(endpoints.projects.repositories).toBe('-/repositories')
    })
  })

  describe('request endpoints', () => {
    it('should generate requests list endpoint', () => {
      expect(endpoints.projects.requests('proj1', 'obj1')).toBe(
        'proj1/-/objects/obj1/requests'
      )
    })

    it('should generate request create endpoint', () => {
      expect(endpoints.projects.requestCreate('proj1', 'obj1')).toBe(
        'proj1/-/objects/obj1/requests/create'
      )
    })

    it('should generate request update endpoint', () => {
      expect(endpoints.projects.requestUpdate('proj1', 'obj1', 'req1')).toBe(
        'proj1/-/objects/obj1/requests/req1/update'
      )
    })

    it('should generate request delete endpoint', () => {
      expect(endpoints.projects.requestDelete('proj1', 'obj1', 'req1')).toBe(
        'proj1/-/objects/obj1/requests/req1/delete'
      )
    })
  })

  describe('diff preference endpoints', () => {
    it('should have diff preference endpoints', () => {
      expect(endpoints.projects.diffPreference).toBe('-/diff/preference')
      expect(endpoints.projects.diffPreferenceSet).toBe('-/diff/preference/set')
    })
  })

  describe('repository integration endpoints', () => {
    it('should generate repository branches endpoint', () => {
      expect(endpoints.projects.repositoryBranches('repo1')).toBe(
        '-/repositories/repo1/branches'
      )
    })

    it('should generate repository merge check endpoint', () => {
      expect(endpoints.projects.repositoryMergeCheck('repo1')).toBe(
        '-/repositories/repo1/merge/check'
      )
    })

    it('should generate repository diff endpoint', () => {
      expect(endpoints.projects.repositoryDiff('repo1')).toBe(
        '-/repositories/repo1/diff'
      )
    })

    it('should generate repository merge endpoint', () => {
      expect(endpoints.projects.repositoryMerge('repo1')).toBe(
        '-/repositories/repo1/merge'
      )
    })
  })

  // A project, object, request or repository id comes from the route or from
  // another server, so each goes in through path: one holding `../delete`, a
  // query or a slash would otherwise aim the request at another action. Core
  // routes on the decoded path, so a slash is refused rather than encoded.
  describe('hostile ids', () => {
    const REFUSED = ['../delete', 'a/b', '.', '..', '']

    it('are refused by every builder', () => {
      for (const id of REFUSED) {
        expect(() => endpoints.projects.requests(id, 'obj1')).toThrow()
        expect(() => endpoints.projects.requests('proj1', id)).toThrow()
        expect(() =>
          endpoints.projects.requestUpdate('proj1', 'obj1', id)
        ).toThrow()
        expect(() =>
          endpoints.projects.requestDelete('proj1', id, 'req1')
        ).toThrow()
        expect(() => endpoints.projects.repositoryBranches(id)).toThrow()
        expect(() => endpoints.projects.repositoryMerge(id)).toThrow()
      }
    })

    it('keep a query inside its segment', () => {
      expect(endpoints.projects.requestDelete('proj1', 'obj1', 'x?y=1')).toBe(
        'proj1/-/objects/obj1/requests/x%3Fy%3D1/delete'
      )
      expect(endpoints.projects.repositoryDiff('x#y')).toBe(
        '-/repositories/x%23y/diff'
      )
    })
  })
})
