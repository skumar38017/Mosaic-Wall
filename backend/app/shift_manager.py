from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from .redis_manager import redis_manager
import json
from datetime import datetime
from .websocket_manager import manager
from motor.motor_asyncio import AsyncIOMotorClient
import os
import httpx
import base64
import asyncio

router = APIRouter()

SHIFT_KEY = "current_shift"

# MongoDB connection
DATABASE_URL = os.getenv("DATABASE_URL")
client = AsyncIOMotorClient(DATABASE_URL) if DATABASE_URL else None
db = client.mosaic_db if client else None

class ShiftRequest(BaseModel):
    shift: str

@router.post("/set-shift")
async def set_shift(request: ShiftRequest):
    """Set current shift and load images from S3"""
    try:
        valid_shifts = ["Day Shift", "Night Shift", "Merge"]
        if request.shift not in valid_shifts:
            raise HTTPException(status_code=400, detail=f"Invalid shift. Must be one of: {valid_shifts}")
        
        if not redis_manager.redis:
            raise HTTPException(status_code=500, detail="Redis not available")
        
        shift_data = {
            "shift": request.shift,
            "timestamp": datetime.now().isoformat()
        }
        
        await redis_manager.redis.set(SHIFT_KEY, json.dumps(shift_data))
        print(f"✅ Shift set: {request.shift}")
        
        # Load images from S3 based on shift
        asyncio.create_task(load_shift_images(request.shift))
        
        return {"status": "shift_set", "shift": request.shift}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Set shift failed: {e}")
        raise HTTPException(status_code=500, detail=f"Set shift failed: {str(e)}")

async def load_shift_images(shift: str):
    """Load images from S3 based on shift selection - fills grid capacity"""
    try:
        if not client:
            print("❌ MongoDB not configured")
            return
        
        # Get display settings to calculate grid capacity
        settings_json = await redis_manager.redis.get("display_settings")
        grid_cell_percentage = 10  # default
        if settings_json:
            settings = json.loads(settings_json)
            grid_cell_percentage = settings.get("grid_cell_percentage", 10)
        
        # Calculate grid capacity (approximate based on cell percentage)
        # Smaller cells = more capacity
        # Formula: rough estimate of cells that fit on screen
        cols = int(100 / grid_cell_percentage)
        rows = int(100 / grid_cell_percentage)
        grid_capacity = cols * rows
        
        print(f"📐 Grid capacity: {grid_capacity} cells ({cols}x{rows})")
        
        # Determine which collections to load from
        collections = []
        if shift == "Day Shift":
            collections = [db.dayshift_uploads]
        elif shift == "Night Shift":
            collections = [db.nightshift_uploads]
        elif shift == "Merge":
            collections = [db.dayshift_uploads, db.nightshift_uploads]
        
        print(f"📥 Loading {grid_capacity} images for {shift}...")
        
        # Fetch images up to grid capacity
        all_images = []
        images_per_collection = grid_capacity // len(collections) if len(collections) > 1 else grid_capacity
        
        for collection in collections:
            cursor = collection.find().sort("created_at", -1).limit(images_per_collection)
            documents = await cursor.to_list(length=images_per_collection)
            all_images.extend(documents)
        
        # Trim to exact grid capacity
        all_images = all_images[:grid_capacity]
        
        print(f"📦 Loading {len(all_images)} images to fill grid")
        
        # Download and broadcast images
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            for idx, doc in enumerate(all_images):
                try:
                    # Download image from S3 URL
                    response = await http_client.get(doc["url"])
                    if response.status_code == 200:
                        # Convert to base64
                        image_data = base64.b64encode(response.content).decode('utf-8')
                        
                        # Broadcast to kiosk (same format as normal uploads)
                        message = {
                            "image_data": image_data,
                            "timestamp": doc.get("timestamp", datetime.now().isoformat()),
                            "id": str(doc.get("_id", idx))
                        }
                        
                        await manager.broadcast(message)
                        print(f"✅ Broadcasted image {idx + 1}/{len(all_images)}")
                        
                        # Small delay between broadcasts
                        await asyncio.sleep(0.05)
                    
                except Exception as e:
                    print(f"❌ Failed to load image {doc.get('key')}: {e}")
                    continue
        
        print(f"✅ Completed loading {len(all_images)} images for {shift}")
        
    except Exception as e:
        print(f"❌ Load shift images failed: {e}")

@router.get("/get-shift")
async def get_shift():
    """Get current shift"""
    try:
        if not redis_manager.redis:
            raise HTTPException(status_code=500, detail="Redis not available")
        
        shift_json = await redis_manager.redis.get(SHIFT_KEY)
        
        if not shift_json:
            return {"status": "no_shift", "shift": None}
        
        shift_data = json.loads(shift_json)
        print(f"📤 Retrieved shift: {shift_data.get('shift')}")
        
        return {
            "status": "shift_found", 
            "shift": shift_data.get("shift"),
            "timestamp": shift_data.get("timestamp")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Get shift failed: {e}")
        raise HTTPException(status_code=500, detail=f"Get shift failed: {str(e)}")
