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
        const imageUrl = `https://cdn.bsky.app/img/feed_fullsize/plain/${did}/${ref}@jpeg`;
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

function addImageToMosaic(imageUrl) {
    const imgContainer = document.createElement('div');
    imgContainer.className = 'image-container';

    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = 'BlueSky Image';
    
    // Remove old images if there are too many (optional)
    if (mosaic.children.length > 50) {
        mosaic.removeChild(mosaic.lastChild);
    }

    imgContainer.appendChild(img);
    mosaic.insertBefore(imgContainer, mosaic.firstChild);
}