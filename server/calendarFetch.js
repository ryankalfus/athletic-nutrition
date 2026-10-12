// Subscription-link fetch for team calendars (P2-02). The server fetches a
// public http(s) or webcal URL for the browser (team apps do not send CORS
// headers) with an SSRF guard:
// - only http and https (webcal → https), ports 80 and 443, no user:pass@;
// - the host must resolve only to public unicast addresses: every address
//   from DNS is checked, and the socket connects to the checked address (a
//   pinned lookup), so a DNS-rebinding name cannot swap in a private one;
// - IP literals in any form the URL parser accepts (decimal 2130706433, octal
//   0177.0.0.1, hex 0x7f.1, IPv4-mapped IPv6) are normalized by WHATWG URL and
//   checked the same way;
// - at most 3 redirects, each target checked again;
// - 10 s timeout, 1 MB limit, text/calendar or text/plain only.
import { BlockList, isIP } from "node:net";
import { lookup as dnsLookup } from "node:dns";
import http from "node:http";
import https from "node:https";

export const MAX_BYTES = 1024 * 1024;
export const TIMEOUT_MS = 10000;
export const MAX_REDIRECTS = 3;

export class CalendarFetchError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const blocked = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8], // "this" network
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local (cloud metadata)
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // TEST-NET-1
  ["192.88.99.0", 24], // 6to4 relay anycast
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // TEST-NET-2
  ["203.0.113.0", 24], // TEST-NET-3
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved and broadcast
])
  blocked.addSubnet(network, prefix, "ipv4");
for (const [network, prefix] of [
  ["::", 96], // unspecified, loopback, IPv4-compatible
  ["64:ff9b::", 96], // NAT64
  ["64:ff9b:1::", 48], // local NAT64
  ["100::", 64], // discard
  ["2001::", 23], // IETF protocol assignments (Teredo, ORCHID, benchmarking)
  ["2001:db8::", 32], // documentation
  ["2002::", 16], // 6to4
  ["3fff::", 20], // documentation
  ["5f00::", 16], // SRv6 SIDs
  ["fc00::", 7], // unique local
  ["fe80::", 10], // link-local
  ["fec0::", 10], // site-local (deprecated)
  ["ff00::", 8], // multicast
])
  blocked.addSubnet(network, prefix, "ipv6");

// "::ffff:7f00:1" / "::ffff:127.0.0.1" → "127.0.0.1".
function mappedIPv4(address) {
  const match = address
    .toLowerCase()
    .match(/^(?:0{0,4}:){0,4}:?(?:0{0,4}:)?ffff:(.+)$/);
  if (!match) return null;
  const tail = match[1];
  if (isIP(tail) === 4) return tail;
  const hex = tail.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (!hex) return null;
  const high = parseInt(hex[1], 16);
  const low = parseInt(hex[2], 16);
  return [high >> 8, high & 255, low >> 8, low & 255].join(".");
}

/** True only for a public unicast IPv4 or IPv6 address. */
export function isPublicAddress(address) {
  const raw = String(address || "").replace(/^\[|\]$/g, "");
  const ip = raw.split("%")[0]; // zone ids ("fe80::1%eth0")
  const family = isIP(ip);
  if (family === 4) return !blocked.check(ip, "ipv4");
  if (family !== 6) return false;
  const v4 = mappedIPv4(ip);
  if (v4) return isPublicAddress(v4);
  // Global unicast lives in 2000::/3; everything else is special-purpose.
  const first = parseInt(ip.split(":")[0] || "0", 16);
  if (Number.isNaN(first) || (first & 0xe000) !== 0x2000) return false;
  return !blocked.check(ip, "ipv6");
}

const BLOCKED_NAMES =
  /(^|\.)(localhost|local|localdomain|internal|intranet|lan|home\.arpa|corp|test|invalid|example|onion)$/i;

/**
 * Parses and checks a URL before any network use. webcal(s) maps to https.
 * @returns {URL}
 */
