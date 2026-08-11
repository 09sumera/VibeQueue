import os
import random
import datetime
import requests
import resend
from flask import Flask, render_template, request, jsonify, session
from dotenv import load_dotenv

# Load Env
load_dotenv()

from music_queue import MusicQueue
from database import users_collection, otps_collection, playlists_collection, blends_collection, blend_links_collection
from bson.objectid import ObjectId

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "fallback-secret-key")

resend.api_key = os.getenv("RESEND_API_KEY", "")

music_queue = MusicQueue()

# ==============================
# AUTHENTICATION
# ==============================
from werkzeug.security import generate_password_hash, check_password_hash


from flask import redirect
def process_blend(current_user_email, link_id):
    link_data = blend_links_collection.find_one({"_id": link_id})
    if not link_data: return
    
    creator_email = link_data["creator"]
    if creator_email == current_user_email: return # Can't blend with self
    
    # Check if blend already exists
    blend_name_for_me = f"Blend with {creator_email.split('@')[0]}"
    if playlists_collection.find_one({"user": current_user_email, "blend_with": creator_email}): return
    
    # Merge songs
    my_playlists = list(playlists_collection.find({"user": current_user_email}))
    my_songs = {s["id"]: s for p in my_playlists for s in p.get("songs", [])}
    
    their_playlists = list(playlists_collection.find({"user": creator_email}))
    their_songs = {s["id"]: s for p in their_playlists for s in p.get("songs", [])}
    
    blended_songs = list({**my_songs, **their_songs}.values())
    
    # Save for current user
    playlists_collection.insert_one({
        "user": current_user_email,
        "name": blend_name_for_me,
        "songs": blended_songs,
        "createdAt": datetime.datetime.utcnow(),
        "is_blend": True,
        "blend_with": creator_email
    })
    
    # Save for creator
    blend_name_for_them = f"Blend with {current_user_email.split('@')[0]}"
    if not playlists_collection.find_one({"user": creator_email, "blend_with": current_user_email}):
        playlists_collection.insert_one({
            "user": creator_email,
            "name": blend_name_for_them,
            "songs": blended_songs,
            "createdAt": datetime.datetime.utcnow(),
            "is_blend": True,
            "blend_with": current_user_email
        })

@app.route("/blend/<link_id>")
def accept_blend(link_id):
    if "user" not in session:
        session["pending_blend"] = link_id
        # Will show auth modal because user is not in session on index.html
        return redirect(f"/?pending_blend={link_id}#home")
        
    process_blend(session["user"], link_id)
    return redirect("/#home")


def ensure_default_playlists(email):
    # Ensure 'My Playlist' exists
    if not playlists_collection.find_one({"user": email, "name": "My Playlist"}):
        playlists_collection.insert_one({"user": email, "name": "My Playlist", "songs": [], "createdAt": datetime.datetime.utcnow(), "is_default": True})
    # Ensure 'Liked Songs' exists
    if not playlists_collection.find_one({"user": email, "name": "Liked Songs"}):
        playlists_collection.insert_one({"user": email, "name": "Liked Songs", "songs": [], "createdAt": datetime.datetime.utcnow(), "is_default": True})



@app.route("/auth/check-email", methods=["POST"])
def check_email():
    data = request.get_json()
    email = data.get("email")
    if not email:
        return jsonify({"success": False, "message": "Email required"}), 400
    user = users_collection.find_one({"email": email})
    if user and user.get("password"):
        return jsonify({"success": True, "method": "password"})
    return jsonify({"success": True, "method": "otp"})

@app.route("/auth/request-otp", methods=["POST"])
def request_otp():
    data = request.get_json()
    email = data.get("email")
    if not email:
        return jsonify({"success": False, "message": "Email required"}), 400

    # Generate 6-digit OTP
    otp_code = str(random.randint(100000, 999999))
    
    # Store in MongoDB
    otps_collection.update_one(
        {"email": email},
        {"$set": {
            "email": email, 
            "code": otp_code, 
            "createdAt": datetime.datetime.utcnow()
        }},
        upsert=True
    )
    
    # In development, print to console
    print(f"\n======================================")
    print(f"🔑 OTP for {email}: {otp_code}")
    print(f"======================================\n")
    
    # Send email via Resend if API key is configured
    if resend.api_key:
        try:
            resend.Emails.send({
                "from": "VibeQueue <onboarding@resend.dev>",
                "to": email,
                "subject": "Your VibeQueue Login Code",
                "html": f"<p>Your login code is: <strong>{otp_code}</strong></p><p>This code expires in 10 minutes.</p>"
            })
            print("Email sent successfully via Resend.")
        except Exception as e:
            print(f"Failed to send email: {e}")
            
    return jsonify({"success": True, "message": "OTP sent"})

