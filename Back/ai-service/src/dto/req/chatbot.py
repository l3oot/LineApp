from pydantic import BaseModel, EmailStr

class ChatbotReq(BaseModel):
    message: str  