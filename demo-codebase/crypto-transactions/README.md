# Crypto Transactions Demo Codebase

Demo application used by the compliance review skill to detect and remediate crypto transaction compliance issues.

## Decision Engine API

Run the API:

```bash
npm start
```

The service exposes:

- `GET /health`
- `GET /`
- `POST /decisions/crypto-transaction`

Open `http://localhost:3000/` in a browser for the demo frontend. The demo fixes the user location to Ho Chi Minh City, lets the user select American or Vietnamese nationality, and submits either a smart-contract yield platform deposit or an AXS purchase to the decision API.

Example request:

```bash
curl -X POST http://localhost:3000/decisions/crypto-transaction \
  -H 'content-type: application/json' \
  -d '{
    "user": {
      "id": "user-123",
      "location": "DE",
      "nationality": "FR",
      "kycStatus": "VERIFIED"
    },
    "transaction": {
      "isYieldProduct": false,
      "issuesNewTokens": true,
      "token": "AXS",
      "amount": 250.75,
      "from": {
        "walletType": "CASP",
        "address": "0xfrom",
        "caspName": "Example CASP"
      },
      "to": {
        "walletType": "SELF_HOSTED",
        "address": "0xto"
      }
    }
  }'
```

`transaction.from.walletType` and `transaction.to.walletType` must be either `CASP` or `SELF_HOSTED`.
CASP counterparties must include `caspName`.
Set `transaction.issuesNewTokens` to `true` when the transaction issues new tokens. The decision engine includes a `checks.tokenIssuanceNationality` result that passes for any nationality.
Set `transaction.token` to the traded token symbol when the transaction trades a token. AXS and U2U are noted as Vietnam-origin tokens and are blacklisted for EU nationalities.

The response includes the final decision, denial reasons when applicable, and the sanctions and transaction screening results. Every denial reason includes a verbose `legalBasis` object with the cited authority, citation, effective date, and a plain-English explanation of why that rule triggered the rejection.

The AXS and U2U blacklist is modeled as a demo supervisory ruling: `EU-CRYPTO-TRADE-BL-2026-001, Annex I, Vietnamese-Origin Game and Utility Tokens`. It is intentionally represented as demo law/ruling text rather than a verified external EU token blacklist.

Those screening checks are currently stubbed and always pass.

## Tests

```bash
npm test
```