@app.route("/auth/verify-otp", methods=["POST"])
def verify_otp():
    data = request.get_json()
    email = data.get("email")
    code = data.get("code")
    
    if not email or not code:
        return jsonify({"success": False, "message": "Email and OTP required"}), 400
        
    otp_record = otps_collection.find_one({"email": email, "code": code})
    
    if not otp_record:
        return jsonify({"success": False, "message": "Invalid or expired OTP"}), 401
        
    # Valid OTP, create user if not exists
    user = users_collection.find_one({"email": email})
    if not user:
        users_collection.insert_one({"email": email, "createdAt": datetime.datetime.utcnow()})
        
    # Delete OTP after successful use
    otps_collection.delete_one({"_id": otp_record["_id"]})
    
    # Set pending_email for password setup
    session["pending_email"] = email
    
    return jsonify({"success": True, "message": "OTP verified."})

@app.route("/auth/set-password", methods=["POST"])
def set_password():
    data = request.get_json()
    password = data.get("password")
    email = session.get("pending_email")
    
    if not email or not password:
        return jsonify({"success": False, "message": "Unauthorized or missing password"}), 400
        
    hashed = generate_password_hash(password)
    users_collection.update_one({"email": email}, {"$set": {"password": hashed}})
    
    session.pop("pending_email", None)
    session["user"] = email
    ensure_default_playlists(email)

    # Process pending blend
    pending_blend = session.pop("pending_blend", None)
    if pending_blend:
        process_blend(email, pending_blend)

    return jsonify({"success": True, "message": "Password set and logged in"})

@app.route("/auth/login-password", methods=["POST"])
def login_password():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")
    
    if not email or not password:
        return jsonify({"success": False, "message": "Email and password required"}), 400
        
    user = users_collection.find_one({"email": email})
    if not user or not user.get("password") or not check_password_hash(user.get("password"), password):
        return jsonify({"success": False, "message": "Invalid email or password"}), 401
        
    session["user"] = email
    ensure_default_playlists(email)

    # Process pending blend
    pending_blend = session.pop("pending_blend", None)
    if pending_blend:
        process_blend(email, pending_blend)

    return jsonify({"success": True, "message": "Logged in"})

@app.route("/auth/logout", methods=["POST"])
def logout():
    session.pop("user", None)
    session.pop("pending_email", None)
    return jsonify({"success": True})

@app.route("/auth/me")
def get_me():
    if "user" in session:
        ensure_default_playlists(session["user"])
        return jsonify({"success": True, "email": session["user"]})
    return jsonify({"success": False})

# ==============================
# PAGES
# ==============================

@app.route("/")
def home():
    user = session.get("user")
    return render_template(
        "index.html",
        user=user
    )

# ==============================
# MUSIC API (DEEZER PROXY)
# ==============================

@app.route("/api/search")
def search_music():
    query = request.args.get("q")
    if not query:
        return jsonify({"success": False, "message": "Query parameter 'q' is required"}), 400
        
    try:
        # 1. Call the correct Deezer API
        response = requests.get(f"https://api.deezer.com/search?q={query}")
        data = response.json()
        
        results = []
        
        # 2. Correctly parse the response from Deezer (songs are inside data array)
        if "data" in data and len(data["data"]) > 0:
            for item in data["data"][:12]: # Limit to top 12 results
                results.append({
                    "id": item.get("id"),
                    "title": item.get("title"),
                    "artist": item["artist"]["name"] if "artist" in item else "Unknown",
                    "cover": item["album"]["cover_medium"] if "album" in item else "",
                    "preview": item.get("preview"),
                    "duration": item.get("duration", 0)
                })
        else:
            # FALLBACK: If Deezer blocks the server IP and returns an empty data array,
            # fallback to iTunes API to ensure the user still gets songs.
            itunes_resp = requests.get(f"https://itunes.apple.com/search?term={query}&entity=song&limit=12")
            itunes_data = itunes_resp.json()
            if "results" in itunes_data:
                for item in itunes_data["results"]:
                    results.append({
                        "id": str(item.get("trackId")),
                        "title": item.get("trackName"),
                        "artist": item.get("artistName"),
                        # Request a high-resolution cover art from iTunes
                        "cover": item.get("artworkUrl100", "").replace("100x100bb", "500x500bb"),
                        "preview": item.get("previewUrl"),
                        "duration": int(item.get("trackTimeMillis", 0) / 1000)
                    })
                    
        return jsonify({"success": True, "results": results})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

