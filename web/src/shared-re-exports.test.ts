// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

// App CI never typechecks (lint is eslint only; tsc runs inside build), so a
// renamed or dropped library export would reach main uncaught. Each block
// checks the binding is defined AND is the library's object: `toBe` alone
// passes when both sides are undefined.
import { describe, expect, it } from "vitest";
import * as lib from "@mochi/web";
import { projectsRequest } from "@/api/request";

describe("bindings onto @mochi/web", () => {
  it("builds this app's request client with the shared factory", () => {
    expect(lib.createAppClient).toBeInstanceOf(Function);
    expect(projectsRequest).toBeDefined();
    expect(projectsRequest.get).toBeInstanceOf(Function);
    expect(projectsRequest.post).toBeInstanceOf(Function);
    // The factory's whole surface, so a hand-rolled object here, or a method
    // the library stops handing out, would not pass as one.
    expect(Object.keys(projectsRequest).sort()).toEqual(
      Object.keys(lib.createAppClient({ appName: "projects" })).sort(),
    );
  });
});
