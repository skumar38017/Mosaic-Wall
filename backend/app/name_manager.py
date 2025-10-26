from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from .redis_manager import redis_manager
import json
from datetime import datetime

router = APIRouter()

NAME_KEY = "current_user_name"

class NameRequest(BaseModel):
    name: str

@router.post("/set-name")
async def set_user_name(request: NameRequest):
    """Set user name in Redis (replaces old name)"""
    try:
        if not request.name or not request.name.strip():
            raise HTTPException(status_code=400, detail="Name cannot be empty")
        
        name_data = {
            "name": request.name.strip(),
            "timestamp": datetime.now().isoformat()
        }
        
        # Store in Redis (replaces old name automatically)
        if redis_manager.redis:
            await redis_manager.redis.set(NAME_KEY, json.dumps(name_data))
            print(f"✅ User name set: {request.name}")
        else:
            raise HTTPException(status_code=500, detail="Redis not available")
        
        return {"status": "name_set", "name": request.name}
        
    except Exception as e:
        print(f"❌ Set name failed: {e}")
        raise HTTPException(status_code=500, detail=f"Set name failed: {str(e)}")

@router.post("/delete-name")
async def delete_user_name():
    """Delete/clear current user name from Redis"""
    try:
        if not redis_manager.redis:
            raise HTTPException(status_code=500, detail="Redis not available")
        
        # Delete name from Redis
        deleted = await redis_manager.redis.delete(NAME_KEY)
        
        if deleted:
            print("✅ User name deleted")
            return {"status": "name_deleted", "message": "Name cleared successfully"}
        else:
            return {"status": "no_name", "message": "No name to delete"}
        
    except Exception as e:
        print(f"❌ Delete name failed: {e}")
        raise HTTPException(status_code=500, detail=f"Delete name failed: {str(e)}")

@router.get("/get-name")
async def get_user_name():
    """Get current user name from Redis"""
    try:
        if not redis_manager.redis:
            raise HTTPException(status_code=500, detail="Redis not available")
        
        name_json = await redis_manager.redis.get(NAME_KEY)
        
        if not name_json:
            return {"status": "no_name", "name": None}
        
        name_data = json.loads(name_json)
        print(f"📤 Retrieved name: {name_data.get('name')}")
        
        return {
            "status": "name_found", 
            "name": name_data.get("name"),
            "timestamp": name_data.get("timestamp")
        }
        
    except Exception as e:
        print(f"❌ Get name failed: {e}")
        raise HTTPException(status_code=500, detail=f"Get name failed: {str(e)}")
