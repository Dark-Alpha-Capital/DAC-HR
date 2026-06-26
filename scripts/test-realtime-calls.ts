/**
 * Repro script: mint client_secret then POST SDP to /v1/realtime/calls.
 * Usage: bun scripts/test-realtime-calls.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REALTIME_MODEL = "gpt-realtime-2";

function loadApiKey(): string {
  const devVarsPath = resolve(import.meta.dir, "../apps/frontend/.dev.vars");
  const text = readFileSync(devVarsPath, "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^OPENAI_API_KEY=(?:"([^"]*)"|'([^']*)'|(\S+))/);
    if (m) {
      return (m[1] ?? m[2] ?? m[3] ?? "").trim();
    }
  }
  throw new Error("OPENAI_API_KEY not found in .dev.vars");
}

/** Minimal WebRTC offer SDP (audio-only) for handshake testing */
const MINIMAL_OFFER_SDP = [
  "v=0",
  "o=- 4611731400430051336 2 IN IP4 127.0.0.1",
  "s=-",
  "t=0 0",
  "a=group:BUNDLE 0",
  "a=extmap-allow-mixed",
  "a=msid-semantic: WMS",
  "m=audio 9 UDP/TLS/RTP/SAVPF 111 63 9 0 8 13 110 126",
  "c=IN IP4 0.0.0.0",
  "a=rtcp:9 IN IP4 0.0.0.0",
  "a=ice-ufrag:4ZcD",
  "a=ice-pwd:2/1muCWoOi3J5Wfu+86g1/Ly",
  "a=ice-options:trickle",
  "a=fingerprint:sha-256 00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF",
  "a=setup:actpass",
  "a=mid:0",
  "a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level",
  "a=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time",
  "a=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01",
  "a=extmap:4 urn:ietf:params:rtp-hdrext:sdes:mid",
  "a=sendrecv",
  "a=msid:- local-audio",
  "a=rtcp-mux",
  "a=rtpmap:111 opus/48000/2",
  "a=rtcp-fb:111 transport-cc",
  "a=fmtp:111 minptime=10;useinbandfec=1",
  "a=rtpmap:63 red/48000/2",
  "a=fmtp:63 111/111",
  "a=rtpmap:9 G722/8000",
  "a=rtpmap:0 PCMU/8000",
  "a=rtpmap:8 PCMA/8000",
  "a=rtpmap:13 CN/8000",
  "a=rtpmap:110 telephone-event/48000",
  "a=rtpmap:126 telephone-event/8000",
  "a=ssrc:1234567890 cname:test",
  "a=ssrc:1234567890 msid:- local-audio",
].join("\r\n");

async function mintClientSecret(apiKey: string) {
  const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session: {
        type: "realtime",
        model: REALTIME_MODEL,
        audio: { output: { voice: "alloy" } },
      },
    }),
  });
  const bodyText = await response.text();
  let parsed: { value?: string; client_secret?: { value: string } } = {};
  try {
    parsed = JSON.parse(bodyText) as typeof parsed;
  } catch {
    // plain text
  }
  const secret = parsed.value ?? parsed.client_secret?.value;
  return {
    status: response.status,
    ok: response.ok,
    secretPrefix: secret?.slice(0, 8),
    secretLast4: secret?.slice(-4),
    bodyPreview: bodyText.slice(0, 300),
    secret,
  };
}

async function postRealtimeCalls(auth: string, label: string) {
  const response = await fetch("https://api.openai.com/v1/realtime/calls", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${auth}`,
      "Content-Type": "application/sdp",
    },
    body: MINIMAL_OFFER_SDP,
  });
  const bodyText = await response.text();
  let errorCode: string | undefined;
  try {
    const parsed = JSON.parse(bodyText) as { error?: { code?: string; type?: string } };
    errorCode = parsed.error?.code;
  } catch {
    // SDP answer or plain text
  }
  return {
    label,
    status: response.status,
    ok: response.ok,
    errorCode,
    location: response.headers.get("Location"),
    bodyPreview: bodyText.slice(0, 300),
    isSdpAnswer: bodyText.startsWith("v=0"),
  };
}

const apiKey = loadApiKey();
console.log("API key last4:", apiKey.slice(-4));

const mint = await mintClientSecret(apiKey);
console.log("\n=== client_secrets ===");
console.log(JSON.stringify(mint, null, 2));

if (!mint.secret) {
  console.error("No ephemeral secret — cannot test calls");
  process.exit(1);
}

const ephemeralCall = await postRealtimeCalls(mint.secret, "ephemeral");
console.log("\n=== realtime/calls (ephemeral) ===");
console.log(JSON.stringify(ephemeralCall, null, 2));

const serverKeyCall = await postRealtimeCalls(apiKey, "server-key");
console.log("\n=== realtime/calls (server API key — expect fail/wrong) ===");
console.log(JSON.stringify(serverKeyCall, null, 2));
