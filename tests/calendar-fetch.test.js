// P2-02: the subscription-link fetch only reaches public http(s) hosts.
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import {
  checkCalendarUrl,
  fetchCalendar,
  isPublicAddress,
  pinnedLookup,
} from "../server/calendarFetch.js";

const ICS = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n";
// A fake DNS: host → addresses.
const dns = (table) => (host, _options, callback) => {
  const list = table[host];
  if (!list)
    return callback(
      Object.assign(new Error("ENOTFOUND"), { code: "ENOTFOUND" }),
    );
  callback(
    null,
    list.map((address) => ({ address, family: address.includes(":") ? 6 : 4 })),
  );
};
// A fake HTTP layer that resolves the host through the pinned lookup first,
// as http.request does, then answers from a table keyed by URL.
const fakeSend =
  (answers, visited = []) =>
  (url, { lookup }) =>
    new Promise((resolve, reject) => {
      visited.push(url.href);
      const answer = () => {
        const reply = answers[url.href];
        if (!reply) return reject(new Error("no route"));
        resolve({ body: "", headers: {}, ...reply });
      };
      const host = url.hostname.replace(/^\[|\]$/g, "");
      if (/^[\d.]+$|:/.test(host)) return answer();
      lookup(host, { all: true }, (error) =>
        error ? reject(error) : answer(),
      );
    });

test("P2-02: private, loopback, link-local, multicast and reserved addresses are not public", () => {
  for (const address of [
    "127.0.0.1",
    "127.255.255.254",
    "10.1.2.3",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.10",
    "169.254.169.254", // cloud metadata
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "239.255.255.250",
    "240.0.0.1",
    "255.255.255.255",
    "192.0.2.1",
    "198.18.0.1",
    "::",
    "::1",
    "::ffff:127.0.0.1",
    "::ffff:7f00:1",
    "::ffff:a9fe:a9fe",
    "0:0:0:0:0:ffff:7f00:1",
    "64:ff9b::7f00:1",
    "fc00::1",
    "fd12:3456::1",
    "fe80::1",
    "fe80::1%eth0",
    "ff02::1",
    "2001:db8::1",
    "2002:7f00:1::1",
    "2001::1", // Teredo
    "not-an-ip",
  ])
    assert.equal(isPublicAddress(address), false, address);
  for (const address of [
    "8.8.8.8",
    "151.101.1.69",
    "172.32.0.1",
    "2606:4700::6810:85e5",
    "2a00:1450:4001:82a::200e",
    "::ffff:8.8.8.8",
  ])
    assert.equal(isPublicAddress(address), true, address);
});

test("P2-02: only http(s) and webcal links to public hosts pass the URL check", () => {
  assert.equal(
    checkCalendarUrl("webcal://go.teamsnap.com/ics/team.ics").href,
    "https://go.teamsnap.com/ics/team.ics",
  );
  assert.equal(
    checkCalendarUrl("webcals://calendar.example.org/a.ics").protocol,
    "https:",
  );
  for (const link of [
    "file:///etc/passwd",
    "ftp://calendar.example.org/a.ics",
    "gopher://calendar.example.org/",
    "javascript:alert(1)",
    "http://localhost/a.ics",
    "http://LOCALHOST./a.ics",
    "http://api.localhost/a.ics",
    "http://printer.local/a.ics",
    "http://intranet/a.ics",
    "http://127.0.0.1/a.ics",
    "http://2130706433/a.ics", // decimal 127.0.0.1
    "http://0x7f000001/a.ics", // hex
    "http://0177.0.0.1/a.ics", // octal
    "http://017700000001/a.ics", // octal, one number
    "http://127.1/a.ics", // short form
    "http://0/a.ics",
    "http://[::1]/a.ics",
    "http://[::ffff:127.0.0.1]/a.ics",
    "http://[::ffff:a9fe:a9fe]/latest/meta-data",
    "http://[fe80::1]/a.ics",
    "http://169.254.169.254/latest/meta-data/",
    "http://10.0.0.5/a.ics",
    "http://user:pass@calendar.example.org/a.ics",
    "http://calendar.example.org:8080/a.ics",
    "https://calendar.example.org:22/a.ics",
    "",
  ])
    assert.throws(() => checkCalendarUrl(link), Error, link);
});

test("P2-02: every DNS answer is checked, so a rebinding name with a private address is refused", async () => {
  const table = {
    "calendar.good.org": ["151.101.1.69"],
    "127.0.0.1.nip.io": ["127.0.0.1"],
    "rebind.attacker.org": ["151.101.1.69", "10.0.0.1"],
    "v6.attacker.org": ["::1"],
    "mapped.attacker.org": ["::ffff:192.168.0.1"],
  };
  const lookup = pinnedLookup(dns(table));
  const ask = (host, options = {}) =>
    new Promise((resolve) =>
      lookup(host, options, (error, address, family) =>
        resolve({ error, address, family }),
      ),
    );
  assert.equal((await ask("calendar.good.org")).address, "151.101.1.69");
  assert.deepEqual((await ask("calendar.good.org", { all: true })).address, [
    { address: "151.101.1.69", family: 4 },
  ]);
  for (const host of [
    "127.0.0.1.nip.io",
    "rebind.attacker.org",
    "v6.attacker.org",
    "mapped.attacker.org",
  ])
    assert.match(
      String((await ask(host)).error?.message),
      /not a public/,
      host,
    );

  const send = fakeSend({
    "https://127.0.0.1.nip.io/a.ics": { status: 200, body: ICS },
  });
  await assert.rejects(
    fetchCalendar("webcal://127.0.0.1.nip.io/a.ics", {
      resolve: dns(table),
      send,
    }),
    /not a public/,
  );
});

