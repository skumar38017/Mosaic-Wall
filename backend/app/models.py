from pydantic import BaseModel
from typing import Optional

class PhotoMessage(BaseModel):
    image_data: str
    timestamp: str
    uuid7: str

class S3UploadMetadata(BaseModel):
    bucket: str
    key: str
    url: str
    folder: str  # dayshift, nightshift, or empty for root
    timestamp: str
    filename: Optional[str] = None
