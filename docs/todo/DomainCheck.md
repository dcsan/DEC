## Domain Check

Check whether candidate domains are available (free to register).

### TL;DR — use RDAP, fall back to whois

| Tool            | Verdict                            | Why                                                                                                                                                                      |
| --------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **RDAP** (HTTP) | ✅ **primary**                      | Authoritative, fast, scriptable, machine-readable. `200` = registered, `404` = available. No parsing of free-text.                                                       |
| **whois**       | ⚠️ **fallback**                     | Authoritative, but slow, rate-limited (servers time out), and output format varies per registry — must grep for "No match"/"not found". Use for TLDs RDAP doesn't cover. |
| **dig**         | ❌ **don't trust for availability** | Only tells you if DNS is *configured*, not if the domain is *registered*. Gives false "available" results.                                                               |

### Findings (tested 2026-06-07)

**`dig` is the wrong tool for availability.** A registered domain frequently has
no NS/A/SOA records (parked, freshly registered, or held by a registrar without
DNS). Real example: `forkwise.com` returns **no NS records** from `dig`, so a
dig-based check calls it "available" — but it was registered in **2016** via
Porkbun. `dig` answers "is DNS set up?", not "is this domain registered?".

**RDAP is the right tool.** RDAP (Registration Data Access Protocol) is the
modern, structured replacement for whois. Query the aggregator at `rdap.org`
which redirects to the authoritative registry RDAP server:

```sh
# 200 = registered (taken), 404 = available (free)
curl -sL -o /dev/null -w "%{http_code}" "https://rdap.org/domain/<name>.<tld>"
```

Verified: free domain → `404`, registered domain → `200`. Clean binary signal,
no text parsing, fast, no auth.

**⚠️ RDAP coverage caveat — ccTLDs.** `rdap.org` covers gTLDs but **not** many
ccTLDs. For an *uncovered* TLD it returns `404` for *every* domain (even
registered ones), which would falsely report everything as "free".

Coverage tested across the target TLD list:

| RDAP-covered (404 = truly free)                                            | NOT covered by RDAP (404 is meaningless) |
| -------------------------------------------------------------------------- | ---------------------------------------- |
| `.com .net .xyz .club .app .biz .dev .foo .fyi .run .today .vip .zone .ai` | `.sh .co .me .io`                        |

For the uncovered ccTLDs (`.sh .co .me .io`), use **whois** (and grep for
"No match"/"not found"), or a registrar API. Do **not** rely on RDAP `404` there.

**whois notes.** Authoritative but operationally annoying: connections time out
under load (hit a timeout on `.com`'s server during testing), output format is
per-registry so you must pattern-match (`No match`, `not found`, `NOT FOUND`,
`Status: free`), and many registries rate-limit. Fine as a fallback, poor as a
bulk primary.

### Recommended check logic

1. If TLD ∈ RDAP-covered set → `curl rdap.org` → `200`=taken, `404`=free.
2. Else (ccTLD) → `whois` and grep for a "no match" pattern.
3. Never use `dig` to decide availability (only useful to see if a *taken*
   domain has a live site).

### TLDs to check

    .com .net .xyz .sh .club .app .biz .co .dev .foo .fyi .me .run .today .vip .zone .cc .work .site
    (plus .ai for AI-app names)

Produce the output as a list and write it to a file (see `Naming-results.md`).



