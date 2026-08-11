/* =========================================================
   VIBEQUEUE — FINAL app.js
   ========================================================= */

const audio = document.getElementById("audio");
const player = document.getElementById("player");
const mainPlay = document.getElementById("mainPlay");
const progressBar = document.getElementById("progressBar");
const volume = document.getElementById("volume");

const currentSong = document.getElementById("currentSong");
const currentArtist = document.getElementById("currentArtist");
const currentTime = document.getElementById("currentTime");
const duration = document.getElementById("duration");

// Fix browser auto-fill bug for search input
const vqSearchInputElem = document.getElementById("vqSearchInput");
if (vqSearchInputElem) vqSearchInputElem.value = "";

const playerPoster = document.getElementById("playerPoster");
const miniPlaceholder = document.getElementById("miniPlaceholder");

const queueBox = document.getElementById("queueBox");
const queueStatus = document.getElementById("queueStatus");
const favoritesBox = document.getElementById("favoritesBox");
const toast = document.getElementById("toast");

let currentData = null;
let repeat = false;


/* =========================================================
   STORAGE
   ========================================================= */

let favorites = JSON.parse(
    localStorage.getItem("vibequeueFavorites") || "[]"
);

let recentlyPlayed = JSON.parse(
    localStorage.getItem("vibequeueRecentlyPlayed") || "[]"
);

let myPlaylist = JSON.parse(
    localStorage.getItem("vibequeuePlaylist") || "[]"
);


/* =========================================================
   TOAST
   ========================================================= */

function showToast(message) {
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(window.toastTimer);

    window.toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 1800);
}


/* =========================================================
   SONG DATA
   ========================================================= */

function getSongData(button) {
    const card = button.closest(".song-card");

    if (!card) return null;

    return {
        card: card,
        song: card.dataset.song,
        artist: card.dataset.artist,
        file: card.dataset.file,
        image: card.dataset.image
    };
}


/* =========================================================
   IMAGE PATH
   ========================================================= */

const FALLBACK_IMAGE = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23ff69b4'/%3E%3Cstop offset='100%25' stop-color='%238a2be2'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='200' height='200' fill='url(%23g)'/%3E%3Ctext x='50%25' y='50%25' font-size='80' text-anchor='middle' dominant-baseline='middle' fill='%23fff'%3E🎵%3C/text%3E%3C/svg%3E";

const SONG_IMAGE_MAPPING = {
    "Apna Bana Le": "ApnaBanaLe.jpg",
    "Sapta Sagaradaache Ello": "SaptaSagaradaacheEllo.jpg",
    "Tum Hi Ho": "TumHiHo.jpg",
    "Until I Found You": "UntilIFoundYou.jpg",
    "Saiyaara": "Saiyaara.jpg",
    "Ishq Wala Love": "IshqWalaLove.jpg",
    "Naa Ee Sanjege": "NaaEeSanjege.jpg",
    "Perfect": "Perfect.jpg"
};

function getSongImageUrl(song) {
    if (!song) return FALLBACK_IMAGE;
    let imgName = song.cover || song.image;
    
    if (!imgName && song.title) imgName = SONG_IMAGE_MAPPING[song.title];
    if (!imgName && song.song) imgName = SONG_IMAGE_MAPPING[song.song];
    
    if (!imgName) return FALLBACK_IMAGE;
    if (imgName.startsWith("http") || imgName.startsWith("data:")) return imgName;
    return "/static/images/" + encodeURIComponent(imgName);
}

function getImagePath(image) {
    if (!image) return FALLBACK_IMAGE;
    if (image.startsWith("http") || image.startsWith("data:")) return image;
    return "/static/images/" + encodeURIComponent(image);
}


/* =========================================================
   RECENTLY PLAYED
   ========================================================= */

function saveRecentlyPlayed(data) {
    if (!data) return;

    recentlyPlayed = recentlyPlayed.filter(
        song => song.song !== data.song
    );

    recentlyPlayed.unshift({
        song: data.song,
        artist: data.artist,
        file: data.file,
        image: data.image
    });

    recentlyPlayed = recentlyPlayed.slice(0, 8);

    localStorage.setItem(
        "vibequeueRecentlyPlayed",
        JSON.stringify(recentlyPlayed)
    );
}


/* =========================================================
   REMOVE RECENTLY PLAYED
   ========================================================= */

function removeRecentlyPlayed(index) {
    if (!recentlyPlayed[index]) return;

    recentlyPlayed.splice(index, 1);

    localStorage.setItem(
        "vibequeueRecentlyPlayed",
        JSON.stringify(recentlyPlayed)
    );

    showToast("Removed from Recently Played");

    const subtitle =
        document.getElementById("libraryModalSubtitle");

    if (subtitle) {
        subtitle.textContent =
            recentlyPlayed.length + " recently played";
    }

    renderRecentlyPlayedModal();
}


/* =========================================================
   PLAYER POSTER
   ========================================================= */

function setPlayerPoster(image) {
    if (!playerPoster) return;

    const imagePath = getImagePath(image);

    if (!imagePath) {
        playerPoster.style.display = "none";

        if (miniPlaceholder) {
            miniPlaceholder.style.display = "grid";
        }

        return;
    }

    if (miniPlaceholder) {
        miniPlaceholder.style.display = "none";
    }

    playerPoster.style.display = "block";
    playerPoster.src = imagePath;

    playerPoster.onerror = function () {
        this.style.display = "none";

        if (miniPlaceholder) {
            miniPlaceholder.style.display = "grid";
        }
    };

    playerPoster.onload = function () {
        this.style.display = "block";

        if (miniPlaceholder) {
            miniPlaceholder.style.display = "none";
        }
    };
}


/* =========================================================
   PLAY SONG
   ========================================================= */

function playSong(data) {
    if (!data) return;

    currentData = data;

    currentSong.textContent = data.song;
    currentArtist.textContent = data.artist;

    saveRecentlyPlayed(data);

    setPlayerPoster(data.image);

    if (data.file && data.file.startsWith("http")) {
        audio.src = data.file;
    } else {
        audio.src =
            "/static/music/" +
            encodeURIComponent(data.file);
    }

    audio.load();

    document.querySelectorAll(".song-card").forEach(card => {
        card.classList.remove("now-playing");
    });

    if (data.card) {
        data.card.classList.add("now-playing");
    }

    audio.play()
        .then(() => {
            if (player) {
                player.classList.add("playing");
            }

            mainPlay.textContent = "❚❚";

            showToast(data.song + " is playing 🎧");
        })
        .catch(error => {
            console.error("Audio error:", error);
            showToast("Couldn't play this song.");
        });
}


/* =========================================================
   PLAY CARD
   ========================================================= */

function playCard(button) {
    const data = getSongData(button);

    if (data) {
        playSong(data);
    }
}


/* =========================================================
   START LISTENING
   ========================================================= */

async function startListening() {
    try {
        const response = await fetch("/queue");
        const result = await response.json();

        const queue = result.queue || [];

        if (queue.length > 0) {
            await nextSong(false);
            return;
        }

        const firstCard =
            document.querySelector(".song-card");

        if (!firstCard) return;

        playCard(
            firstCard.querySelector(".poster-play")
        );

    } catch (error) {
        console.error(error);

        const firstCard =
            document.querySelector(".song-card");

        if (!firstCard) return;

        playCard(
            firstCard.querySelector(".poster-play")
        );
    }
}


/* =========================================================
   PLAY / PAUSE
   ========================================================= */

function togglePlay() {
    if (!audio.src) {
        startListening();
        return;
    }

    if (audio.paused) {
        audio.play();
    } else {
        audio.pause();
    }
}


