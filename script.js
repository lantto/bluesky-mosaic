// const url = "wss://jetstream2.us-east.bsky.network/subscribe?wantedCollections=app.bsky.feed.post&wantedCollections=app.bsky.feed.like&wantedCollections=app.bsky.graph.follow";

const url = "wss://jetstream2.us-east.bsky.network/subscribe?wantedCollections=app.bsky.feed.post";

let isPaused = false;
const pauseButton = document.getElementById('pauseButton');
let activeWebSocket = null;
let imageCounter = 0;
const IMAGE_LIMIT = 1000;

const PRESET_HASHTAGS = {
    'art': new Set(['art', 'digitalart', 'fanart', 'illustration', 'drawing', 'oc', 'photography', 
                    'artist', 'traditionalart', 'blender', 'render', 'c4d', '3d', '3dart', 
                    'procreate', 'sketch', 'artist'])
};

function getUrlParameters() {
    const params = new URLSearchParams(window.location.search);
    const preset = params.get('preset')?.toLowerCase();
    const customTags = params.get('tags')?.toLowerCase();
    
    let activeHashtags = new Set();
    
    if (preset && PRESET_HASHTAGS[preset]) {
        activeHashtags = new Set([...PRESET_HASHTAGS[preset]]);
    }
    
    if (customTags) {
        const customTagsArray = customTags.split(',').map(tag => tag.trim());
        customTagsArray.forEach(tag => activeHashtags.add(tag));
    }
    
    return activeHashtags;
}

const ALLOWED_HASHTAGS = getUrlParameters();

function hasAllowedHashtag(facets) {
    if (ALLOWED_HASHTAGS.size === 0) return true;
    
    if (!facets) return false;
    
    for (const facet of facets) {
        if (!facet.features) continue;
        
        for (const feature of facet.features) {
            if (feature.$type === 'app.bsky.richtext.facet#tag') {
                const hashtag = feature.tag.toLowerCase();
                if (ALLOWED_HASHTAGS.has(hashtag)) {
                    return true;
                }
            }
        }
    }
    return false;
}

function setupWebSocket() {
    if (activeWebSocket) {
        activeWebSocket.close();
    }
    
    activeWebSocket = new WebSocket(url);
    
    activeWebSocket.onopen = () => {
        console.log("Connected to Bluesky WebSocket");
    };

    activeWebSocket.onmessage = (event) => {
        if (isPaused) return;
        
        const json = JSON.parse(event.data);
        
        if (json.commit?.record?.$type === "app.bsky.feed.post" && 
            json.commit.record.embed?.$type === "app.bsky.embed.images") {
            
            const facets = json.commit.record.facets;
            if (!hasAllowedHashtag(facets)) {
                return;
            }
            
            const did = json.did;
            const rkey = json.commit.rkey;
            
            json.commit.record.embed.images.forEach(image => {
                const ref = image.image.ref.$link;
                const imageUrl = `https://cdn.bsky.app/img/feed_thumbnail/plain/${did}/${ref}@jpeg`;
                addImageToMosaic(imageUrl, did, rkey);
            });
        }
    };

    activeWebSocket.onerror = (error) => {
        console.error("WebSocket error:", error);
    };

    activeWebSocket.onclose = () => {
        console.log("WebSocket connection closed");
        if (!isPaused) {
            // Attempt to reconnect after 5 seconds if not manually paused
            setTimeout(() => {
                setupWebSocket();
            }, 5000);
        }
    };
}

// Initialize the WebSocket connection
setupWebSocket();

pauseButton.addEventListener('click', () => {
    isPaused = !isPaused;
    pauseButton.textContent = isPaused ? 'Resume' : 'Pause';
    pauseButton.classList.toggle('paused');
    pauseButton.classList.remove('auto-paused');
    
    if (isPaused) {
        activeWebSocket.close();
    } else {
        imageCounter = 0;
        setupWebSocket();
    }
});

const mosaic = document.getElementById('mosaic');
let currentIndex = 0;
let gridSize = 0;

// Calculate grid size based on viewport
function calculateGridSize() {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Calculate how many columns we can fit with a minimum of 3
    const columnsCount = Math.max(3, Math.floor(viewportWidth / 200));
    const rowsCount = Math.floor(viewportHeight / (viewportWidth / columnsCount));
    
    return columnsCount * rowsCount;
}

// Initialize the grid with placeholder images
function initializeMosaic() {
    gridSize = calculateGridSize();
    
    // Clear existing content
    mosaic.innerHTML = '';
    
    // Add placeholder images
    for (let i = 0; i < gridSize; i++) {
        const imgContainer = document.createElement('div');
        imgContainer.className = 'image-container';
        
        const img = new Image();
        img.src = 'data:image/svg+xml,' + encodeURIComponent(`
            <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
                <rect width="100%" height="100%" fill="#000000"/>
            </svg>
        `);
        img.alt = 'Placeholder';
        
        imgContainer.appendChild(img);
        mosaic.appendChild(imgContainer);
    }
}

// Recalculate grid size and reinitialize when window is resized
window.addEventListener('resize', () => {
    initializeMosaic();
});

// Initial setup
initializeMosaic();

function addImageToMosaic(imageUrl, did, rkey) {
    const img = new Image();
    img.src = imageUrl;
    img.dataset.postUrl = `https://bsky.app/profile/${did}/post/${rkey}`; // Store the URL
    
    img.onload = () => {
        if (isPaused) {
            return;
        }
        displayImage(img);
    };

    img.onerror = () => {
        console.error('Failed to load image:', imageUrl);
        if (!isPaused) {
            currentIndex = (currentIndex + 1) % gridSize;
        }
    };
}

function displayImage(img) {
    imageCounter++;
    if (imageCounter >= IMAGE_LIMIT && !isPaused) {
        isPaused = true;
        pauseButton.textContent = 'Resume';
        pauseButton.classList.add('paused');
        pauseButton.classList.add('auto-paused');
        activeWebSocket.close();
        return;
    }

    const imgContainer = document.createElement('div');
    imgContainer.className = 'image-container flip-in';
    
    // Create an anchor element
    const link = document.createElement('a');
    link.href = img.dataset.postUrl; // We'll set this when creating the image
    link.target = '_blank'; // Open in new tab
    link.appendChild(img);
    
    imgContainer.appendChild(link);

    const oldContainer = mosaic.children[currentIndex];
    oldContainer.classList.add('flip-out');
    
    setTimeout(() => {
        mosaic.children[currentIndex].replaceWith(imgContainer);
        currentIndex = (currentIndex + 1) % gridSize;
    }, 300);
}