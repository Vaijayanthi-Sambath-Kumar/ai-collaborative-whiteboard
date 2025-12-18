require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

// --- 1. SETUP WEBSOCKETS (Real-time Sync) ---
const io = new Server(server, {
  cors: {
    origin: "*", // Allow connections from any frontend (React)
    methods: ["GET", "POST"]
  }
});

// Store the current state of the whiteboard in memory
let whiteboardHistory = null; 

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // 1. Send existing drawing to the NEW user immediately
  if (whiteboardHistory) {
    socket.emit('canvas-update', whiteboardHistory);
  }

  // 2. Listen for updates
  socket.on('canvas-update', (data) => {
    // Save the new state to memory
    whiteboardHistory = data;
    
    // Broadcast to everyone else (but NOT the sender)
    socket.broadcast.emit('canvas-update', data);
  });
});

// --- 2. SETUP AI GENERATION ---
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy-key", // Fallback if no key found
});

app.post('/generate-image', async (req, res) => {
  const { prompt } = req.body;
  console.log(`Received prompt: ${prompt}`);

  // CHECK: Do we have a real API key?
  if (!process.env.OPENAI_API_KEY) {
    console.log("No API Key found. Using Dummy Mode.");
    // Return a random image from Unsplash for testing
    const randomNum = Math.floor(Math.random() * 1000);
    return res.json({ 
      imageUrl: `https://picsum.photos/500/500?random=${randomNum}` 
    });
  }

  // REAL AI MODE
  try {
    const response = await openai.images.generate({
      model: "dall-e-2",
      prompt: prompt,
      n: 1,
      size: "256x256",
    });
    res.json({ imageUrl: response.data[0].url });
  } catch (error) {
    console.error("OpenAI Error:", error.message);
    res.status(500).json({ error: 'Image generation failed' });
  }
});

// --- 3. START SERVER ---
const PORT = 4000;
server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
