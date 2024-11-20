// const url = "wss://jetstream2.us-east.bsky.network/subscribe?wantedCollections=app.bsky.feed.post&wantedCollections=app.bsky.feed.like&wantedCollections=app.bsky.graph.follow";

const url = "wss://jetstream2.us-east.bsky.network/subscribe?wantedCollections=app.bsky.feed.post";

const ws = new WebSocket(url);
ws.onopen = () => {
    console.log("Connected to BlueSky WebSocket");
};

ws.onmessage = (event) => {
    const json = JSON.parse(event.data);
    
    // Check if it's a post with an image
    if (json.commit?.record?.$type === "app.bsky.feed.post" && 
        json.commit.record.embed?.$type === "app.bsky.embed.images") {
        
        const did = json.did;
        const image = json.commit.record.embed.images[0];
        const ref = image.image.ref.$link;
        
        // Construct the image URL
        const imageUrl = `https://cdn.bsky.app/img/feed_thumbnail/plain/${did}/${ref}@jpeg`;
        addImageToMosaic(imageUrl);
    }
};

ws.onerror = (error) => {
    console.error("WebSocket error:", error);
};

ws.onclose = () => {
    console.log("WebSocket connection closed");
};
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

function addImageToMosaic(imageUrl) {
    const img = new Image();
    img.src = imageUrl;
    
    img.onload = () => {
        const imgContainer = document.createElement('div');
        imgContainer.className = 'image-container flip-in';
        imgContainer.appendChild(img);

        // Add flip-out animation to the container being replaced
        const oldContainer = mosaic.children[currentIndex];
        oldContainer.classList.add('flip-out');
        
        // Wait for the flip-out animation to complete
        setTimeout(() => {
            mosaic.children[currentIndex].replaceWith(imgContainer);
            currentIndex = (currentIndex + 1) % gridSize;
        }, 300); // Half of the animation duration
    };

    img.onerror = () => {
        console.error('Failed to load image:', imageUrl);
        currentIndex = (currentIndex + 1) % gridSize; // Move to next position even if image fails
    };
}