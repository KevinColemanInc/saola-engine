const ALLOWED_WALLET_TYPES = new Set(["CASP", "SELF_HOSTED"]);
const APPROVED_KYC_STATUSES = new Set(["APPROVED", "VERIFIED"]);
const PROHIBITED_SERVICE_NATIONALITIES = new Set(["FR"]);
const EU_NATIONALITIES = new Set([
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE"
]);

const TOKEN_TRADE_BLACKLIST = {
  // AXS and U2U originate from Vietnam and are blacklisted for EU nationalities.
  AXS: {
    originCountry: "VN",
    blockedNationalities: "EU",
    legalBasis: {
      authority: "Demo EU Digital Assets Supervisory Ruling",
      citation: "EU-CRYPTO-TRADE-BL-2026-001, Annex I, Vietnamese-Origin Game and Utility Tokens",
      effectiveDate: "2026-01-01",
      summary:
        "This demo ruling prohibits CASPs and wallet transaction processors from permitting EU-nationality users to trade covered Vietnamese-origin crypto-assets listed in Annex I. The restriction is token-specific: EU nationalities are blocked only for the listed transaction token, while the asset origin country is separately recorded for audit review."
    }
  },
  U2U: {
    originCountry: "VN",
    blockedNationalities: "EU",
    legalBasis: {
      authority: "Demo EU Digital Assets Supervisory Ruling",
      citation: "EU-CRYPTO-TRADE-BL-2026-001, Annex I, Vietnamese-Origin Game and Utility Tokens",
      effectiveDate: "2026-01-01",
      summary:
        "This demo ruling prohibits CASPs and wallet transaction processors from permitting EU-nationality users to trade covered Vietnamese-origin crypto-assets listed in Annex I. The restriction is token-specific: EU nationalities are blocked only for the listed transaction token, while the asset origin country is separately recorded for audit review."
    }
  }
};

const LEGAL_BASIS = {
  validation: {
    authority: "Crypto Transactions Demo API Contract",
    citation: "Decision Engine Request Schema v0.1",
    effectiveDate: "2026-07-11",
    summary:
      "The decision engine cannot make a compliance decision unless the request contains the required user, counterparty, token, and transaction fields in the expected format. Schema rejections are operational controls, not external legal findings, and are returned before substantive compliance rules are applied."
  },
  kyc: {
    authority: "Regulation (EU) 2023/1114 on markets in crypto-assets (MiCA), mapped to demo KYC control",
    citation: "Regulation (EU) 2023/1114; CASP conduct, governance, and client protection controls mapped to KYC Approval Policy v0.1",
    effectiveDate: "2024-12-30",
    summary:
      "MiCA establishes a harmonized EU framework for crypto-asset services and CASP obligations. This demo engine maps that framework to an internal control requiring the user to have APPROVED or VERIFIED KYC before a transaction may proceed. The rejection is triggered by the engine's KYC approval rule, which supports regulated crypto-asset service controls."
  },
  serviceNationalityEligibility: {
    authority: "Crypto Transactions Demo Service Eligibility Policy",
    citation: "Service Eligibility Standard v0.1, Section 1.1",
    effectiveDate: "2026-07-11",
    summary:
      "This demo policy blocks users with French nationality from accessing any product or service. The restriction applies before product-specific eligibility is evaluated, so it covers crypto transfers, yield products, token trading, and token issuance."
  },
  yieldProductNationality: {
    authority: "Crypto Transactions Demo Yield Product Eligibility Policy",
    citation: "Yield Product Eligibility Standard v0.1, Section 2.1",
    effectiveDate: "2026-07-11",
    summary:
      "Yield product transactions require nationality information before the engine can evaluate jurisdiction-sensitive eligibility. This rejection does not mean the nationality is prohibited; it means the nationality attribute is missing and the engine cannot complete the required eligibility assessment."
  },
  sanctionsScreening: {
    authority: "EU restrictive measures and sanctions-screening control, demo implementation",
    citation: "Council Regulation (EC) No 2580/2001 and Council Regulation (EU) No 269/2014, mapped to Sanctions Screening Control v0.1",
    effectiveDate: "2026-07-11",
    summary:
      "The engine requires sanctions screening to pass before a crypto transaction can be permitted. In this demo the sanctions-screening provider is stubbed and always passes, but a failed provider result would reject the transaction because regulated financial and crypto-asset workflows must avoid processing transactions involving sanctioned parties, controlled assets, or prohibited counterparties."
  },
  transactionScreening: {
    authority: "Crypto Transactions Demo Transaction Monitoring Standard",
    citation: "Transaction Screening Control v0.1, suspicious-activity and prohibited-transfer review",
    effectiveDate: "2026-07-11",
    summary:
      "The engine requires transaction screening to pass before a crypto transaction can be permitted. In this demo the screening provider is stubbed and always passes, but a failed provider result would reject the transaction because the transfer requires review for prohibited typologies, suspicious behavior, and transaction-risk indicators."
  }
};

