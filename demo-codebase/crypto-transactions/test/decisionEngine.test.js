import test from "node:test";
import assert from "node:assert/strict";
import { decideCryptoTransaction } from "../src/decisionEngine.js";

test("permits a verified user transaction between a CASP and self-hosted wallet", () => {
  const result = decideCryptoTransaction({
    user: {
      id: "user-123",
      location: "DE",
      nationality: "DE",
      kycStatus: "VERIFIED"
    },
    transaction: {
      isYieldProduct: false,
      amount: 250.75,
      from: {
        walletType: "CASP",
        address: "0xfrom",
        caspName: "Example CASP"
      },
      to: {
        walletType: "SELF_HOSTED",
        address: "0xto"
      }
    }
  });

  assert.equal(result.permitted, true);
  assert.equal(result.decision, "PERMIT");
  assert.equal(result.screening.sanctions.passed, true);
  assert.equal(result.screening.transaction.passed, true);
});

test("denies when KYC is not approved", () => {
  const result = decideCryptoTransaction({
    user: {
      id: "user-123",
      location: "DE",
      nationality: "DE",
      kycStatus: "PENDING"
    },
    transaction: {
      isYieldProduct: false,
      amount: 250.75,
      from: {
        walletType: "SELF_HOSTED",
        address: "0xfrom"
      },
      to: {
        walletType: "SELF_HOSTED",
        address: "0xto"
      }
    }
  });

  assert.equal(result.permitted, false);
  assert.equal(result.decision, "DENY");
  assert.equal(result.reasons[0].code, "KYC_NOT_APPROVED");
});

test("validates whether counterparties are CASPs or self-hosted wallets", () => {
  const result = decideCryptoTransaction({
    user: {
      id: "user-123",
      location: "DE",
      nationality: "FR",
      kycStatus: "APPROVED"
    },
    transaction: {
      isYieldProduct: true,
      amount: 100,
      from: {
        walletType: "BANK_ACCOUNT",
        address: "from"
      },
      to: {
        walletType: "CASP",
        address: "to"
      }
    }
  });

  assert.equal(result.permitted, false);
  assert.deepEqual(
    result.reasons.map((reason) => reason.code),
    ["FROM_WALLET_TYPE_INVALID", "TO_CASP_NAME_REQUIRED"]
  );
});

test("allows any nationality to issue new tokens", () => {
  const result = decideCryptoTransaction({
    user: {
      id: "user-123",
      location: "DE",
      nationality: "AQ",
      kycStatus: "APPROVED"
    },
    transaction: {
      isYieldProduct: false,
      issuesNewTokens: true,
      amount: 100,
      from: {
        walletType: "SELF_HOSTED",
        address: "0xissuer"
      },
      to: {
        walletType: "CASP",
        address: "0xrecipient",
        caspName: "Example CASP"
      }
    }
  });

  assert.equal(result.permitted, true);
  assert.equal(result.checks.tokenIssuanceNationality.passed, true);
  assert.equal(result.checks.tokenIssuanceNationality.rule, "ANY_NATIONALITY_ALLOWED");
  assert.equal(result.checks.tokenIssuanceNationality.applies, true);
  assert.equal(result.checks.tokenIssuanceNationality.nationality, "AQ");
});

test("denies French nationality users from crypto transfer services", () => {
  const result = decideCryptoTransaction({
    user: {
      id: "user-123",
      location: "FR",
      nationality: "FR",
      kycStatus: "APPROVED"
    },
    transaction: {
      isYieldProduct: false,
      amount: 100,
      from: {
        walletType: "SELF_HOSTED",
        address: "0xfrom"
      },
      to: {
        walletType: "SELF_HOSTED",
        address: "0xto"
      }
    }
  });

  assert.equal(result.permitted, false);
  assert.equal(result.decision, "DENY");
  assert.equal(result.reasons[0].code, "NATIONALITY_NOT_ELIGIBLE");
  assert.match(result.reasons[0].message, /French nationality/);
  assert.match(result.reasons[0].legalBasis.summary, /any product or service/);
});

test("denies French nationality users from yield products", () => {
  const result = decideCryptoTransaction({
    user: {
      id: "user-123",
      location: "FR",
      nationality: "FR",
      kycStatus: "APPROVED"
    },
    transaction: {
      isYieldProduct: true,
      amount: 100,
      from: {
        walletType: "SELF_HOSTED",
        address: "0xfrom"
      },
      to: {
        walletType: "SELF_HOSTED",
        address: "0xto"
      }
    }
  });

  assert.equal(result.permitted, false);
  assert.equal(result.decision, "DENY");
  assert.equal(result.reasons[0].code, "NATIONALITY_NOT_ELIGIBLE");
});

