# 🎨 AI Collaborative Whiteboard

A real-time, multi-user whiteboard application where users can draw, brainstorm, and generate images using AI. Changes are synchronized instantly across all connected clients using WebSockets.

## 🚀 Features

* **Real-Time Collaboration:** Multiple users can draw on the whiteboard simultaneously.
* **Live Sync:** Updates (drawing, moving, resizing) are broadcast instantly to all connected peers.
* **AI Image Generation:** Users can type a prompt (e.g., "A futuristic city") to generate images directly onto the canvas.
* **Tools:**
    * **Freehand Drawing:** with customizable colors.
    * **Selection Mode:** Move, resize, and rotate objects.
* **Robust State Management:** Handles race conditions to prevent infinite loops during synchronization.

## 🛠️ Tech Stack

* **Frontend:** React (Vite), TypeScript, Fabric.js (Canvas logic)
* **Backend:** Node.js, Express
* **Real-time:** Socket.io (WebSockets)
* **AI Integration:** OpenAI API (DALL-E)

## ⚙️ Installation & Run Locally

### 1. Clone the Repository
```bash
git clone [https://github.com/YOUR_USERNAME/ai-collaborative-whiteboard.git](https://github.com/YOUR_USERNAME/ai-collaborative-whiteboard.git)
cd ai-collaborative-whiteboard
```

### 2. Setup Backend
```bash
cd backend
npm install
```

**Optional:** Create a `.env` file in the `backend/` folder to use real AI:
```env
OPENAI_API_KEY=sk-proj-your-key-here
```
*(Note: If no key is provided, the app runs in "Dummy Mode" using placeholder images for testing.)*

Run the server:
```bash
npm run dev
```
*Server runs on http://localhost:4000*

### 3. Setup Frontend
Open a new terminal:
```bash
cd frontend
npm install
npm run dev
```
*App runs on http://localhost:5173*

## 🧪 How to Test Real-Time Sync
1.  Open `http://localhost:5173` in your browser.
2.  Open the same URL in a **second window** (or Incognito mode).
3.  Draw on one screen — watch it appear on the other instantly!

## 🔗 Live Demo

### [🚀 Click here to launch the Whiteboard App](https://ai-collaborative-whiteboard.vercel.app)

*(Note: The backend is hosted on a free instance, so it may take 30-50 seconds to wake up on the first load. Please be patient!)*

---
