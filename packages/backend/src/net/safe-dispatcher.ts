import { lookup as dnsLookup, promises as dnsPromises } from 'node:dns';
import type { LookupFunction } from 'node:net';
import { Agent } from 'undici';
import { guardLookup, type NodeStyleLookup, type SafeFetchLookup } from './page.js';

/** A `SafeFetchLookup` backed by the system resolver (every address, both families). */
export const nodeDnsLookup: SafeFetchLookup = async (hostname) =>
  dnsPromises.lookup(hostname, { all: true });

/**
 * An undici Agent whose connections can only reach public addresses: the address actually
 * connected to is checked, which closes the DNS-rebinding gap a pre-flight lookup leaves.
 * Pass it as `dispatcher` to `fetchSafeBody`/`fetchPage`, or register it once with
 * `setSafeFetchDispatcher`.
 */
export function createSafeDispatcher(options: { lookup?: NodeStyleLookup } = {}): Agent {
  const base: NodeStyleLookup =
    options.lookup ?? ((hostname, opts, callback) => dnsLookup(hostname, opts, callback));
  const guarded = guardLookup(base) as unknown as LookupFunction;
  return new Agent({ connect: { lookup: guarded } });
}