test("P2-02: redirects are followed up to 3 times and each target is checked", async () => {
  const table = {
    "feed.team.org": ["151.101.1.69"],
    "cdn.team.org": ["151.101.1.70"],
    "internal.team.org": ["10.0.0.7"],
  };
  const visited = [];
  const ok = await fetchCalendar("webcal://feed.team.org/a", {
    resolve: dns(table),
    send: fakeSend(
      {
        "https://feed.team.org/a": {
          status: 302,
          headers: { location: "https://cdn.team.org/a.ics" },
        },
        "https://cdn.team.org/a.ics": {
          status: 200,
          headers: { "content-type": "text/calendar; charset=utf-8" },
          body: ICS,
        },
      },
      visited,
    ),
  });
  assert.equal(ok.text, ICS);
  assert.deepEqual(visited, [
    "https://feed.team.org/a",
    "https://cdn.team.org/a.ics",
  ]);

  // A redirect to a private IP literal, a private name, metadata, or a
  // non-http scheme is refused before any request is made to it.
  for (const location of [
    "http://10.0.0.1/a.ics",
    "http://169.254.169.254/latest/meta-data/",
    "http://[::1]/a.ics",
    "http://2130706433/a.ics",
    "https://internal.team.org/a.ics",
    "http://localhost/a.ics",
    "file:///etc/passwd",
  ]) {
    const seen = [];
    await assert.rejects(
      fetchCalendar("https://feed.team.org/a", {
        resolve: dns(table),
        send: fakeSend(
          {
            "https://feed.team.org/a": {
              status: 301,
              headers: { location },
            },
            [location]: { status: 200, body: ICS },
          },
          seen,
        ),
      }),
      /public|unsafe|http/,
      location,
    );
    assert.ok(
      !seen.includes(location) || location.includes("internal"),
      location,
    );
  }

  // Four hops is one too many.
  const loop = {};
  for (let i = 0; i < 5; i++)
    loop[`https://feed.team.org/${i}`] = {
      status: 307,
      headers: { location: `/${i + 1}` },
    };
  await assert.rejects(
    fetchCalendar("https://feed.team.org/0", {
      resolve: dns(table),
      send: fakeSend(loop),
    }),
    /too many/,
  );
});

test("P2-02: only text/calendar or text/plain calendar bodies are returned", async () => {
  const table = { "feed.team.org": ["151.101.1.69"] };
  const answer = (reply) =>
    fetchCalendar("https://feed.team.org/a.ics", {
      resolve: dns(table),
      send: fakeSend({ "https://feed.team.org/a.ics": reply }),
    });
  assert.equal(
    (
      await answer({
        status: 200,
        headers: { "content-type": "text/plain" },
        body: ICS,
      })
    ).text,
    ICS,
  );
  await assert.rejects(
    answer({
      status: 200,
      headers: { "content-type": "text/html" },
      body: ICS,
    }),
    /not a calendar/,
  );
  await assert.rejects(
    answer({
      status: 200,
      headers: { "content-type": "text/calendar" },
      body: "<html>",
    }),
    /not a calendar/,
  );
  await assert.rejects(answer({ status: 404 }), /not found/);
  await assert.rejects(answer({ status: 500 }), /Couldn't reach/);
});

test("P2-02: the real transport connects to the pinned address and enforces size and time limits", async () => {
  const big = `BEGIN:VCALENDAR\r\n${"X-PAD:".padEnd(200, "x")}\r\n`.repeat(
    6000,
  );
  const server = createServer((req, res) => {
    if (req.url === "/ok.ics") {
      res.writeHead(200, { "Content-Type": "text/calendar" });
      res.end(ICS);
    } else if (req.url === "/big.ics") {
      res.writeHead(200, { "Content-Type": "text/calendar" });
      res.end(big);
    } else if (req.url === "/slow.ics") {
      res.writeHead(200, { "Content-Type": "text/calendar" });
      res.write("BEGIN:VCALENDAR\r\n");
    } else if (req.url === "/hop") {
      res.writeHead(302, { Location: "http://127.0.0.1/ok.ics" });
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = String(
    typeof address === "object" && address ? address.port : 0,
  );
  // Only for this test: a public-looking name that resolves to the local
  // test server, with loopback allowed so the transport can be exercised.
  const options = {
    resolve: dns({ "feed.team.org": ["127.0.0.1"] }),
    isAllowed: () => true,
    ports: [port],
  };
  try {
    const ok = await fetchCalendar(
      `http://feed.team.org:${port}/ok.ics`,
      options,
    );
    assert.equal(ok.text, ICS);
    await assert.rejects(
      fetchCalendar(`http://feed.team.org:${port}/big.ics`, options),
      /too large/,
    );
    await assert.rejects(
      fetchCalendar(`http://feed.team.org:${port}/slow.ics`, {
        ...options,
        timeoutMs: 300,
      }),
      /too long|Couldn't reach/,
    );
    // With the default check, a host resolving to loopback is refused.
    await assert.rejects(
      fetchCalendar(`http://feed.team.org:${port}/ok.ics`, {
        ...options,
        isAllowed: undefined,
      }),
      /not a public/,
    );
    // The URL check refuses the redirect to a loopback literal.
    await assert.rejects(
      fetchCalendar(`http://feed.team.org:${port}/hop`, options),
      /not a public/,
    );
  } finally {
    server.closeAllConnections?.();
    server.close();
  }
});
