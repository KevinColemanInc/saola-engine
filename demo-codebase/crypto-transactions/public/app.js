const state = {
  nationality: "US",
  location: "Ho Chi Minh City",
  product: null,
  latestResult: null
};

const nationalitySelect = document.querySelector("#nationality-select");
const decisionForm = document.querySelector("#decision-form");
const productButtons = document.querySelectorAll("[data-product]");
const cryptoStep = document.querySelector("#crypto-step");
const yieldStep = document.querySelector("#yield-step");
const cryptoInputs = cryptoStep.querySelectorAll("input");
const yieldInputs = yieldStep.querySelectorAll("input");
const yieldOptions = yieldStep.querySelector(".yield-options");
const submitButton = document.querySelector("#submit-button");
const explainButton = document.querySelector("#explain-button");
const explanationPanel = document.querySelector("#explanation-panel");
const explanationCopy = document.querySelector("#explanation-copy");
const yieldInvestmentAmount = document.querySelector("#yield-investment-amount");
const yieldSummaryTerm = document.querySelector("#yield-summary-term");
const yieldSummaryRate = document.querySelector("#yield-summary-rate");
const yieldSummaryAmount = document.querySelector("#yield-summary-amount");
const resultPanel = document.querySelector("#result-panel");
const resultProduct = document.querySelector("#result-product");
const decisionWord = document.querySelector("#decision-word");
const proofChips = document.querySelector("#proof-chips");
const detailsList = document.querySelector("#details-list");
const payloadOutput = document.querySelector("#payload-output");

nationalitySelect.addEventListener("change", () => {
  state.nationality = nationalitySelect.value;
});

productButtons.forEach((button) => {
  button.addEventListener("click", () => selectProduct(button.dataset.product));
});

yieldStep.querySelectorAll("input[name='yieldProduct']").forEach((input) => {
  input.addEventListener("change", updateYieldSummary);
});

yieldInvestmentAmount.addEventListener("input", updateYieldSummary);

decisionForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!state.product || !decisionForm.reportValidity()) {
    return;
  }

  submitDecision();
});

explainButton.addEventListener("click", () => {
  if (!state.latestResult) {
    return;
  }

  renderExplanation(state.latestResult);
  explanationPanel.classList.remove("hidden");
});

function selectProduct(product) {
  state.product = product;
  state.latestResult = null;

  productButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.product === product);
  });

  cryptoStep.classList.toggle("hidden", product !== "crypto");
  yieldStep.classList.toggle("hidden", product !== "yield");
  cryptoInputs.forEach((input) => {
    input.disabled = product !== "crypto";
  });
  yieldInputs.forEach((input) => {
    input.disabled = product !== "yield";
  });
  yieldOptions.disabled = product !== "yield";
  submitButton.disabled = false;
  explainButton.classList.add("hidden");
  explanationPanel.classList.add("hidden");
  detailsList.replaceChildren();
  updateYieldSummary();

  setResultState("idle", productLabel(product), "Ready", ["KYC", "Screening", "Rules"]);
}

