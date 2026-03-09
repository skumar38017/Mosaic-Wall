from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from .redis_manager import redis_manager
import json
from datetime import datetime

router = APIRouter()

SHIFT_KEY = "current_shift"

class ShiftRequest(BaseModel):
    shift: str

@router.post("/set-shift")
async def set_shift(request: ShiftRequest):
    """Set current shift (Day Shift, Night Shift, or Merge)"""
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
        
        return {"status": "shift_set", "shift": request.shift}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Set shift failed: {e}")
        raise HTTPException(status_code=500, detail=f"Set shift failed: {str(e)}")

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