# ==============================
# PLAYLISTS
# ==============================

@app.route("/api/playlists", methods=["GET"])
def get_playlists():
    if "user" not in session:
        return jsonify({"success": False, "message": "Unauthorized"}), 401
        
    ensure_default_playlists(session["user"])
        
    playlists = list(playlists_collection.find({"user": session["user"]}))
    for p in playlists:
        p["_id"] = str(p["_id"])
    return jsonify({"success": True, "playlists": playlists})

@app.route("/api/playlists", methods=["POST"])
def create_playlist():
    if "user" not in session:
        return jsonify({"success": False, "message": "Unauthorized"}), 401
        
    data = request.get_json()
    name = data.get("name", "New Playlist")
    
    new_playlist = {
        "user": session["user"],
        "name": name,
        "songs": [],
        "createdAt": datetime.datetime.utcnow()
    }
    
    result = playlists_collection.insert_one(new_playlist)
    new_playlist["_id"] = str(result.inserted_id)
    return jsonify({"success": True, "playlist": new_playlist})

@app.route("/api/playlists/<playlist_id>", methods=["DELETE"])
def delete_playlist(playlist_id):
    if "user" not in session:
        return jsonify({"success": False, "message": "Unauthorized"}), 401
        
    try:
        playlists_collection.delete_one({"_id": ObjectId(playlist_id), "user": session["user"]})
        return jsonify({"success": True})
    except:
        return jsonify({"success": False, "message": "Invalid ID"}), 400

@app.route("/api/playlists/<playlist_id>/songs", methods=["POST"])
def add_to_playlist(playlist_id):
    if "user" not in session:
        return jsonify({"success": False, "message": "Unauthorized"}), 401
        
    song = request.get_json()
    if not song:
        return jsonify({"success": False, "message": "No song data provided"}), 400
        
    try:
        playlists_collection.update_one(
            {"_id": ObjectId(playlist_id), "user": session["user"]},
            {"$push": {"songs": song}}
        )
        return jsonify({"success": True})
    except:
        return jsonify({"success": False, "message": "Invalid ID"}), 400


@app.route("/api/playlists/<playlist_id>", methods=["PUT"])
def rename_playlist(playlist_id):
    if "user" not in session:
        return jsonify({"success": False, "message": "Unauthorized"}), 401
    
    data = request.get_json()
    new_name = data.get("name")
    if not new_name:
        return jsonify({"success": False, "message": "Name is required"}), 400
        
    try:
        playlists_collection.update_one(
            {"_id": ObjectId(playlist_id), "user": session["user"]},
            {"$set": {"name": new_name}}
        )
        return jsonify({"success": True})
    except:
        return jsonify({"success": False, "message": "Invalid ID"}), 400

@app.route("/api/playlists/<playlist_id>/songs/<song_id>", methods=["DELETE"])
def remove_from_playlist(playlist_id, song_id):
    if "user" not in session:
        return jsonify({"success": False, "message": "Unauthorized"}), 401
        
    try:
        playlists_collection.update_one(
            {"_id": ObjectId(playlist_id), "user": session["user"]},
            {"$pull": {"songs": {"id": song_id}}}
        )
        return jsonify({"success": True})
    except:
        return jsonify({"success": False, "message": "Invalid ID"}), 400





# ==============================
# BLEND
# ==============================
@app.route("/api/blend/create", methods=["POST"])
def create_blend():
    if "user" not in session:
        return jsonify({"success": False, "message": "Unauthorized"}), 401
        
    data = request.get_json()
    songs = data.get("songs", [])
    
    if not isinstance(songs, list) or len(songs) < 2:
        return jsonify({"success": False, "message": "Select at least 2 songs to create a blend."}), 400
        
    # Get user info
    email = session["user"]
    username = email.split('@')[0]
    
    blend_name = f"My Vibe Blend ({len(songs)} songs)"
    
    new_blend = {
        "user": email,
        "name": blend_name,
        "songs": songs,
        "createdAt": datetime.datetime.utcnow(),
        "is_blend": True
    }
    
    playlists_collection.insert_one(new_blend)
    
    return jsonify({"success": True, "message": f"Created blend with {len(songs)} songs"})