async function submitDecision() {
  const payload = buildPayload();
  const label = productLabel(state.product);

  state.latestResult = null;
  explainButton.classList.add("hidden");
  explanationPanel.classList.add("hidden");
  setResultState("idle", label, "Checking", ["KYC", "Screening", "Rules"]);
  payloadOutput.textContent = JSON.stringify(payload, null, 2);

  try {
    const response = await fetch("/decisions/crypto-transaction", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    renderResult(label, result);
  } catch (error) {
    setResultState("blocked", label, "Error", ["API"]);
    detailsList.replaceChildren(createDetailCard("Error", error.message));
  }
}

function buildPayload() {
  const isYieldProduct = state.product === "yield";
  const payload = {
    user: {
      id: "demo-user",
      location: state.location,
      nationality: state.nationality,
      kycStatus: "APPROVED"
    },
    transaction: {
      isYieldProduct,
      amount: isYieldProduct ? numberValue("#yield-investment-amount") : numberValue("#transfer-amount"),
      from: {
        walletType: "SELF_HOSTED",
        address: "0xuser-wallet"
      },
      to: {
        walletType: "SELF_HOSTED",
        address: isYieldProduct ? "0xyield-smart-contract" : stringValue("#to-wallet-address")
      }
    }
  };

  if (isYieldProduct) {
    const selectedYield = document.querySelector("input[name='yieldProduct']:checked");
    payload.transaction.yieldProduct = {
      term: selectedYield.dataset.term,
      ratePercent: Number(selectedYield.dataset.rate)
    };
  } else {
    payload.transaction.token = "AXS";
    payload.transaction.coinAmount = numberValue("#coin-amount");
  }

  return payload;
}

function renderResult(productLabel, result) {
  const stateName = result.permitted ? "approved" : "blocked";
  const decision = result.permitted ? "Approved" : "Blocked";

  state.latestResult = result;
  setResultState(stateName, productLabel, decision, proofLabels(result));
  payloadOutput.textContent = JSON.stringify(result, null, 2);
  detailsList.replaceChildren(...detailCards(result));

  if (!result.permitted) {
    explainButton.classList.remove("hidden");
  }
}

function setResultState(stateName, productLabel, decision, chips) {
  resultPanel.className = `decision-stage ${stateName}`;
  resultProduct.textContent = productLabel;
  decisionWord.textContent = decision;
  proofChips.replaceChildren(...chips.map((chip) => {
    const element = document.createElement("span");
    element.textContent = chip;
    return element;
  }));
}

function proofLabels(result) {
  if (!result.permitted) {
    return ["Blocked", "Law", "Review"];
  }

  return ["KYC", "Screening", "Rules"];
}

function detailCards(result) {
  const cards = [
    createDetailCard("Decision", result.decision),
    createDetailCard("Sanctions", result.screening.sanctions.passed ? "Passed" : "Failed"),
    createDetailCard("Screening", result.screening.transaction.passed ? "Passed" : "Failed")
  ];

  if (result.checks.transactionTokenBlacklist.applies) {
    cards.push(
      createDetailCard(
        "Token",
        `${result.checks.transactionTokenBlacklist.token}: ${result.checks.transactionTokenBlacklist.passed ? "Clear" : "Blocked"}`
      )
    );
  }

  if (result.reasons.length) {
    cards.push(...result.reasons.map((reason) => createDetailCard(reason.code, legalBasisText(reason))));
  }

  return cards;
}

function createDetailCard(title, body) {
  const card = document.createElement("article");
  card.className = "detail-card";

  const heading = document.createElement("strong");
  heading.textContent = title;

  const text = document.createElement("p");
  text.textContent = body;

  card.append(heading, text);
  return card;
}

function legalBasisText(reason) {
  if (!reason.legalBasis) {
    return reason.message;
  }

  return `${reason.message} ${reason.legalBasis.citation}`;
}

function renderExplanation(result) {
  const paragraphs = result.reasons.length
    ? result.reasons.map((reason) => {
        const text = document.createElement("p");
        text.textContent = humanFriendlyReason(reason);
        return text;
      })
    : [document.createElement("p")];

  if (!result.reasons.length) {
    paragraphs[0].textContent = "The request was approved by the decision engine.";
  }

  explanationCopy.replaceChildren(...paragraphs);
}

function humanFriendlyReason(reason) {
  if (!reason.legalBasis) {
    return reason.message;
  }

  return `${reason.message} This is based on ${reason.legalBasis.citation}. ${reason.legalBasis.summary}`;
}

function productLabel(product) {
  return product === "yield" ? "Yield Product" : "Crypto Transfer";
}

function numberValue(selector) {
  return Number(document.querySelector(selector).value);
}

function stringValue(selector) {
  return document.querySelector(selector).value.trim();
}

function updateYieldSummary() {
  const selectedYield = document.querySelector("input[name='yieldProduct']:checked");
  const amount = Number(yieldInvestmentAmount.value || 0);

  yieldSummaryTerm.textContent = selectedYield.dataset.term;
  yieldSummaryRate.textContent = `${selectedYield.dataset.rate}% APY`;
  yieldSummaryAmount.textContent = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(amount);
}

updateYieldSummary();
