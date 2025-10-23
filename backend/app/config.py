import os
from dotenv import load_dotenv

load_dotenv()

BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")
DATABASE_URL = os.getenv("DATABASE_URL", "mongodb://localhost:27017")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
PORT = int(os.getenv("PORT", 8000))
