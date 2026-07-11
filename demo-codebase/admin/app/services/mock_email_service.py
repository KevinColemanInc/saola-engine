from app.models.regulation import Regulation


class EmailService:
    async def send_regulation_alert(
        self,
        topic: str,
        recipient: str,
        regulations: list[Regulation],
    ) -> None:
        return None


email_service = EmailService()