export function runSanctionsScreening(_payload) {
  return {
    passed: true,
    provider: "stub",
    checkedAt: new Date().toISOString()
  };
}

export function runTransactionScreening(_payload) {
  return {
    passed: true,
    provider: "stub",
    checkedAt: new Date().toISOString()
  };
}

export function checkTokenIssuanceNationality(payload) {
  return {
    passed: true,
    rule: "ANY_NATIONALITY_ALLOWED",
    applies: Boolean(payload?.transaction?.issuesNewTokens),
    nationality: payload?.user?.nationality ?? null
  };
}

export function checkTransactionTokenBlacklist(payload) {
  const token = normalizeCode(payload?.transaction?.token);
  const nationality = normalizeCode(payload?.user?.nationality);
  const blacklistEntry = TOKEN_TRADE_BLACKLIST[token];
  const blocked = Boolean(
    blacklistEntry &&
      blacklistEntry.blockedNationalities === "EU" &&
      EU_NATIONALITIES.has(nationality)
  );

  return {
    passed: !blocked,
    applies: Boolean(token && blacklistEntry),
    token: token || null,
    nationality: nationality || null,
    originCountry: blacklistEntry?.originCountry ?? null,
    blockedNationalities: blacklistEntry?.blockedNationalities ?? null,
    legalBasis: blacklistEntry?.legalBasis ?? null
  };
}

export function decideCryptoTransaction(payload) {
  const validationErrors = validatePayload(payload);
  const sanctionsScreening = runSanctionsScreening(payload);
  const transactionScreening = runTransactionScreening(payload);
  const tokenIssuanceNationality = checkTokenIssuanceNationality(payload);
  const transactionTokenBlacklist = checkTransactionTokenBlacklist(payload);

  const reasons = [...validationErrors];

  if (!validationErrors.length) {
    if (!APPROVED_KYC_STATUSES.has(payload.user.kycStatus)) {
      reasons.push(buildReason({
        code: "KYC_NOT_APPROVED",
        message: "User KYC status must be APPROVED or VERIFIED.",
        legalBasis: LEGAL_BASIS.kyc
      }));
    }

    if (PROHIBITED_SERVICE_NATIONALITIES.has(normalizeCode(payload.user.nationality))) {
      reasons.push(buildReason({
        code: "NATIONALITY_NOT_ELIGIBLE",
        message: "French nationality users are not eligible to use any product or service.",
        legalBasis: LEGAL_BASIS.serviceNationalityEligibility
      }));
    }

    if (payload.transaction.isYieldProduct && !payload.user.nationality) {
      reasons.push(buildReason({
        code: "YIELD_PRODUCT_NATIONALITY_REQUIRED",
        message: "Nationality is required for yield product transaction decisions.",
        legalBasis: LEGAL_BASIS.yieldProductNationality
      }));
    }

    if (!transactionTokenBlacklist.passed) {
      reasons.push(buildReason({
        code: "TOKEN_BLACKLISTED_FOR_NATIONALITY",
        message: `${transactionTokenBlacklist.token} cannot be traded by users with ${transactionTokenBlacklist.nationality} nationality.`,
        legalBasis: transactionTokenBlacklist.legalBasis
      }));
    }

    if (!sanctionsScreening.passed) {
      reasons.push(buildReason({
        code: "SANCTIONS_SCREENING_FAILED",
        message: "Sanctions screening did not pass.",
        legalBasis: LEGAL_BASIS.sanctionsScreening
      }));
    }

    if (!transactionScreening.passed) {
      reasons.push(buildReason({
        code: "TRANSACTION_SCREENING_FAILED",
        message: "Transaction screening did not pass.",
        legalBasis: LEGAL_BASIS.transactionScreening
      }));
    }
  }

  return {
    permitted: reasons.length === 0,
    decision: reasons.length === 0 ? "PERMIT" : "DENY",
    reasons,
    checks: {
      tokenIssuanceNationality,
      transactionTokenBlacklist
    },
    screening: {
      sanctions: sanctionsScreening,
      transaction: transactionScreening
    }
  };
}

