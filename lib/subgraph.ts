/**
 * lib/subgraph.ts
 *
 * Lightweight GraphQL client for The Graph Studio subgraph.
 * Uses native `fetch` — no extra dependencies needed.
 *
 * ─── SETUP ───────────────────────────────────────────────────────────────────
 * 1. Copy your "Development Query URL" from Subgraph Studio and paste it below.
 * 2. Replace the GRAPHQL_QUERY body with the entities your subgraph exposes.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/*eslint-disable*/

import { useCallback, useEffect, useRef, useState } from "react";

// ─── ① PASTE YOUR SUBGRAPH DEVELOPMENT QUERY URL HERE ────────────────────────
export const SUBGRAPH_ENDPOINT_URL =
  "https://api.studio.thegraph.com/query/1756082/erc-token-contract/version/latest";
// ─────────────────────────────────────────────────────────────────────────────

// ─── ② REPLACE WITH YOUR ACTUAL ENTITY NAMES & FIELDS ────────────────────────
//
// The query below is a generic template matching common ERC-20 subgraph schemas.
// Adjust entity names (e.g. `transferEvents`, `approvalEvents`) to match yours.
//
export const GRAPHQL_QUERY = /* GraphQL */ `
  query GetLatestEvents {
    transfers(
      first: 10
      orderBy: blockTimestamp
      orderDirection: desc
    ) {
      id
      from
      to
      value
      blockTimestamp
      transactionHash
    }
    approvals(
      first: 10
      orderBy: blockTimestamp
      orderDirection: desc
    ) {
      id
      owner
      spender
      value
      blockTimestamp
      transactionHash
    }
  }
`;
// ─────────────────────────────────────────────────────────────────────────────

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface SubgraphTransferEvent {
  id: string;
  from: string;
  to: string;
  value: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface SubgraphApprovalEvent {
  id: string;
  owner: string;
  spender: string;
  value: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface SubgraphData {
  transfers?: SubgraphTransferEvent[];
  approvals?: SubgraphApprovalEvent[];
  // Index signature so the generic renderer in the component can iterate all keys.
  [key: string]: unknown[] | undefined;
}

// ─── RAW FETCH UTILITY ────────────────────────────────────────────────────────

/**
 * Executes a single GraphQL query against the subgraph endpoint.
 * Returns typed data or throws on network / GraphQL errors.
 */
export async function fetchSubgraphData(): Promise<SubgraphData> {
  const response = await fetch(SUBGRAPH_ENDPOINT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: GRAPHQL_QUERY }),
  });

  if (!response.ok) {
    throw new Error(`Subgraph HTTP error: ${response.status}`);
  }

  const json = await response.json();

  if (json.errors?.length) {
    throw new Error(
      `Subgraph GraphQL error: ${json.errors
        .map((e: { message: string }) => e.message)
        .join(", ")}`
    );
  }

  // ⬇ Log the raw response so you can inspect real field names in DevTools.
  console.log("[Subgraph] raw response →", json.data);

  return json.data as SubgraphData;
}

// ─── HOOK ─────────────────────────────────────────────────────────────────────

interface UseSubgraphDataOptions {
  /**
   * Automatically poll the subgraph every N milliseconds.
   * Set to 0 (default) to disable automatic polling and only
   * fetch when `refetch()` is called.
   */
  pollIntervalMs?: number;
}

interface UseSubgraphDataReturn {
  data: SubgraphData | null;
  loading: boolean;
  error: string | null;
  /** Call this after a successful on-chain transaction to force a refresh. */
  refetch: () => void;
  /**
   * Polls the subgraph every `intervalMs` for up to `maxWaitMs` (default 30 s)
   * until the record count grows (i.e. a new event appears), then stops.
   * Ideal for the "Syncing with indexer…" phase right after tx.wait().
   */
  pollUntilUpdated: (maxWaitMs?: number, intervalMs?: number) => void;
}

export function useSubgraphData(
  options: UseSubgraphDataOptions = {}
): UseSubgraphDataReturn {
  const { pollIntervalMs = 0 } = options;

  const [data, setData] = useState<SubgraphData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stable ref so interval callbacks always see the latest data
  const dataRef = useRef<SubgraphData | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const targetPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const doFetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fresh = await fetchSubgraphData();
      dataRef.current = fresh;
      setData(fresh);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Public trigger for a one-off refetch (call after tx.wait())
  const refetch = useCallback(() => {
    doFetch();
  }, [doFetch]);

  /**
   * After a transaction lands on-chain, the indexer may lag 2–15 seconds.
   * `pollUntilUpdated` polls every `intervalMs` until the event list grows
   * or `maxWaitMs` elapses — whichever comes first.
   */
  const pollUntilUpdated = useCallback(
    (maxWaitMs = 30_000, intervalMs = 3_000) => {
      const prevTransferCount =
        dataRef.current?.transfers?.length ?? 0;
      const prevApprovalCount =
        dataRef.current?.approvals?.length ?? 0;

      let elapsed = 0;

      // Clear any in-flight target-poll
      if (targetPollRef.current !== null) {
        clearInterval(targetPollRef.current);
      }

      targetPollRef.current = setInterval(async () => {
        elapsed += intervalMs;

        try {
          const fresh = await fetchSubgraphData();
          const newTransferCount = fresh.transfers?.length ?? 0;
          const newApprovalCount = fresh.approvals?.length ?? 0;

          const hasUpdated =
            newTransferCount > prevTransferCount ||
            newApprovalCount > prevApprovalCount;

          if (hasUpdated || elapsed >= maxWaitMs) {
            dataRef.current = fresh;
            setData(fresh);
            clearInterval(targetPollRef.current!);
            targetPollRef.current = null;
          }
        } catch {
          // silently retry until maxWaitMs elapses
        }
      }, intervalMs);
    },
    []
  );

  // Background auto-poll (optional, disabled by default)
  useEffect(() => {
    doFetch(); // initial load

    if (pollIntervalMs > 0) {
      pollTimerRef.current = setInterval(doFetch, pollIntervalMs);
    }

    return () => {
      if (pollTimerRef.current !== null) clearInterval(pollTimerRef.current);
      if (targetPollRef.current !== null) clearInterval(targetPollRef.current);
    };
  }, [doFetch, pollIntervalMs]);

  return { data, loading, error, refetch, pollUntilUpdated };
}
