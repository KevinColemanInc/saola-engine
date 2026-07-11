from datetime import datetime, timedelta, timezone

from app.models.regulation import Regulation
from app.models.run import CrawlRun, RunStatus

DOMAINS = [
    "sbv.gov.vn",
    "chinhphu.vn",
    "mof.gov.vn",
    "thuvienphapluat.vn",
]

TOPIC_ROUTING = [
    {
        "topic": "Vietnamese Crypto Regulation",
        "email": "vietnam-legal@companyname.com",
    },
    {
        "topic": "EU Crypto Regulation",
        "email": "eu-legal@companyname.com",
    },
    {
        "topic": "Payments Compliance",
        "email": "payments-legal@companyname.com",
    },
]

REPOSITORIES = [
    "company/payments-api",
    "company/crypto-wallet",
    "company/compliance-service",
    "company/customer-platform",
]

REGULATIONS = [
    Regulation(
        id="reg_vn_reporting_001",
        title="Vietnam Introduces New Reporting Requirements for Crypto Service Providers",
        description=(
            "Vietnamese crypto businesses may be required to collect additional "
            "transaction information and submit periodic reports to regulators."
        ),
        jurisdiction="Vietnam",
        topic="Vietnamese Crypto Regulation",
        source_name="State Bank of Vietnam",
        source_url="https://www.sbv.gov.vn/",
        published_at=datetime(2026, 7, 8, 9, 30, tzinfo=timezone.utc),
    ),
    Regulation(
        id="reg_eu_token_controls_002",
        title="EU Supervisors Expand Controls for High-Risk Utility Tokens",
        description=(
            "Crypto asset service providers should add enhanced screening for "
            "tokens tied to high-risk issuance patterns and cross-border flows."
        ),
        jurisdiction="European Union",
        topic="EU Crypto Regulation",
        source_name="European Banking Authority",
        source_url="https://www.eba.europa.eu/",
        published_at=datetime(2026, 7, 7, 14, 0, tzinfo=timezone.utc),
    ),
    Regulation(
        id="reg_payments_settlement_003",
        title="Finance Ministry Updates Settlement Reporting for Digital Payments",
        description=(
            "Payment platforms may need to preserve settlement metadata and "
            "surface additional compliance evidence during transaction review."
        ),
        jurisdiction="Vietnam",
        topic="Payments Compliance",
        source_name="Ministry of Finance",
        source_url="https://www.mof.gov.vn/",
        published_at=datetime(2026, 7, 6, 11, 15, tzinfo=timezone.utc),
    ),
]

now = datetime.now(timezone.utc).replace(microsecond=0)

RUNS: list[CrawlRun] = [
    CrawlRun(
        id="run_003",
        status=RunStatus.completed,
        started_at=now - timedelta(hours=4),
        completed_at=now - timedelta(hours=3, minutes=59),
        article_count=100,
        regulations=REGULATIONS,
    ),
    CrawlRun(
        id="run_002",
        status=RunStatus.completed,
        started_at=now - timedelta(days=1),
        completed_at=now - timedelta(days=1, minutes=-1),
        article_count=67,
        regulations=REGULATIONS[:1],
    ),
    CrawlRun(
        id="run_001",
        status=RunStatus.completed,
        started_at=now - timedelta(days=2),
        completed_at=now - timedelta(days=2, minutes=-1),
        article_count=42,
        regulations=[],
    ),
]


def next_run_id() -> str:
    return f"run_{len(RUNS) + 1:03d}"
