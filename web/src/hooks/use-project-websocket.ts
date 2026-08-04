// Mochi Projects: WebSocket hook for real-time project updates
// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useEntityWebsocket } from "@mochi/web";

// Subscribe to project WebSocket events and invalidate relevant queries.
export function useProjectWebsocket(
  projectFingerprint?: string,
  onSync?: () => void,
) {
  useEntityWebsocket({
    entity: "project",
    fingerprint: projectFingerprint,
    onSync,
  });
}