/* =========================================================
   AUDIO EVENTS
   ========================================================= */

audio.addEventListener("play", () => {
    if (player) {
        player.classList.add("playing");
    }

    mainPlay.textContent = "❚❚";
});


audio.addEventListener("pause", () => {
    if (player) {
        player.classList.remove("playing");
    }

    mainPlay.textContent = "▶";
});


audio.addEventListener("loadedmetadata", () => {
    duration.textContent =
        formatTime(audio.duration);
});


audio.addEventListener("timeupdate", () => {
    if (!audio.duration) return;

    progressBar.value =
        (audio.currentTime / audio.duration) * 100;

    currentTime.textContent =
        formatTime(audio.currentTime);
});


audio.addEventListener("ended", async () => {

    if (repeat) {
        audio.currentTime = 0;
        audio.play();
        return;
    }

    await nextSong(true);
});


/* =========================================================
   TIME
   ========================================================= */

function formatTime(seconds) {
    if (!Number.isFinite(seconds)) {
        return "0:00";
    }

    const minutes =
        Math.floor(seconds / 60);

    const secondsPart =
        Math.floor(seconds % 60)
            .toString()
            .padStart(2, "0");

    return minutes + ":" + secondsPart;
}


/* =========================================================
   PROGRESS
   ========================================================= */

if (progressBar) {
    progressBar.addEventListener("input", () => {

        if (!audio.duration) return;

        audio.currentTime =
            (progressBar.value / 100) *
            audio.duration;
    });
}


/* =========================================================
   VOLUME
   ========================================================= */

if (volume) {
    volume.addEventListener("input", () => {
        audio.volume = volume.value;
        updateVolumeIcon();
    });
}

audio.volume = 0.8;


function updateVolumeIcon() {

    const icon =
        document.getElementById("volumeIcon");

    if (!icon) return;

    if (audio.volume === 0) {
        icon.textContent = "🔇";
    } else if (audio.volume < 0.5) {
        icon.textContent = "🔉";
    } else {
        icon.textContent = "🔊";
    }
}


/* =========================================================
   QUEUE
   ========================================================= */

async function queueCard(button) {

    const data = getSongData(button);

    if (!data) return;

    try {

        const response = await fetch(
            "/add-to-queue",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    song: data.song,
                    artist: data.artist
                })
            }
        );

        const result = await response.json();

        if (result.success) {

            showToast(
                data.song + " added to queue ♫"
            );

            await loadQueue();

        } else {

            showToast(
                result.message ||
                "Couldn't add song."
            );
        }

    } catch (error) {

        console.error(error);

        showToast(
            "Server connection error."
        );
    }
}


/* =========================================================
   LOAD QUEUE
   ========================================================= */

async function loadQueue() {

    try {

        const response =
            await fetch("/queue");

        const result =
            await response.json();

        const queue =
            result.queue || [];

        if (queueStatus) {

            queueStatus.textContent =
                queue.length +
                (
                    queue.length === 1
                        ? " song waiting"
                        : " songs waiting"
                );
        }

        if (!queueBox) return;

        if (queue.length === 0) {

            queueBox.innerHTML = `
                <div class="empty-box">

                    <div class="empty-icon">≋</div>

                    <b>Your queue is empty</b>

                    <small>
                        Add songs above and they'll appear here.
                    </small>

                </div>
            `;

            return;
        }

        queueBox.innerHTML =
            queue.map(
                (song, index) => `
                    <div class="queue-song">

                        <div class="queue-number">
                            ${String(index + 1).padStart(2, "0")}
                        </div>

                        <div>
                            <b>
                                ${escapeHtml(song.song)}
                            </b>

                            <small>
                                ${escapeHtml(song.artist)}
                            </small>
                        </div>

                        <div class="queue-wave">
                            <i></i>
                            <i></i>
                            <i></i>
                            <i></i>
                        </div>

                    </div>
                `
            ).join("");

    } catch (error) {

        console.error("Queue error:", error);
    }
}


/* =========================================================
   NEXT SONG
   ========================================================= */

async function nextSong(auto = false) {

    try {

        const response =
            await fetch(
                "/play-next",
                {
                    method: "POST"
                }
            );

        const result =
            await response.json();

        if (!result.success) {

            await loadQueue();

            if (!auto) {
                showToast("Your queue is empty.");
            }

            return;
        }

        const queuedSong =
            result.song;

        const cards =
            document.querySelectorAll(".song-card");

        let matchingCard = null;

        cards.forEach(card => {

            if (
                card.dataset.song ===
                queuedSong.song
            ) {
                matchingCard = card;
            }
        });

        if (!matchingCard) {

            await loadQueue();

            showToast("Song card not found.");

            return;
        }

        playSong({
            card: matchingCard,
            song: queuedSong.song,
            artist: queuedSong.artist,
            file: matchingCard.dataset.file,
            image: matchingCard.dataset.image
        });

        await loadQueue();

    } catch (error) {

        console.error(error);

        showToast(
            "Could not play next song."
        );
    }
}


/* =========================================================
   PREVIOUS
   ========================================================= */

function previousSong() {

    const cards = [
        ...document.querySelectorAll(".song-card")
    ];

    if (!cards.length) return;

    if (!currentData) {

        playCard(
            cards[0].querySelector(".poster-play")
        );

        return;
    }

    const index =
        cards.findIndex(
            card =>
                card.dataset.song ===
                currentData.song
        );

    const previous =
        cards[
            (index - 1 + cards.length) %
            cards.length
        ];

    playCard(
        previous.querySelector(".poster-play")
    );
}


/* =========================================================
   SHUFFLE
   ========================================================= */

function shuffle() {

    const cards = [
        ...document.querySelectorAll(".song-card")
    ];

    if (!cards.length) return;

    const random =
        Math.floor(
            Math.random() * cards.length
        );

    playCard(
        cards[random].querySelector(".poster-play")
    );
}


/* =========================================================
   REPEAT
   ========================================================= */

function repeatSong() {

    repeat = !repeat;

    const button =
        document.getElementById("repeatButton");

    if (!button) return;

    if (repeat) {

        button.style.color = "#a18aff";

        showToast("Repeat ON 🔁");

    } else {

        button.style.color = "";

        showToast("Repeat OFF");
    }
}


/* =========================================================
   FAVORITES
   ========================================================= */

function isFavorite(songName) {

    return favorites.some(
        song => song.song === songName
    );
}


function saveFavorites() {

    localStorage.setItem(
        "vibequeueFavorites",
        JSON.stringify(favorites)
    );
}


function favoriteSong(button) {

    const data =
        getSongData(button);

    if (!data) return;

    const existingIndex =
        favorites.findIndex(
            song =>
                song.song === data.song
        );

    if (existingIndex !== -1) {

        favorites.splice(
            existingIndex,
            1
        );

        button.classList.remove("liked");
        button.textContent = "♡";

        saveFavorites();
        renderFavorites();

        showToast(
            "Removed from favorites"
        );

        return;
    }

    favorites.push({
        song: data.song,
        artist: data.artist,
        image: data.image,
        file: data.file
    });

    button.classList.add("liked");
    button.textContent = "♥";

    button.classList.add("heart-pop");

    setTimeout(() => {
        button.classList.remove("heart-pop");
    }, 450);

    saveFavorites();
    renderFavorites();

    showToast(
        "Added to favorites ❤️"
    );
}


/* =========================================================
   RENDER FAVORITES
   ========================================================= */

