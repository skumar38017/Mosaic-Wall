from fastapi import APIRouter, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from .models import S3UploadMetadata
from datetime import datetime
import os

router = APIRouter()

# MongoDB connection
DATABASE_URL = os.getenv("DATABASE_URL")
client = AsyncIOMotorClient(DATABASE_URL) if DATABASE_URL else None
db = client.mosaic_db if client else None

@router.post("/store-s3-metadata")
async def store_s3_metadata(metadata: S3UploadMetadata):
    """Store S3 upload metadata in MongoDB"""
    try:
        if client is None:
            raise HTTPException(status_code=500, detail="Database not configured")
        
        # Determine collection based on folder
        if metadata.folder == "dayshift":
            collection = db.dayshift_uploads
        elif metadata.folder == "nightshift":
            collection = db.nightshift_uploads
        else:
            collection = db.general_uploads
        
        # Store metadata
        document = {
            "bucket": metadata.bucket,
            "key": metadata.key,
            "url": metadata.url,
            "folder": metadata.folder,
            "filename": metadata.filename,
            "timestamp": metadata.timestamp,
            "created_at": datetime.utcnow()
        }
        
        result = await collection.insert_one(document)
        print(f"✅ Stored S3 metadata: {metadata.key} in {collection.name}")
        
        return {
            "status": "success",
            "id": str(result.inserted_id),
            "collection": collection.name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Store S3 metadata failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to store metadata: {str(e)}")

@router.get("/s3-metadata/{folder}")
async def get_s3_metadata(folder: str, limit: int = 100):
    """Get S3 upload metadata from MongoDB"""
    try:
        if client is None:
            raise HTTPException(status_code=500, detail="Database not configured")
        
        # Determine collection based on folder
        if folder == "dayshift":
            collection = db.dayshift_uploads
        elif folder == "nightshift":
            collection = db.nightshift_uploads
        else:
            collection = db.general_uploads
        
        # Fetch metadata
        cursor = collection.find().sort("created_at", -1).limit(limit)
        documents = await cursor.to_list(length=limit)
        
        # Convert ObjectId to string
        for doc in documents:
            doc["_id"] = str(doc["_id"])
        
        return {
            "status": "success",
            "collection": collection.name,
            "count": len(documents),
            "data": documents
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Get S3 metadata failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get metadata: {str(e)}")
