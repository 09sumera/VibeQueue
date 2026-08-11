import os
from pathlib import Path
from pymongo import MongoClient
from dotenv import load_dotenv

# Get the exact folder where database.py is located
BASE_DIR = Path(__file__).resolve().parent
ENV_FILE = BASE_DIR / ".env"

print("====================================")
print("DATABASE DEBUG")
print("database.py:", __file__)
print(".env path:", ENV_FILE)
print(".env exists:", ENV_FILE.exists())

# Load the exact .env file
load_dotenv(dotenv_path=str(ENV_FILE), override=True)

MONGO_URI = os.environ.get("MONGO_URI")

print("MONGO_URI found:", bool(MONGO_URI))

if MONGO_URI:
    print("MONGO_URI starts with:", MONGO_URI[:20])

if not MONGO_URI:
    raise RuntimeError(
        f"MONGO_URI is missing from {ENV_FILE}"
    )

# Connect to MongoDB Atlas
client = MongoClient(
    MONGO_URI,
    serverSelectionTimeoutMS=10000
)

# Test connection
client.admin.command("ping")

# Explicit VibeQueue database
db = client["vibequeue"]

# Collections expected by app.py
users_collection = db["users"]
otps_collection = db["otps"]
playlists_collection = db["playlists"]
blends_collection = db["blendsessions"]
blend_links_collection = db["blend_links"]

# OTP expires after 10 minutes
otps_collection.create_index(
    "createdAt",
    expireAfterSeconds=600
)

print("✅ MongoDB Atlas connected successfully")
print("✅ Database: vibequeue")
print("====================================")