function renderFavorites() {

    if (!favoritesBox) return;

    if (favorites.length === 0) {

        favoritesBox.innerHTML = `
            <div class="empty-icon">♡</div>

            <b>No favorite songs yet</b>

            <small>
                Tap ♡ on a song to add it here.
            </small>
        `;

        return;
    }

    favoritesBox.innerHTML = `
        <div
            style="
                width:100%;
                padding:10px 15px;
            "
        >

            ${favorites.map(
                (song, index) => `
                    <div
                        style="
                            display:flex;
                            align-items:center;
                            gap:12px;
                            padding:10px;
                            margin-bottom:8px;
                            border-radius:12px;
                            background:#15161f;
                            border:1px solid #252a36;
                            text-align:left;
                        "
                    >

                        <img
                            src="${getSongImageUrl(song)}"
                            alt="${escapeHtml(song.song)}"
                            style="
                                width:50px;
                                height:50px;
                                object-fit:cover;
                                border-radius:10px;
                                flex-shrink:0;
                            "
                        >

                        <div
                            style="
                                flex:1;
                                min-width:0;
                            "
                        >

                            <b
                                style="
                                    display:block;
                                    color:#fff;
                                    font-size:13px;
                                "
                            >
                                ${escapeHtml(song.song)}
                            </b>

                            <small
                                style="
                                    display:block;
                                    color:#777e8e;
                                    margin-top:4px;
                                "
                            >
                                ${escapeHtml(song.artist)}
                            </small>

                        </div>

                        <button
                            onclick="playFavorite(${index})"
                            style="
                                border:0;
                                width:36px;
                                height:36px;
                                border-radius:50%;
                                background:white;
                                color:#08080d;
                                cursor:pointer;
                                flex-shrink:0;
                            "
                        >
                            ▶
                        </button>

                        <button
                            onclick="removeFavorite(${index})"
                            style="
                                border:0;
                                width:36px;
                                height:36px;
                                border-radius:50%;
                                background:#ff5c8a;
                                color:white;
                                cursor:pointer;
                                flex-shrink:0;
                            "
                        >
                            ♥
                        </button>

                    </div>
                `
            ).join("")}

        </div>
    `;
}


/* =========================================================
   PLAY FAVORITE
   ========================================================= */

function playFavorite(index) {

    const song =
        favorites[index];

    if (!song) return;

    const cards =
        document.querySelectorAll(
            ".song-card"
        );

    let matchingCard = null;

    cards.forEach(card => {

        if (
            card.dataset.song ===
            song.song
        ) {
            matchingCard = card;
        }
    });

    playSong({
        card: matchingCard,
        song: song.song,
        artist: song.artist,
        file: song.file,
        image: song.image
    });
}


/* =========================================================
   REMOVE FAVORITE
   ========================================================= */

function removeFavorite(index) {

    const song =
        favorites[index];

    if (!song) return;

    favorites.splice(index, 1);

    saveFavorites();
    renderFavorites();

    document
        .querySelectorAll(".song-card")
        .forEach(card => {

            if (
                card.dataset.song ===
                song.song
            ) {

                const heart =
                    card.querySelector(".heart");

                if (heart) {

                    heart.classList.remove(
                        "liked"
                    );

                    heart.textContent = "♡";
                }
            }
        });

    showToast(
        "Removed from favorites"
    );
}


/* =========================================================
   RESTORE HEARTS
   ========================================================= */

function restoreFavoriteHearts() {

    document
        .querySelectorAll(".song-card")
        .forEach(card => {

            const heart =
                card.querySelector(".heart");

            if (
                heart &&
                isFavorite(card.dataset.song)
            ) {

                heart.classList.add("liked");
                heart.textContent = "♥";
            }
        });
}


/* =========================================================
   CLEAR QUEUE
   ========================================================= */

async function clearQueue() {

    const yes =
        confirm(
            "Empty your entire music queue?"
        );

    if (!yes) return;

    try {

        const response =
            await fetch(
                "/clear-queue",
                {
                    method: "POST"
                }
            );

        const result =
            await response.json();

        if (result.success) {

            await loadQueue();

            showToast(
                "Vibe cleared 🫧"
            );
        }

    } catch (error) {

        console.error(error);

        showToast(
            "Could not clear queue."
        );
    }
}


/* =========================================================
   SEARCH
   ========================================================= */

const vqSearchInput = document.getElementById("vqSearchInput");
const searchBtn = document.getElementById("searchBtn");
let currentSearchQuery = "";
let isSearching = false;