# ==============================
# MOOD PREDICTOR
# ==============================
@app.route("/api/mood")
def mood_predictor():
    mood = request.args.get("mood", "").lower().strip()
    if not mood:
        return jsonify({"success": False, "message": "Mood is required"}), 400
        
    mood_map = {
        "sad": "melancholy acoustic sad slow",
        "gym": "workout hype phonk hardstyle gym",
        "focus": "lofi study beats chill focus",
        "party": "pop dance upbeat party club",
        "rainy": "jazz acoustic rain chill",
        "sleep": "ambient soft sleep relax"
    }
    
    query = mood_map.get(mood, mood) # Fallback to word itself
    
    # Reuse the search_music logic directly by faking request args? No, just call the API directly here.
    try:
        response = requests.get(f"https://api.deezer.com/search?q={query}")
        data = response.json()
        results = []
        if "data" in data and len(data["data"]) > 0:
            for item in data["data"][:12]:
                results.append({
                    "id": item.get("id"),
                    "title": item.get("title"),
                    "artist": item["artist"]["name"] if "artist" in item else "Unknown",
                    "cover": item["album"]["cover_medium"] if "album" in item else "",
                    "preview": item.get("preview"),
                    "duration": item.get("duration", 0)
                })
        else:
            itunes_resp = requests.get(f"https://itunes.apple.com/search?term={query}&entity=song&limit=12")
            itunes_data = itunes_resp.json()
            if "results" in itunes_data:
                for item in itunes_data["results"]:
                    results.append({
                        "id": str(item.get("trackId")),
                        "title": item.get("trackName"),
                        "artist": item.get("artistName"),
                        "cover": item.get("artworkUrl100", "").replace("100x100bb", "500x500bb"),
                        "preview": item.get("previewUrl"),
                        "duration": int(item.get("trackTimeMillis", 0) / 1000)
                    })
        return jsonify({"success": True, "results": results})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

# ==============================
# PROFILE
# ==============================
@app.route("/api/profile")
def get_profile():
    if "user" not in session:
        return jsonify({"success": False, "message": "Unauthorized"}), 401
        
    user_email = session["user"]
    ensure_default_playlists(user_email)
    playlists = list(playlists_collection.find({"user": user_email}))
    
    playlist_count = len([p for p in playlists if not p.get("is_blend") and p.get("name") != "Liked Songs"])
    liked_songs_playlist = next((p for p in playlists if p.get("name") == "Liked Songs"), None)
    liked_count = len(liked_songs_playlist["songs"]) if liked_songs_playlist else 0
    blend_count = len([p for p in playlists if p.get("is_blend")])
    
    return jsonify({
        "success": True,
        "profile": {
            "email": user_email,
            "username": user_email.split('@')[0],
            "stats": {
                "playlists": playlist_count,
                "liked_songs": liked_count,
                "blends": blend_count
            }
        }
    })


# ==============================
# QUEUE ROUTES (Legacy - might need updates later)
# ==============================

@app.route("/add-to-queue", methods=["POST"])
def add_to_queue():
    data = request.get_json()
    song = data.get("song")
    artist = data.get("artist")

    if not song:
        return jsonify({"success": False, "message": "Song name missing"})

    music_queue.enqueue({
        "song": song,
        "artist": artist
    })
    return jsonify({"success": True, "message": f"{song} added to queue"})

@app.route("/queue")
def get_queue():
    return jsonify({
        "success": True,
        "queue": music_queue.get_all()
    })

@app.route("/play-next", methods=["POST"])
def play_next():
    song = music_queue.dequeue()
    if song is None:
        return jsonify({"success": False, "message": "Queue is empty"})
    return jsonify({"success": True, "song": song})

@app.route("/clear-queue", methods=["POST"])
def clear_queue():
    music_queue.clear()
    return jsonify({"success": True})

if __name__ == "__main__":
    app.run(debug=True)