export function checkCalendarUrl(text, { ports = ["80", "443"] } = {}) {
  const raw = String(text || "").trim();
  if (!raw || raw.length > 2048)
    throw new CalendarFetchError("Paste the calendar link.");
  let url;
  try {
    url = new URL(raw.replace(/^webcals?:\/\//i, "https://"));
  } catch {
    throw new CalendarFetchError("That link doesn't look right.");
  }
  if (!["http:", "https:"].includes(url.protocol))
    throw new CalendarFetchError("Use an http, https or webcal link.");
  if (url.username || url.password)
    throw new CalendarFetchError("Links with a user name can't be used.");
  if (url.port && !ports.includes(url.port))
    throw new CalendarFetchError("Links with a custom port can't be used.");
  const host = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (!host) throw new CalendarFetchError("That link has no host.");
  if (isIP(host)) {
    if (!isPublicAddress(host))
      throw new CalendarFetchError("That address is not a public website.");
  } else if (BLOCKED_NAMES.test(host) || !host.includes("."))
    throw new CalendarFetchError("That address is not a public website.");
  url.hash = "";
  return url;
}

/**
 * A dns.lookup replacement for http.request: resolves every address, refuses
 * the host if any one is not public, and connects to the checked address.
 */
export function pinnedLookup(resolve = dnsLookup, isAllowed = isPublicAddress) {
  return (hostname, options, callback) => {
    const done = typeof options === "function" ? options : callback;
    const opts = typeof options === "object" && options ? options : {};
    resolve(hostname, { all: true, verbatim: true }, (error, addresses) => {
      if (error) return done(error);
      const list = Array.isArray(addresses)
        ? addresses
        : [{ address: addresses, family: isIP(String(addresses)) }];
      if (!list.length || list.some((item) => !isAllowed(item.address)))
        return done(
          new CalendarFetchError("That address is not a public website."),
        );
      const family = opts.family;
      const usable = family
        ? list.filter((item) => item.family === family)
        : list;
      if (!usable.length)
        return done(new CalendarFetchError("That host has no usable address."));
      if (opts.all) return done(null, usable);
      return done(null, usable[0].address, usable[0].family);
    });
  };
}

// One GET with the pinned lookup; resolves to { status, headers, body }.
// The body is read only for 2xx answers, up to `maxBytes`.
function request(url, { lookup, maxBytes, signal }) {
  return new Promise((resolve, reject) => {
    const client = url.protocol === "https:" ? https : http;
    const req = client.request(
      url,
      {
        method: "GET",
        lookup,
        signal,
        agent: false,
        headers: {
          Accept: "text/calendar, text/plain;q=0.9",
          "Accept-Encoding": "identity",
          "User-Agent": "Nourally/0.2 (team calendar)",
        },
      },
      (res) => {
        const status = res.statusCode || 0;
        if (status < 200 || status >= 300) {
          res.resume();
          return resolve({ status, headers: res.headers, body: "" });
        }
        const length = Number(res.headers["content-length"]);
        if (length > maxBytes) {
          res.destroy();
          return reject(
            new CalendarFetchError("That calendar is too large.", 413),
          );
        }
        const chunks = [];
        let size = 0;
        res.on("data", (chunk) => {
          size += chunk.length;
          if (size > maxBytes) {
            res.destroy();
            reject(new CalendarFetchError("That calendar is too large.", 413));
          } else chunks.push(chunk);
        });
        res.on("end", () =>
          resolve({
            status,
            headers: res.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          }),
        );
        res.on("error", reject);
      },
    );
    req.on("error", reject);
    req.end();
  });
}

/**
 * Fetches a calendar feed and returns its text.
 * @param {string} link http(s) or webcal URL
 * @param {{ resolve?: Function, isAllowed?: (address: string) => boolean, send?: Function, maxBytes?: number, timeoutMs?: number, ports?: string[] }} [options]
 *   `send(url, { lookup, maxBytes, signal })` replaces the HTTP request in tests.
 */
export async function fetchCalendar(link, options = {}) {
  const {
    resolve = dnsLookup,
    isAllowed = isPublicAddress,
    send = request,
    maxBytes = MAX_BYTES,
    timeoutMs = TIMEOUT_MS,
    ports,
  } = options;
  const lookup = pinnedLookup(resolve, isAllowed);
  const signal = AbortSignal.timeout(timeoutMs);
  let url = checkCalendarUrl(link, { ports });
  for (let hop = 0; ; hop++) {
    // An IP literal skips DNS, so check it here as well.
    const host = url.hostname.replace(/^\[|\]$/g, "");
    if (isIP(host) && !isAllowed(host))
      throw new CalendarFetchError("That address is not a public website.");
    let answer;
    try {
      answer = await send(url, { lookup, maxBytes, signal });
    } catch (error) {
      if (error instanceof CalendarFetchError) throw error;
      if (error?.name === "TimeoutError" || error?.name === "AbortError")
        throw new CalendarFetchError(
          "The calendar took too long to answer.",
          504,
        );
      throw new CalendarFetchError("Couldn't reach that calendar.", 502);
    }
    if ([301, 302, 303, 307, 308].includes(answer.status)) {
      if (hop >= MAX_REDIRECTS)
        throw new CalendarFetchError(
          "That link redirects too many times.",
          502,
        );
      const location = answer.headers?.location;
      if (!location)
        throw new CalendarFetchError("Couldn't reach that calendar.", 502);
      const next = new URL(String(location), url);
      // Redirects keep to http(s); webcal is only for the pasted link.
      if (!["http:", "https:"].includes(next.protocol))
        throw new CalendarFetchError("That link redirects somewhere unsafe.");
      url = checkCalendarUrl(next.href, { ports });
      continue;
    }
    if (answer.status === 404 || answer.status === 410)
      throw new CalendarFetchError("That calendar link was not found.", 404);
    if (answer.status < 200 || answer.status >= 300)
      throw new CalendarFetchError("Couldn't reach that calendar.", 502);
    const type = String(answer.headers?.["content-type"] || "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    if (!["text/calendar", "text/plain"].includes(type))
      throw new CalendarFetchError("That link is not a calendar feed.", 415);
    if (!/BEGIN:VCALENDAR/i.test(answer.body.slice(0, 2048)))
      throw new CalendarFetchError("That link is not a calendar feed.", 415);
    return { text: answer.body, url: url.href };
  }
}