async function performSearch() {
    const vqSearchInput = document.getElementById("vqSearchInput");
    if (!vqSearchInput) return;

    const text = vqSearchInput.value.trim();
    
    if (text.length === 0) {
        return;
    }

    // Prevent duplicate requests for the same query or concurrent searches
    if (text === currentSearchQuery || isSearching) {
        window.location.hash = "songs";
        return;
    }

    isSearching = true;
    currentSearchQuery = text;

    const grid = document.querySelector('.song-grid');
    const songCount = document.getElementById("songCount");
    
    // Show loading state
    if (grid) grid.innerHTML = '<div style="color: #8f8290; padding: 20px;">Searching...</div>';
    if (songCount) songCount.textContent = "Searching...";

    try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(text)}`);
        const data = await res.json();
        
        if (data.success && data.results && data.results.length > 0) {
            if (grid) grid.innerHTML = ''; // clear loading
            
            data.results.forEach(item => {
                const card = document.createElement('div');
                card.className = 'song-card';
                card.dataset.song = item.title;
                card.dataset.artist = item.artist;
                card.dataset.file = item.preview;
                card.dataset.image = item.cover;
                
                card.innerHTML = `
                    <div class="poster">
                        <img src="${item.cover}" alt="${item.title}">
                        <div class="poster-gradient"></div>
                        <button type="button" class="heart" onclick="favoriteSong(this)">♡</button>
                        <button type="button" class="poster-play" onclick="playCard(this)">▶</button>
                    </div>
                    <div class="song-info">
                        <h3>${item.title}</h3>
                        <p>${item.artist}</p>
                    </div>
                    <div class="card-buttons">
                        <button type="button" onclick="playCard(this)">▶ Play</button>
                        <button type="button" onclick="queueCard(this)">＋ Queue</button>
                        <button type="button" class="playlist-button" title="Add to My Playlist">＋ Playlist</button>
                    </div>
                `;
                if (grid) grid.appendChild(card);
            });
            
            if (songCount) {
                songCount.textContent = data.results.length + (data.results.length === 1 ? " song" : " songs");
            }
        } else {
            if (grid) grid.innerHTML = '<div style="color: #ff5ca8; padding: 20px;">No results found.</div>';
            if (songCount) songCount.textContent = "0 songs";
        }
        
        // Switch to the Search results view after search is complete
        window.location.hash = "songs";
        
    } catch (error) {
        console.error("Search error", error);
        if (grid) grid.innerHTML = '<div style="color: #ff5ca8; padding: 20px;">Error searching.</div>';
        if (songCount) songCount.textContent = "0 songs";
    } finally {
        isSearching = false;
    }
}

if (vqSearchInput) {
    vqSearchInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
            performSearch();
        }
    });
}

if (searchBtn) {
    searchBtn.addEventListener("click", performSearch);
}


/* =========================================================
   CREATE LIBRARY MODAL
   ========================================================= */

function createLibraryModal() {

    if (
        document.getElementById(
            "libraryOverlay"
        )
    ) return;

    const overlay =
        document.createElement("div");

    overlay.id =
        "libraryOverlay";

    overlay.className =
        "library-overlay";

    overlay.innerHTML = `

        <div class="library-modal">

            <div class="library-modal-header">

                <div>
                    <h3 id="libraryModalTitle">
                        Your Library
                    </h3>

                    <small id="libraryModalSubtitle">
                        Your music collection
                    </small>
                </div>

                <button
                    type="button"
                    class="library-close"
                    onclick="closeLibrary()"
                >
                    ×
                </button>

            </div>

            <div
                class="library-modal-body"
                id="libraryModalBody"
            ></div>

        </div>
    `;

    overlay.addEventListener(
        "click",
        event => {

            if (
                event.target === overlay
            ) {
                closeLibrary();
            }
        }
    );

    document.body.appendChild(overlay);
}


/* =========================================================
   OPEN LIBRARY
   ========================================================= */

function openLibrary(type) {
    if (type === "playlist") {
        closeLibrary();
        openBackendPlaylist('My Playlist');
        return;
    }
    if (type === "liked") {
        closeLibrary();
        openBackendPlaylist('Liked Songs');
        return;
    }

    createLibraryModal();

    const overlay = document.getElementById("libraryOverlay");
    const title = document.getElementById("libraryModalTitle");
    const subtitle = document.getElementById("libraryModalSubtitle");

    if (!overlay) return;

    overlay.classList.add("show");
    document.body.classList.add("library-open");

    if (!type) {
        title.textContent = "Your Library";
        subtitle.textContent = "Your music collection";
        renderLibraryHome();
        return;
    }

    if (type === "recent") {
        title.textContent = "🕘 Recently Played";
        subtitle.textContent = recentlyPlayed.length + " recently played";
        renderRecentlyPlayedModal();
        return;
    }
}


/* =========================================================
   LIBRARY HOME
   ========================================================= */

function renderLibraryHome() {

    const body =
        document.getElementById(
            "libraryModalBody"
        );

    if (!body) return;

    body.innerHTML = `

        <div class="library-home">

            <button
                type="button"
                class="library-choice"
                onclick="openLibrary('playlist')"
            >

                <div class="library-choice-icon">
                    🎵
                </div>

                <div class="library-choice-text">
                    <b>My Playlist</b>

                    <small>
                        ${myPlaylist.length}
                        ${myPlaylist.length === 1 ? "song" : "songs"}
                    </small>
                </div>

                <span class="library-arrow">›</span>

            </button>


            <button
                type="button"
                class="library-choice"
                onclick="openLibrary('recent')"
            >

                <div class="library-choice-icon">
                    🕒
                </div>

                <div class="library-choice-text">
                    <b>Recently Played</b>

                    <small>
                        ${recentlyPlayed.length}
                        recently played
                    </small>
                </div>

                <span class="library-arrow">›</span>

            </button>


            <button
                type="button"
                class="library-choice"
                onclick="openLibrary('liked')"
            >

                <div class="library-choice-icon">
                    💖
                </div>

                <div class="library-choice-text">
                    <b>Liked Songs</b>

                    <small>
                        ${favorites.length}
                        ${favorites.length === 1 ? "favorite" : "favorites"}
                    </small>
                </div>

                <span class="library-arrow">›</span>

            </button>

        </div>
    `;
}


/* =========================================================
   CLOSE LIBRARY
   ========================================================= */

function closeLibrary() {

    const overlay =
        document.getElementById(
            "libraryOverlay"
        );

    if (overlay) {
        overlay.classList.remove("show");
    }

    document.body.classList.remove(
        "library-open"
    );
}


/* =========================================================
   RECENTLY PLAYED MODAL
   ========================================================= */

function renderRecentlyPlayedModal() {

    const body =
        document.getElementById(
            "libraryModalBody"
        );

    if (!body) return;

    if (recentlyPlayed.length === 0) {

        body.innerHTML = `

            <div class="library-empty">

                <div>🕘</div>

                <b>
                    Nothing played yet
                </b>

                <p>
                    Songs you play will appear here.
                </p>

            </div>
        `;

        return;
    }

    body.innerHTML =
        recentlyPlayed.map(
            (song, index) => `

                <div class="library-song">

                    <img
                        src="${getSongImageUrl(song)}"
                        alt="${escapeHtml(song.song)}"
                    >

                    <div class="library-song-info">

                        <b>
                            ${escapeHtml(song.song)}
                        </b>

                        <small>
                            ${escapeHtml(song.artist)}
                        </small>

                    </div>

                    <button
                        type="button"
                        class="library-play"
                        onclick="playRecentlyPlayed(${index})"
                    >
                        ▶
                    </button>

                    <button
                        type="button"
                        class="library-remove"
                        onclick="removeRecentlyPlayed(${index})"
                    >
                        🗑
                    </button>

                </div>
            `
        ).join("");
}


/* =========================================================
   PLAY RECENT
   ========================================================= */

function playRecentlyPlayed(index) {

    const song =
        recentlyPlayed[index];

    if (!song) return;

    closeLibrary();

    const cards =
        document.querySelectorAll(
            ".song-card"
        );

    let card = null;

    cards.forEach(item => {

        if (
            item.dataset.song ===
            song.song
        ) {
            card = item;
        }
    });

    playSong({
        card: card,
        song: song.song,
        artist: song.artist,
        file: song.file,
        image: song.image
    });
}


/* =========================================================
   PLAYLIST
   ========================================================= */

function savePlaylist() {

    localStorage.setItem(
        "vibequeuePlaylist",
        JSON.stringify(myPlaylist)
    );
}


function addToPlaylist(data) {

    if (!data) return;

    const exists =
        myPlaylist.some(
            song =>
                song.song === data.song
        );

    if (exists) {

        showToast(
            "Already in My Playlist 🎵"
        );

        return;
    }

    myPlaylist.push({
        song: data.song,
        artist: data.artist,
        file: data.file,
        image: data.image
    });

    savePlaylist();

    showToast(
        data.song +
        " added to My Playlist 🎵"
    );
}


function removeFromPlaylist(index) {

    if (!myPlaylist[index]) return;

    myPlaylist.splice(index, 1);

    savePlaylist();

    showToast(
        "Removed from My Playlist"
    );

    const subtitle =
        document.getElementById(
            "libraryModalSubtitle"
        );

    if (subtitle) {

        subtitle.textContent =
            myPlaylist.length +
            (
                myPlaylist.length === 1
                    ? " song"
                    : " songs"
            );
    }

    renderPlaylistModal();
}


/* =========================================================
   PLAYLIST MODAL
   ========================================================= */

function renderPlaylistModal() {

    const body =
        document.getElementById(
            "libraryModalBody"
        );

    if (!body) return;

    if (myPlaylist.length === 0) {

        body.innerHTML = `

            <div class="library-empty">

                <div>🎵</div>

                <b>
                    Your playlist is empty
                </b>

                <p>
                    Press the + Playlist button
                    on a song to add it here.
                </p>

            </div>
        `;

        return;
    }

    body.innerHTML =
        myPlaylist.map(
            (song, index) => `

                <div class="library-song">

                    <img
                        src="${getSongImageUrl(song)}"
                        alt="${escapeHtml(song.song)}"
                    >

                    <div class="library-song-info">

                        <b>
                            ${escapeHtml(song.song)}
                        </b>

                        <small>
                            ${escapeHtml(song.artist)}
                        </small>

                    </div>

                    <button
                        type="button"
                        class="library-play"
                        onclick="playPlaylistSong(${index})"
                    >
                        ▶
                    </button>

                    <button
                        type="button"
                        class="library-remove"
                        onclick="removeFromPlaylist(${index})"
                    >
                        🗑
                    </button>

                </div>
            `
        ).join("");
}


/* =========================================================
   PLAY PLAYLIST SONG
   ========================================================= */

function playPlaylistSong(index) {

    const song =
        myPlaylist[index];

    if (!song) return;

    closeLibrary();

    const cards =
        document.querySelectorAll(
            ".song-card"
        );

    let card = null;

    cards.forEach(item => {

        if (
            item.dataset.song ===
            song.song
        ) {
            card = item;
        }
    });

    playSong({
        card: card,
        song: song.song,
        artist: song.artist,
        file: song.file,
        image: song.image
    });
}


/* =========================================================
   CREATE PLAYLIST
   ========================================================= */

function createPlaylist() {
    openLibrary("playlist");
}


/* =========================================================
   SIDEBAR LIBRARY
   ========================================================= */

function setupLibraryClicks() {
}


/* =========================================================
   FAVORITES LIBRARY
   ========================================================= */

function renderFavoritesModal() {

    const body =
        document.getElementById(
            "libraryModalBody"
        );

    if (!body) return;

    if (favorites.length === 0) {

        body.innerHTML = `

            <div class="library-empty">

                <div>♡</div>

                <b>
                    No liked songs yet
                </b>

                <p>
                    Tap the heart on a song to save it.
                </p>

            </div>
        `;

        return;
    }

    body.innerHTML =
        favorites.map(
            (song, index) => `

                <div class="library-song">

                    <img
                        src="${getSongImageUrl(song)}"
                        alt="${escapeHtml(song.song)}"
                    >

                    <div class="library-song-info">

                        <b>
                            ${escapeHtml(song.song)}
                        </b>

                        <small>
                            ${escapeHtml(song.artist)}
                        </small>

                    </div>

                    <button
                        type="button"
                        class="library-play"
                        onclick="playFavoriteFromLibrary(${index})"
                    >
                        ▶
                    </button>

                    <button
                        type="button"
                        class="library-remove"
                        onclick="removeFavoriteFromLibrary(${index})"
                    >
                        🗑
                    </button>

                </div>
            `
        ).join("");
}


function removeFavoriteFromLibrary(index) {

    if (!favorites[index]) return;

    const song = favorites[index];

    favorites.splice(index, 1);

    saveFavorites();

    renderFavoritesModal();

    document
        .querySelectorAll(".song-card")
        .forEach(card => {

            if (
                card.dataset.song ===
                song.song
            ) {

                const heart =
                    card.querySelector(".heart");

                if (heart) {

                    heart.classList.remove("liked");
                    heart.textContent = "♡";
                }
            }
        });

    showToast(
        "Removed from Liked Songs"
    );
}


function playFavoriteFromLibrary(index) {

    const song = favorites[index];

    if (!song) return;

    closeLibrary();

    playFavorite(index);
}


/* =========================================================
   PLAYLIST BUTTON
   =========================================================
   ONLY the real playlist button adds a song.
   Double click does NOTHING.
   ========================================================= */

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                ".playlist-button"
            );

        if (!button) return;

        const card =
            button.closest(".song-card");

        if (!card) return;

        event.preventDefault();
        event.stopPropagation();

        addToPlaylist({
            song: card.dataset.song,
            artist: card.dataset.artist,
            file: card.dataset.file,
            image: card.dataset.image
        });
    }
);


/* =========================================================
   DOUBLE CLICK — DO NOTHING
   ========================================================= */

document.addEventListener(
    "dblclick",
    event => {

        const card =
            event.target.closest(".song-card");

        if (!card) return;

        /* Intentionally empty */
    }
);


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function escapeHtml(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   FINAL MOBILE LIBRARY FIX
   ========================================================= */

function applyMobileLibraryFix() {

    if (
        document.getElementById(
            "vibequeueFinalLibraryFix"
        )
    ) return;

    const style =
        document.createElement("style");

    style.id =
        "vibequeueFinalLibraryFix";

    style.textContent = `

        /* Library popup */

        #libraryOverlay {
            position: fixed !important;
            inset: 0 !important;
            width: 100% !important;
            height: 100dvh !important;
            max-height: 100dvh !important;
            overflow: hidden !important;
            z-index: 99999 !important;
            box-sizing: border-box !important;
        }

        #libraryOverlay .library-modal {
            max-height: calc(100dvh - 24px) !important;
            height: auto !important;
            min-height: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            overflow: hidden !important;
        }

        #libraryOverlay .library-modal-header {
            flex-shrink: 0 !important;
        }

        #libraryOverlay .library-modal-body {
            flex: 1 1 auto !important;
            min-height: 0 !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            -webkit-overflow-scrolling: touch !important;
            padding-bottom: 35px !important;
        }

        /* Library home cards */

        #libraryOverlay .library-home {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 12px !important;
            width: 100% !important;
            box-sizing: border-box !important;
            padding: 5px 2px 30px !important;
        }

        #libraryOverlay .library-choice {
            width: 100% !important;
            min-height: 100px !important;
            display: flex !important;
            align-items: center !important;
            gap: 10px !important;
            padding: 15px !important;
            box-sizing: border-box !important;
            border-radius: 17px !important;
            cursor: pointer !important;
        }

        #libraryOverlay .library-choice-icon {
            width: 43px !important;
            height: 43px !important;
            min-width: 43px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            border-radius: 13px !important;
            flex-shrink: 0 !important;
        }

        #libraryOverlay .library-choice-text {
            flex: 1 !important;
            min-width: 0 !important;
        }

        #libraryOverlay .library-choice-text b {
            display: block !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
        }

        #libraryOverlay .library-choice-text small {
            display: block !important;
            margin-top: 5px !important;
        }

        #libraryOverlay .library-arrow {
            flex-shrink: 0 !important;
        }

        /* Third card stays on left */

        #libraryOverlay .library-choice:nth-child(3) {
            grid-column: 1 / 2 !important;
        }

        /* Library songs */

        #libraryOverlay .library-song {
            flex-shrink: 0 !important;
        }

        #libraryOverlay .library-play,
        #libraryOverlay .library-remove {
            flex-shrink: 0 !important;
        }

        @media (max-width: 600px) {

            #libraryOverlay {
                padding: 12px !important;
            }

            #libraryOverlay .library-modal {
                width: 100% !important;
                max-width: 100% !important;
                max-height: calc(100dvh - 24px) !important;
                border-radius: 20px !important;
            }

            #libraryOverlay .library-home {
                grid-template-columns:
                    repeat(2, minmax(0, 1fr)) !important;
                gap: 9px !important;
                padding-bottom: 40px !important;
            }

            #libraryOverlay .library-choice {
                min-height: 92px !important;
                padding: 11px !important;
                gap: 8px !important;
                border-radius: 15px !important;
            }

            #libraryOverlay .library-choice-icon {
                width: 37px !important;
                height: 37px !important;
                min-width: 37px !important;
                font-size: 18px !important;
            }

            #libraryOverlay .library-choice-text b {
                font-size: 12px !important;
            }

            #libraryOverlay .library-choice-text small {
                font-size: 9px !important;
            }

            #libraryOverlay .library-arrow {
                font-size: 20px !important;
            }
        }

        @media (max-width: 380px) {

            #libraryOverlay .library-home {
                gap: 7px !important;
            }

            #libraryOverlay .library-choice {
                min-height: 86px !important;
                padding: 9px !important;
            }

            #libraryOverlay .library-choice-icon {
                width: 34px !important;
                height: 34px !important;
                min-width: 34px !important;
                font-size: 16px !important;
            }

            #libraryOverlay .library-choice-text b {
                font-size: 10px !important;
            }

            #libraryOverlay .library-choice-text small {
                font-size: 8px !important;
            }

            #libraryOverlay .library-arrow {
                display: none !important;
            }
        }
    `;

    document.head.appendChild(style);
}


/* =========================================================
   INITIALIZE
   ========================================================= */

applyMobileLibraryFix();

renderFavorites();

restoreFavoriteHearts();

setupLibraryClicks();

loadQueue();

updateVolumeIcon();

/* =========================================================
   AUTHENTICATION LOGIC
   ========================================================= */

function openAuthModal() {
    document.getElementById('authModal').classList.add('show');
}

function closeAuthModal() {
    document.getElementById('authModal').classList.remove('show');
    resetAuth();
}

function resetAuth() {
    document.getElementById('authEmailSection').style.display = 'block';
    document.getElementById('authOtpSection').style.display = 'none';
    document.getElementById('authSetPasswordSection').style.display = 'none';
    document.getElementById('authLoginPasswordSection').style.display = 'none';
    document.getElementById('authEmail').value = '';
    document.getElementById('authOtp').value = '';
    document.getElementById('authSetPassword').value = '';
    document.getElementById('authLoginPassword').value = '';
}

async function checkEmail() {
    const email = document.getElementById('authEmail').value;
    if (!email) { showToast('Please enter an email'); return; }
    
    const btn = document.querySelector('#authEmailSection .auth-btn');
    if (btn) { btn.textContent = 'Checking...'; btn.disabled = true; }
    
    try {
        const res = await fetch('/auth/check-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('authEmailDisplay').textContent = email;
            if (data.method === 'password') {
                document.getElementById('authEmailSection').style.display = 'none';
                document.getElementById('authLoginPasswordSection').style.display = 'block';
                if (btn) { btn.textContent = 'Continue'; btn.disabled = false; }
            } else {
                // Fetch OTP before hiding email section to prevent empty modal
                await requestOtp(email, btn);
            }
        } else {
            showToast(data.message || 'Error checking email');
            if (btn) { btn.textContent = 'Continue'; btn.disabled = false; }
        }
    } catch (e) { 
        showToast('Network error'); 
        if (btn) { btn.textContent = 'Continue'; btn.disabled = false; }
    }
}

async function requestOtp(email, btn = null) {
    if (btn) { btn.textContent = 'Sending Code...'; btn.disabled = true; }
    
    try {
        const res = await fetch('/auth/request-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        let data;
        try {
            data = await res.json();
        } catch (parseErr) {
            data = { success: false, message: 'Server returned an invalid response.' };
        }
        
        if (res.ok && data.success) {
            document.getElementById('authEmailSection').style.display = 'none';
            document.getElementById('authOtpSection').style.display = 'block';
            showToast('OTP sent successfully');
        } else {
            showToast(data.message || 'Unable to send OTP. Please try again.');
        }
    } catch (e) { 
        showToast('Network error while requesting OTP.'); 
    } finally {
        if (btn) { btn.textContent = 'Continue'; btn.disabled = false; }
    }
}

async function verifyOtp() {
    const email = document.getElementById('authEmailDisplay').textContent;
    const code = document.getElementById('authOtp').value;
    if (!code || code.length !== 6) { showToast('Enter valid 6-digit OTP'); return; }
    try {
        const res = await fetch('/auth/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code })
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('authOtpSection').style.display = 'none';
            document.getElementById('authSetPasswordSection').style.display = 'block';
            showToast('OTP verified. Set your password.');
        } else {
            showToast(data.message || 'Invalid OTP');
        }
    } catch (e) { showToast('Network error'); }
}

async function setPassword() {
    const password = document.getElementById('authSetPassword').value;
    if (!password || password.length < 4) { showToast('Password must be at least 4 characters'); return; }
    try {
        const res = await fetch('/auth/set-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        const data = await res.json();
        if (data.success) {
            showToast('Logged in successfully!');
            setTimeout(() => location.reload(), 1000);
        } else {
            showToast(data.message || 'Error setting password');
        }
    } catch (e) { showToast('Network error'); }
}

async function loginPassword() {
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authLoginPassword').value;
    if (!password) { showToast('Enter your password'); return; }
    try {
        const res = await fetch('/auth/login-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.success) {
            showToast('Logged in successfully!');
            setTimeout(() => location.reload(), 1000);
        } else {
            showToast(data.message || 'Invalid credentials');
        }
    } catch (e) { showToast('Network error'); }
}

async function forgotPassword() {
    const email = document.getElementById('authEmail').value;
    document.getElementById('authLoginPasswordSection').style.display = 'none';
    requestOtp(email);
}

async function logout() {
    try {
        await fetch('/auth/logout', { method: 'POST' });
        showToast('Logged out');
        setTimeout(() => location.reload(), 1000);
    } catch (e) {
        showToast('Network error');
    }
}

function toggleProfileMenu() {
    const dropdown = document.querySelector('.profile-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('open');
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const dropdown = document.querySelector('.profile-dropdown');
    if (dropdown && !dropdown.contains(event.target)) {
        dropdown.classList.remove('open');
    }
});

/* =========================================================
   THEME LOGIC
   ========================================================= */

function toggleTheme() {
    const isLightMode = document.body.classList.toggle('light-mode');
    localStorage.setItem('vibequeueTheme', isLightMode ? 'light' : 'dark');
    updateThemeIcon(isLightMode);
}

function updateThemeIcon(isLightMode) {
    const icon = document.getElementById('themeIcon');
    if (icon) {
        icon.textContent = isLightMode ? '🌙' : '☀️';
    }
}

// Initialize theme
(function initTheme() {
    const savedTheme = localStorage.getItem('vibequeueTheme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        updateThemeIcon(true);
    } else {
        updateThemeIcon(false);
    }
})();


// =========================================================
// NEW FEATURES: MOOD, BLEND, PROFILE, PLAYLIST CRUD
// =========================================================

let currentPlaylistId = null;

// Routing Helper
function switchView(viewId) {
    const views = ["home", "songs", "playlist-view", "favorites", "queue", "aivibe"];
    views.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
    });
    const target = document.getElementById(viewId);
    if (target) target.style.display = "block";
    
    // Hide Save Button on AI Vibe page
    const saveBtn = document.getElementById("saveBtn");
    if (saveBtn) {
        saveBtn.style.display = viewId === "aivibe" ? "none" : "block";
    }
}

window.addEventListener("hashchange", function() {
    const hash = window.location.hash.substring(1);
    if (hash === "home" || hash === "songs" || hash === "favorites" || hash === "queue" || hash === "aivibe") {
        switchView(hash);
        
        // Update active nav state
        document.querySelectorAll(".nav-item").forEach(item => {
            if (item.getAttribute("href") === "#" + hash) {
                item.classList.add("active");
            } else if (item.getAttribute("href").startsWith("#")) {
                item.classList.remove("active");
            }
        });
    }
});

// 1. MOOD PREDICTOR
async function predictMood() {
    const moodInput = document.getElementById("moodInput").value.trim();
    if (!moodInput) return showToast("Please enter a mood");
    
    switchView("songs");
    document.getElementById("songs-grid").innerHTML = "<div class='empty-box'>Searching vibes...</div>";
    
    try {
        const res = await fetch(`/api/mood?mood=${encodeURIComponent(moodInput)}`);
        const data = await res.json();
        
        if (data.success) {
            currentSongs = data.results;
            if (currentSongs.length === 0) {
                document.getElementById("songs-grid").innerHTML = "<div class='empty-box'>No songs found for this vibe.</div>";
                return;
            }
            renderSongs(currentSongs);
        } else {
            showToast("Error predicting mood");
        }
    } catch (e) {
        showToast("Error connecting to server");
    }
}

// 2. PLAYLIST CRUD (Backend connected)

const appState = {
    playlists: [],
    likedSongs: [],
    blends: [],
    likedPlaylistObj: null,
    currentUser: null
};

async function refreshUserMusicState() {
    try {
        const res = await fetch("/api/playlists");
        const data = await res.json();
        if (data.success) {
            appState.playlists = [];
            appState.blends = [];
            appState.likedSongs = [];
            appState.likedPlaylistObj = null;
            
            data.playlists.forEach(p => {
                if (p.is_blend) {
                    appState.blends.push(p);
                } else if (p.name === "Liked Songs") {
                    appState.likedSongs = p.songs || [];
                    appState.likedPlaylistObj = p;
                } else {
                    appState.playlists.push(p);
                }
            });
            
            // Trigger UI updates
            renderSidebarPlaylists();
        }
    } catch(e) {
        console.error("Error refreshing state", e);
    }
}

function renderSidebarPlaylists() {
    // Update existing Sidebar playlist count
    const myPlaylistObj = appState.playlists.find(p => p.name === "My Playlist");
    if (myPlaylistObj) {
        // Find the small tag inside the sidebar's .playlist-card
        const pCard = document.querySelector('.sidebar .playlist-card small');
        if (pCard) {
            pCard.innerText = `${myPlaylistObj.songs.length} songs`;
        }
        const pIcon = document.querySelector('.sidebar .playlist-card .library-card-icon');
        if (pIcon) {
            if (myPlaylistObj.songs.length > 0) {
                pIcon.innerHTML = `<img src="${getSongImageUrl(myPlaylistObj.songs[0])}" style="width:100%;height:100%;object-fit:cover;" alt="thumb">`;
                pIcon.style.padding = '0';
                pIcon.style.background = 'transparent';
            } else {
                pIcon.innerHTML = `🎵`;
            }
        }
    }
    
    // Update Liked Songs in Sidebar
    const likedSidebarCard = document.querySelector('.sidebar .liked-card small');
    if (likedSidebarCard) {
        likedSidebarCard.innerText = `${appState.likedSongs.length} songs`;
    }
    const likedIcon = document.querySelector('.sidebar .liked-card .library-card-icon');
    if (likedIcon) {
        if (appState.likedSongs.length > 0) {
            likedIcon.innerHTML = `<img src="${getSongImageUrl(appState.likedSongs[0])}" style="width:100%;height:100%;object-fit:cover;" alt="thumb">`;
            likedIcon.style.padding = '0';
            likedIcon.style.background = 'transparent';
        } else {
            likedIcon.innerHTML = `💖`;
        }
    }
    
    // Update Recently Played in Sidebar
    const recentIcon = document.querySelector('.sidebar .recent-card .library-card-icon');
    if (recentIcon) {
        if (recentlyPlayed && recentlyPlayed.length > 0) {
            recentIcon.innerHTML = `<img src="${getSongImageUrl(recentlyPlayed[0])}" style="width:100%;height:100%;object-fit:cover;" alt="thumb">`;
            recentIcon.style.padding = '0';
            recentIcon.style.background = 'transparent';
        } else {
            recentIcon.innerHTML = `🕒`;
        }
    }
}



// Override fetchUserPlaylists to use appState to avoid breaking existing functions
async function fetchUserPlaylists() {
    return [...appState.playlists, appState.likedPlaylistObj, ...appState.blends].filter(Boolean);
}


async function showPlaylist(playlistId) {
    currentPlaylistId = playlistId;
    const playlists = await fetchUserPlaylists();
    const playlist = playlists.find(p => p._id === playlistId);
    if (!playlist) return showToast("Playlist not found");
    
    switchView("playlist-view");
    document.getElementById("playlistViewTitle").innerText = playlist.name;
    document.getElementById("playlistViewCount").innerText = `${playlist.songs.length} songs`;
    
    const grid = document.getElementById("playlistSongGrid");
    grid.innerHTML = "";
    
    if (playlist.songs.length === 0) {
        grid.innerHTML = "<div class='empty-box'>Playlist is empty.</div>";
        return;
    }
    
    playlist.songs.forEach((song, idx) => {
        const card = document.createElement("div");
        card.className = "song-card";
        const imageSrc = getSongImageUrl(song);
        card.innerHTML = `
            <div class="poster">
                <img src="${imageSrc}" alt="${escapeHtml(song.title)}">
                <div class="poster-gradient"></div>
            </div>
            <div class="song-info">
                <h3>${escapeHtml(song.title)}</h3>
                <p>${escapeHtml(song.artist)}</p>
                <div class="song-actions" style="display: flex; gap: 5px; margin-top: 5px;">
                    <button class="queue-btn" onclick='playPlaylistSongObj(${JSON.stringify(song)})' style="padding: 5px 8px; font-size: 10px;">▶ Play</button>
                    <button class="queue-btn" onclick='queueCardObj(${JSON.stringify(song)})' style="padding: 5px 8px; font-size: 10px;">Queue</button>
                    <button class="queue-btn" onclick='removeSongFromBackendPlaylist("${playlistId}", "${song.id}")' style="padding: 5px 8px; font-size: 10px; background: #ff4757;">Remove</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function playPlaylistSongObj(song) {
    playSong(song);
}
function queueCardObj(song) {
    queueCard({dataset: {song: JSON.stringify(song)}}); // Mock button element
}