export function validatePayload(payload) {
  const errors = [];

  if (!isObject(payload)) {
    return [
      buildReason({
        code: "INVALID_PAYLOAD",
        message: "Request body must be a JSON object.",
        legalBasis: LEGAL_BASIS.validation
      })
    ];
  }

  if (!isObject(payload.user)) {
    errors.push(buildReason({
      code: "USER_REQUIRED",
      message: "user must be provided.",
      legalBasis: LEGAL_BASIS.validation
    }));
  } else {
    requireString(payload.user.id, "USER_ID_REQUIRED", "user.id", errors);
    requireString(payload.user.location, "USER_LOCATION_REQUIRED", "user.location", errors);
    requireString(payload.user.kycStatus, "USER_KYC_STATUS_REQUIRED", "user.kycStatus", errors);

    if (payload.user.nationality !== undefined && typeof payload.user.nationality !== "string") {
      errors.push(buildReason({
        code: "USER_NATIONALITY_INVALID",
        message: "user.nationality must be a string when provided.",
        legalBasis: LEGAL_BASIS.validation
      }));
    }
  }

  if (!isObject(payload.transaction)) {
    errors.push(buildReason({
      code: "TRANSACTION_REQUIRED",
      message: "transaction must be provided.",
      legalBasis: LEGAL_BASIS.validation
    }));
  } else {
    if (typeof payload.transaction.isYieldProduct !== "boolean") {
      errors.push(buildReason({
        code: "YIELD_PRODUCT_FLAG_REQUIRED",
        message: "transaction.isYieldProduct must be a boolean.",
        legalBasis: LEGAL_BASIS.validation
      }));
    }

    if (
      payload.transaction.issuesNewTokens !== undefined &&
      typeof payload.transaction.issuesNewTokens !== "boolean"
    ) {
      errors.push(buildReason({
        code: "ISSUES_NEW_TOKENS_FLAG_INVALID",
        message: "transaction.issuesNewTokens must be a boolean when provided.",
        legalBasis: LEGAL_BASIS.validation
      }));
    }

    if (payload.transaction.token !== undefined && typeof payload.transaction.token !== "string") {
      errors.push(buildReason({
        code: "TRANSACTION_TOKEN_INVALID",
        message: "transaction.token must be a string when provided.",
        legalBasis: LEGAL_BASIS.validation
      }));
    }

    if (!Number.isFinite(payload.transaction.amount) || payload.transaction.amount <= 0) {
      errors.push(buildReason({
        code: "AMOUNT_INVALID",
        message: "transaction.amount must be a positive number.",
        legalBasis: LEGAL_BASIS.validation
      }));
    }

    validateCounterparty(payload.transaction.from, "from", errors);
    validateCounterparty(payload.transaction.to, "to", errors);
  }

  return errors;
}

function validateCounterparty(counterparty, fieldName, errors) {
  if (!isObject(counterparty)) {
    errors.push(buildReason({
      code: `${fieldName.toUpperCase()}_REQUIRED`,
      message: `transaction.${fieldName} must be provided.`,
      legalBasis: LEGAL_BASIS.validation
    }));
    return;
  }

  requireString(counterparty.address, `${fieldName.toUpperCase()}_ADDRESS_REQUIRED`, `transaction.${fieldName}.address`, errors);

  if (!ALLOWED_WALLET_TYPES.has(counterparty.walletType)) {
    errors.push(buildReason({
      code: `${fieldName.toUpperCase()}_WALLET_TYPE_INVALID`,
      message: `transaction.${fieldName}.walletType must be CASP or SELF_HOSTED.`,
      legalBasis: LEGAL_BASIS.validation
    }));
  }

  if (counterparty.walletType === "CASP") {
    requireString(counterparty.caspName, `${fieldName.toUpperCase()}_CASP_NAME_REQUIRED`, `transaction.${fieldName}.caspName`, errors);
  }
}

function requireString(value, code, fieldName, errors) {
  if (typeof value !== "string" || !value.trim()) {
    errors.push(buildReason({
      code,
      message: `${fieldName} must be a non-empty string.`,
      legalBasis: LEGAL_BASIS.validation
    }));
  }
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeCode(value) {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function buildReason({ code, message, legalBasis }) {
  return {
    code,
    message,
    legalBasis
  };
}
