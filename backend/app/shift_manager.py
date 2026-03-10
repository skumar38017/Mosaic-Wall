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
        
        # Broadcast shift change - kiosk will respond with grid info
        await manager.broadcast({
            "type": "shift_request",
            "shift": request.shift
        })
        
        return {"status": "shift_set", "shift": request.shift}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Set shift failed: {e}")
        raise HTTPException(status_code=500, detail=f"Set shift failed: {str(e)}")

@router.post("/load-shift-with-grid")
async def load_shift_with_grid(shift: str, cols: int, rows: int):
    """Load shift images with exact grid dimensions from kiosk"""
    asyncio.create_task(load_shift_images_with_capacity(shift, cols * rows))
    return {"status": "loading"}

async def load_shift_images_with_capacity(shift: str, grid_capacity: int):
    """Load images from S3 with exact grid capacity from kiosk"""
    try:
        if not client:
            print("❌ MongoDB not configured")
            return
        
        print(f"📐 Grid capacity from kiosk: {grid_capacity} cells")
        
        # Determine which collections to load from
        collections = []
        if shift == "Day Shift":
            collections = [db.dayshift_uploads]
            print("☀️ Day Shift: Loading all images from dayshift collection")
        elif shift == "Night Shift":
            collections = [db.nightshift_uploads]
            print("🌙 Night Shift: Loading all images from nightshift collection")
        elif shift == "Merge":
            collections = [db.dayshift_uploads, db.nightshift_uploads, db.general_uploads]
            print("🔀 Merge: Loading all images from all shifts")
        
        print(f"📥 Loading images for {shift}...")
        
        # Fetch ALL images from collections (sorted by latest) - SAME AS MERGE
        all_images = []
        for collection in collections:
            cursor = collection.find().sort("created_at", -1)
            documents = await cursor.to_list(length=None)
            all_images.extend(documents)
            print(f"📦 Found {len(documents)} images in collection")
        
        # Sort all images by created_at (latest first) - SAME AS MERGE
        all_images.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        # Load MORE images than grid capacity to fill screen better - SAME AS MERGE
        max_images = max(grid_capacity * 2, len(all_images))  # Load 2x grid capacity or all available
        all_images = all_images[:max_images]
        
        print(f"📦 Loading {len(all_images)} images (grid capacity: {grid_capacity})")
        
        # Wait 1 second for kiosk to stabilize connection
        await asyncio.sleep(1)
        
        # Download and broadcast images
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            for idx, doc in enumerate(all_images):
                try:
                    response = await http_client.get(doc["url"])
                    if response.status_code == 200:
                        image_data = base64.b64encode(response.content).decode('utf-8')
                        
                        message = {
                            "image_data": image_data,
                            "timestamp": doc.get("timestamp", datetime.now().isoformat()),
                            "id": str(doc.get("_id", idx))
                        }
                        
                        await manager.broadcast(message)
                        print(f"✅ Broadcasted image {idx + 1}/{len(all_images)} for {shift}")
                        
                        await asyncio.sleep(0.05)
                    
                except Exception as e:
                    print(f"❌ Failed to load image {doc.get('key')}: {e}")
                    continue
        
        print(f"✅ Completed loading {len(all_images)} images for {shift}")
        
    except Exception as e:
        print(f"❌ Load shift images failed: {e}")

async def load_shift_images(shift: str):
    """Load images from S3 until grid is full"""
    try:
        if not client:
            print("❌ MongoDB not configured")
            return
        
        # Clear kiosk grid first
        await manager.broadcast({
            "type": "clear_grid"
        })
        print("🧹 Cleared kiosk grid")
        await asyncio.sleep(0.5)
        
        # Get display settings to calculate grid capacity
        settings_json = await redis_manager.redis.get("display_settings")
        grid_cell_percentage = 10  # default
        if settings_json:
            settings = json.loads(settings_json)
            grid_cell_percentage = settings.get("grid_cell_percentage", 10)
        
        # Calculate grid capacity based on typical screen (1920x1080)
        screen_width = 1920
        screen_height = 1080
        smaller_dimension = min(screen_width, screen_height)
        cell_size = (smaller_dimension * grid_cell_percentage) / 100
        gap = 1
        
        cols = int(screen_width / (cell_size + gap))
        rows = int(screen_height / (cell_size + gap))
        grid_capacity = cols * rows
        
        print(f"📐 Grid capacity: {grid_capacity} cells ({cols}x{rows})")
        
        # Determine which collections to load from
        collections = []
        if shift == "Day Shift":
            collections = [db.dayshift_uploads]
        elif shift == "Night Shift":
            collections = [db.nightshift_uploads]
        elif shift == "Merge":
            collections = [db.dayshift_uploads, db.nightshift_uploads, db.general_uploads]
        
        print(f"📥 Loading images for {shift} until grid is full...")
        
        # Fetch images from collections (sorted by latest)
        all_images = []
        for collection in collections:
            cursor = collection.find().sort("created_at", -1)
            documents = await cursor.to_list(length=None)
            all_images.extend(documents)
        
        # Sort all images by created_at (latest first)
        all_images.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        # Limit to grid capacity - STOP when full
        all_images = all_images[:grid_capacity]
        
        print(f"📦 Loading {len(all_images)} images to fill grid (max: {grid_capacity})")
        
        # Download and broadcast images until grid is full
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            for idx, doc in enumerate(all_images):
                try:
                    response = await http_client.get(doc["url"])
                    if response.status_code == 200:
                        image_data = base64.b64encode(response.content).decode('utf-8')
                        
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
