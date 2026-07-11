from fastapi import HTTPException

from app.models.regulation import Regulation
from app.repositories import mock_store


class RegulationService:
    async def list_regulations(self) -> list[Regulation]:
        return mock_store.REGULATIONS

    async def get_regulation(self, regulation_id: str) -> Regulation:
        for regulation in mock_store.REGULATIONS:
            if regulation.id == regulation_id:
                return regulation
        raise HTTPException(status_code=404, detail="Regulation not found")


regulation_service = RegulationService()