async function removeSongFromBackendPlaylist(playlistId, songId) {
    try {
        const res = await fetch(`/api/playlists/${playlistId}/songs/${songId}`, { method: "DELETE" });
        if (res.ok) {
            showToast("Song removed");
            await refreshUserMusicState();
            showPlaylist(playlistId);
        }
    } catch(e) {}
}

function openRenamePlaylistModal() {
    if (!currentPlaylistId) return;
    document.getElementById("renamePlaylistModal").classList.add("show");
}
function closeRenamePlaylistModal() {
    document.getElementById("renamePlaylistModal").classList.remove("show");
}

async function handleRenamePlaylist(e) {
    e.preventDefault();
    if (!currentPlaylistId) return;
    
    const newName = document.getElementById("newPlaylistName").value.trim();
    if (!newName) return;
    
    try {
        const res = await fetch(`/api/playlists/${currentPlaylistId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: newName })
        });
        if (res.ok) {
            showToast("Playlist renamed");
            closeRenamePlaylistModal();
            await refreshUserMusicState();
            showPlaylist(currentPlaylistId);
        }
    } catch(e) {}
}

async function deleteCurrentPlaylist() {
    if (!currentPlaylistId) return;
    if (!confirm("Are you sure you want to delete this playlist?")) return;
    
    try {
        const res = await fetch(`/api/playlists/${currentPlaylistId}`, { method: "DELETE" });
        if (res.ok) {
            showToast("Playlist deleted");
            currentPlaylistId = null;
            await refreshUserMusicState();
            switchView("home");
        }
    } catch(e) {}
}




// 4. BLEND (Song Selection)
function openBlendModal() {
    document.getElementById("blendModal").classList.add("show");
    
    const container = document.getElementById("blendSongsContainer");
    container.innerHTML = "";
    
    // Gather unique songs
    const uniqueSongs = new Map();
    const allPlaylists = [...appState.playlists, appState.likedPlaylistObj, ...appState.blends].filter(Boolean);
    
    allPlaylists.forEach(p => {
        p.songs.forEach(song => {
            const songKey = song.id ?? `${song.title}-${song.artist}`;
            if (!uniqueSongs.has(songKey)) {
                uniqueSongs.set(songKey, song);
            }
        });
    });
    
    const songs = Array.from(uniqueSongs.values());
    
    if (songs.length === 0) {
        container.innerHTML = "<div style='color:var(--text-secondary);'>No songs available. Like some songs first!</div>";
        return;
    }
    
    songs.forEach(song => {
        const div = document.createElement("div");
        div.style.display = "flex";
        div.style.alignItems = "center";
        div.style.marginBottom = "10px";
        div.style.padding = "5px";
        div.style.borderBottom = "1px solid var(--border-subtle)";
        
        div.innerHTML = `
            <input type="checkbox" class="blend-song-checkbox" value='${JSON.stringify(song).replace(/'/g, "&#39;")}' style="margin-right: 15px; transform: scale(1.2);">
            <img src="${song.cover}" style="width: 40px; height: 40px; border-radius: 5px; margin-right: 15px;">
            <div style="flex: 1; overflow: hidden;">
                <b style="color: var(--text-primary); font-size: 13px; display: block; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${escapeHtml(song.title)}</b>
                <small style="color: var(--text-secondary); font-size: 11px;">${escapeHtml(song.artist)}</small>
            </div>
        `;
        container.appendChild(div);
    });
}

function closeBlendModal() {
    document.getElementById("blendModal").classList.remove("show");
}

async function handleGenerateBlend() {
    const checkboxes = document.querySelectorAll(".blend-song-checkbox:checked");
    if (checkboxes.length < 2) {
        showToast("Select at least 2 songs to create a blend.");
        return;
    }
    
    const selectedSongs = Array.from(checkboxes).map(cb => JSON.parse(cb.value));
    
    try {
        const res = await fetch("/api/blend/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ songs: selectedSongs })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            showToast(data.message || "Error creating blend");
            return;
        }
        
        showToast("Blend created!");
        await refreshUserMusicState();
        closeBlendModal();
    } catch(e) {
        showToast("Error creating blend");
    }
}


async function openBackendPlaylist(name) {
    const playlists = await fetchUserPlaylists();
    const target = playlists.find(p => p.name === name);
    if (target) {
        showPlaylist(target._id);
    } else {
        showToast("Playlist not found on server");
    }
}


async function addToPlaylist(data) {
    if (!data) return;
    showToast("Adding...");
    
    // Convert old data format if needed
    let songObj = {
        id: data.song || data.title,
        title: data.song || data.title,
        artist: data.artist,
        cover: data.image || data.cover,
        preview: data.preview,
        duration: data.duration
    };
    
    try {
        const playlists = await fetchUserPlaylists();
        const target = playlists.find(p => p.name === "My Playlist");
        if (!target) return showToast("My Playlist not found");
        
        // Prevent duplicates (simple check by title/id)
        if (target.songs.some(s => s.id === songObj.id || s.title === songObj.title)) {
            return showToast("Already in My Playlist");
        }
        
        const res = await fetch(`/api/playlists/${target._id}/songs`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(songObj)
        });
        if (res.ok) {
            showToast("Added to My Playlist");
            await refreshUserMusicState();
        }
    } catch(e) {
        showToast("Error adding song");
    }
}

async function favoriteSong(button) {
    const data = getSongData(button);
    if (!data) return;
    
    let songObj = {
        id: data.song || data.title,
        title: data.song || data.title,
        artist: data.artist,
        cover: data.image || data.cover,
        preview: data.preview,
        duration: data.duration
    };
    
    const heart = button.querySelector('span');
    
    try {
        const playlists = await fetchUserPlaylists();
        const target = playlists.find(p => p.name === "Liked Songs");
        if (!target) return showToast("Liked Songs not found");
        
        const exists = target.songs.some(s => s.id === songObj.id || s.title === songObj.title);
        
        if (exists) {
            // Remove it
            const res = await fetch(`/api/playlists/${target._id}/songs/${songObj.id}`, { method: "DELETE" });
            if (res.ok) {
                if(heart) {
                    heart.innerHTML = '♡';
                    heart.style.color = 'var(--text-secondary)';
                }
                showToast("Removed from Liked Songs");
                await refreshUserMusicState();
            }
        } else {
            // Add it
            const res = await fetch(`/api/playlists/${target._id}/songs`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(songObj)
            });
            if (res.ok) {
                if(heart) {
                    heart.innerHTML = '♥';
                    heart.style.color = 'var(--text-accent)';
                    
                    heart.style.transform = 'scale(1.4)';
                    setTimeout(() => {
                        heart.style.transform = 'scale(1)';
                    }, 200);
                }
                showToast("Added to Liked Songs");
                await refreshUserMusicState();
            }
        }
    } catch(e) {
        showToast("Error updating favorites");
    }
}


document.addEventListener('DOMContentLoaded', () => {
    if (typeof refreshUserMusicState === 'function') {
        refreshUserMusicState();
    }
});

// =========================================================
// AI VIBE PREDICTOR LOGIC
// =========================================================

let selectedMood = null;

function selectMood(button, mood) {
    // Remove selected state from all
    document.querySelectorAll('.mood-card').forEach(card => card.classList.remove('selected-mood'));
    // Add to clicked
    button.classList.add('selected-mood');
    selectedMood = mood;
}

async function fetchAIVibe() {
    if (!selectedMood) {
        return showToast("Please select a mood first.");
    }
    
    const btn = document.getElementById("findVibeBtn");
    const resultsContainer = document.getElementById("aivibe-results");
    const grid = document.getElementById("aivibe-songs-grid");
    
    // Loading State
    btn.innerText = "Finding your vibe... 🔍";
    btn.disabled = true;
    resultsContainer.style.display = "block";
    grid.innerHTML = "<div class='empty-box' style='background: transparent; color: var(--text-primary);'>Searching vibes...</div>";
    
    try {
        const res = await fetch(`/api/mood?mood=${encodeURIComponent(selectedMood)}`);
        const data = await res.json();
        
        btn.innerText = "Find My Vibe";
        btn.disabled = false;
        
        if (data.success) {
            const songs = data.results;
            if (songs.length === 0) {
                grid.innerHTML = "<div class='empty-box' style='background: transparent; color: var(--text-primary);'>No songs found for this mood. Try another vibe.</div>";
                return;
            }
            
            // Render songs using existing styling
            grid.innerHTML = "";
            songs.forEach(rawSong => {
                const normalizedSong = {
                    song: rawSong.title || rawSong.song || "",
                    artist: rawSong.artist || "",
                    image: rawSong.cover || rawSong.image || "",
                    file: rawSong.preview || rawSong.file || ""
                };

                const card = document.createElement("div");
                card.className = "song-card";
                card.dataset.song = normalizedSong.song;
                card.dataset.artist = normalizedSong.artist;
                if (normalizedSong.image) card.dataset.image = normalizedSong.image;
                if (normalizedSong.file) card.dataset.file = normalizedSong.file;
                
                let playButtonHTML = "";
                if (normalizedSong.file) {
                    playButtonHTML = `<button type="button" class="action-btn queue-btn" onclick="playCard(this)" style="padding: 5px 8px; font-size: 10px;">▶ Play</button>`;
                } else {
                    playButtonHTML = `<span style="font-size: 10px; color: var(--text-secondary); align-self: center;">Audio unavailable</span>`;
                }

                card.innerHTML = `
                    <div class="song-info">
                        <h3>${escapeHtml(normalizedSong.song)}</h3>
                        <p>${escapeHtml(normalizedSong.artist)}</p>
                        <div class="song-actions" style="display: flex; gap: 5px; margin-top: 5px;">
                            ${playButtonHTML}
                            <button type="button" class="action-btn fav-btn" onclick="favoriteSong(this)" style="padding: 5px 8px; font-size: 10px;">♡ Like</button>
                            <button type="button" class="action-btn queue-btn" onclick="queueCard(this)" style="padding: 5px 8px; font-size: 10px;">+ Queue</button>
                        </div>
                    </div>
                `;
                grid.appendChild(card);
            });
        } else {
            showToast("Couldn't find songs right now. Please try again.");
            grid.innerHTML = "";
        }
    } catch (e) {
        btn.innerText = "Find My Vibe";
        btn.disabled = false;
        showToast("Couldn't find songs right now. Please try again.");
        grid.innerHTML = "";
    }
}
