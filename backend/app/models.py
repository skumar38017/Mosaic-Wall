from pydantic import BaseModel

class PhotoMessage(BaseModel):
    image_data: str
    timestamp: str