test("denies EU nationalities from trading blacklisted Vietnamese tokens", () => {
  const result = decideCryptoTransaction({
    user: {
      id: "user-123",
      location: "DE",
      nationality: "DE",
      kycStatus: "APPROVED"
    },
    transaction: {
      isYieldProduct: false,
      token: "AXS",
      amount: 100,
      from: {
        walletType: "SELF_HOSTED",
        address: "0xfrom"
      },
      to: {
        walletType: "SELF_HOSTED",
        address: "0xto"
      }
    }
  });

  assert.equal(result.permitted, false);
  assert.equal(result.decision, "DENY");
  assert.equal(result.reasons[0].code, "TOKEN_BLACKLISTED_FOR_NATIONALITY");
  assert.equal(result.reasons[0].legalBasis.authority, "Demo EU Digital Assets Supervisory Ruling");
  assert.match(result.reasons[0].legalBasis.citation, /EU-CRYPTO-TRADE-BL-2026-001/);
  assert.match(result.reasons[0].legalBasis.summary, /Vietnamese-origin crypto-assets/);
  assert.equal(result.checks.transactionTokenBlacklist.passed, false);
  assert.equal(result.checks.transactionTokenBlacklist.token, "AXS");
  assert.equal(result.checks.transactionTokenBlacklist.originCountry, "VN");
  assert.equal(result.checks.transactionTokenBlacklist.blockedNationalities, "EU");
  assert.equal(result.checks.transactionTokenBlacklist.legalBasis.authority, "Demo EU Digital Assets Supervisory Ruling");
});

test("permits non-EU nationalities from trading EU-blacklisted Vietnamese tokens", () => {
  const result = decideCryptoTransaction({
    user: {
      id: "user-123",
      location: "VN",
      nationality: "VN",
      kycStatus: "APPROVED"
    },
    transaction: {
      isYieldProduct: false,
      token: "U2U",
      amount: 100,
      from: {
        walletType: "SELF_HOSTED",
        address: "0xfrom"
      },
      to: {
        walletType: "SELF_HOSTED",
        address: "0xto"
      }
    }
  });

  assert.equal(result.permitted, true);
  assert.equal(result.checks.transactionTokenBlacklist.passed, true);
  assert.equal(result.checks.transactionTokenBlacklist.applies, true);
  assert.equal(result.checks.transactionTokenBlacklist.token, "U2U");
  assert.equal(result.checks.transactionTokenBlacklist.originCountry, "VN");
});

test("denies Vietnamese nationals trading Vietnam-origin tokens from 2027", () => {
  const result = decideCryptoTransaction({
    user: {
      id: "user-vn",
      location: "US",
      nationality: "VN",
      kycStatus: "APPROVED"
    },
    transaction: {
      isYieldProduct: false,
      token: "AXS",
      amount: 100,
      from: { walletType: "SELF_HOSTED", address: "0xfrom" },
      to: { walletType: "SELF_HOSTED", address: "0xto" }
    }
  }, { asOf: "2027-01-01T00:00:00.000Z" });

  assert.equal(result.permitted, false);
  assert.equal(result.reasons[0].code, "VIETNAM_LOCAL_TOKEN_NATIONALITY_RESTRICTED");
  assert.equal(result.reasons[0].legalBasis.authority, "State Bank of Vietnam");
  assert.equal(result.reasons[0].legalBasis.effectiveDate, "2027-01-01");
});

test("permits foreign nationals residing in Vietnam to trade Vietnam-origin tokens", () => {
  const result = decideCryptoTransaction({
    user: {
      id: "user-us",
      location: "VN",
      nationality: "US",
      kycStatus: "APPROVED"
    },
    transaction: {
      isYieldProduct: false,
      token: "AXS",
      amount: 100,
      from: { walletType: "SELF_HOSTED", address: "0xfrom" },
      to: { walletType: "SELF_HOSTED", address: "0xto" }
    }
  }, { asOf: "2027-01-01T00:00:00.000Z" });

  assert.equal(result.permitted, true);
  assert.equal(result.checks.vietnamLocalTokenRestriction.applies, true);
});

test("does not apply the Vietnam local-token restriction before 2027", () => {
  const result = decideCryptoTransaction({
    user: {
      id: "user-vn",
      location: "VN",
      nationality: "VN",
      kycStatus: "APPROVED"
    },
    transaction: {
      isYieldProduct: false,
      token: "U2U",
      amount: 100,
      from: { walletType: "SELF_HOSTED", address: "0xfrom" },
      to: { walletType: "SELF_HOSTED", address: "0xto" }
    }
  }, { asOf: "2026-12-31T23:59:59.999Z" });

  assert.equal(result.permitted, true);
  assert.equal(result.checks.vietnamLocalTokenRestriction.effective, false);
});
