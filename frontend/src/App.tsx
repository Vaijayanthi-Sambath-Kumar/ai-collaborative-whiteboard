import { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric'; 
import io from 'socket.io-client';
import axios from 'axios';

// Use the cloud URL if it exists, otherwise use localhost
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
const socket = io(BACKEND_URL);

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);
  const [prompt, setPrompt] = useState('');
  
  // STATE: Modes & Colors
  const [isDrawing, setIsDrawing] = useState(true);
  const [isEraser, setIsEraser] = useState(false); // NEW: Track Eraser Mode
  const [brushColor, setBrushColor] = useState('#000000'); 

  const isRemoteUpdate = useRef(false);

  // --- 1. Initialize Canvas ---
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      height: 500,
      width: 800,
      backgroundColor: '#ffffff',
      isDrawingMode: true,
    });
    
    // Initial Brush Settings
    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    canvas.freeDrawingBrush.width = 5;
    canvas.freeDrawingBrush.color = brushColor;

    setFabricCanvas(canvas);

    const broadcast = () => {
      if (!isRemoteUpdate.current) {
        socket.emit('canvas-update', canvas.toJSON());
      }
    };

    canvas.on('path:created', broadcast);
    canvas.on('object:modified', broadcast);

    return () => { canvas.dispose(); };
  }, []);

  // --- 2. Handle Brush & Eraser Logic ---
  useEffect(() => {
    if (!fabricCanvas || !fabricCanvas.freeDrawingBrush) return;

    if (isEraser) {
        // ERASER MODE: White color, thicker brush
        fabricCanvas.freeDrawingBrush.color = '#ffffff';
        fabricCanvas.freeDrawingBrush.width = 20; 
    } else {
        // PEN MODE: User's color, normal width
        fabricCanvas.freeDrawingBrush.color = brushColor;
        fabricCanvas.freeDrawingBrush.width = 5;
    }

  }, [brushColor, isEraser, fabricCanvas]);

  // --- 3. Toolbar Actions ---
  
  const activateDraw = () => {
    if (!fabricCanvas) return;
    setIsDrawing(true);
    setIsEraser(false); // Turn off eraser
    fabricCanvas.isDrawingMode = true;
  };

  const activateEraser = () => {
    if (!fabricCanvas) return;
    setIsDrawing(true); // Eraser is technically a drawing tool
    setIsEraser(true);  // Turn on eraser flag
    fabricCanvas.isDrawingMode = true;
  };

  const activateSelect = () => {
    if (!fabricCanvas) return;
    setIsDrawing(false);
    setIsEraser(false);
    fabricCanvas.isDrawingMode = false;
  };

  const handleSave = () => {
    if (!fabricCanvas) return;
    const dataURL = fabricCanvas.toDataURL({ format: 'png', quality: 1, multiplier: 2 });
    const link = document.createElement('a');
    link.download = 'canvas-royale.png';
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- 4. Receive Updates ---
  useEffect(() => {
    if (!fabricCanvas) return;

    const handleRemoteUpdate = async (data: any) => {
      isRemoteUpdate.current = true;
      try {
        await fabricCanvas.loadFromJSON(data);
        
        // Restore modes after loading data
        fabricCanvas.isDrawingMode = isDrawing; 
        
        if (fabricCanvas.freeDrawingBrush) {
            if (isEraser) {
                fabricCanvas.freeDrawingBrush.color = '#ffffff';
                fabricCanvas.freeDrawingBrush.width = 20;
            } else {
                fabricCanvas.freeDrawingBrush.color = brushColor;
                fabricCanvas.freeDrawingBrush.width = 5;
            }
        }
        
        fabricCanvas.renderAll();
      } catch (e) {
        console.error(e);
      } finally {
        isRemoteUpdate.current = false;
      }
    };

    socket.on('canvas-update', handleRemoteUpdate);
    return () => { socket.off('canvas-update', handleRemoteUpdate); };
  }, [fabricCanvas, isDrawing, isEraser, brushColor]);

  // --- 5. AI Generation ---
  const handleGenerateAI = async () => {
    if (!prompt || !fabricCanvas) return;
    try {
      const res = await axios.post(`${BACKEND_URL}/generate-image`, { prompt });
      
      activateSelect(); // Switch to select mode to move image

      const img = await fabric.FabricImage.fromURL(res.data.imageUrl, { crossOrigin: 'anonymous' });
      img.set({ left: 100, top: 100 });
      img.scaleToWidth(200);
      
      fabricCanvas.add(img);
      fabricCanvas.renderAll();
      socket.emit('canvas-update', fabricCanvas.toJSON());
    } catch (err) {
      alert("AI Failed");
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', background: '#e0e0e0', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <h1>🎨 Canvas Royale</h1>
      
      {/* TOOLBAR */}
      <div style={{ background: 'white', padding: '10px 20px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        
        {/* Color Picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Color:</label>
          <input 
            type="color" 
            value={brushColor} 
            onChange={(e) => {
                setBrushColor(e.target.value);
                if (isEraser) activateDraw(); // Auto-switch back to pen if they pick a color
            }} 
            style={{ width: '40px', height: '40px', cursor: 'pointer', border: 'none', background: 'transparent' }}
          />
        </div>

        <div style={{ width: '1px', height: '30px', background: '#ddd' }}></div>

        {/* TOOL BUTTONS */}
        <button 
          onClick={activateDraw}
          style={{
            background: (isDrawing && !isEraser) ? '#007bff' : '#6c757d',
            color: 'white', border: 'none', padding: '10px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold'
          }}
        >
          ✏️ Draw
        </button>

        <button 
          onClick={activateEraser}
          style={{
            background: isEraser ? '#dc3545' : '#6c757d', // Red when active
            color: 'white', border: 'none', padding: '10px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold'
          }}
        >
          🧹 Eraser
        </button>

        <button 
          onClick={activateSelect}
          style={{
            background: (!isDrawing) ? '#007bff' : '#6c757d',
            color: 'white', border: 'none', padding: '10px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold'
          }}
        >
          ✋ Move
        </button>

        <div style={{ width: '1px', height: '30px', background: '#ddd' }}></div>

        <button 
          onClick={handleSave}
          style={{
            background: '#6610f2',
            color: 'white', border: 'none', padding: '10px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold'
          }}
        >
          💾 Save
        </button>

        <div style={{ width: '1px', height: '30px', background: '#ddd' }}></div>

        {/* AI Controls */}
        <div style={{ display: 'flex', gap: '5px' }}>
            <input 
            value={prompt} 
            onChange={e => setPrompt(e.target.value)} 
            placeholder="AI Image prompt..." 
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            <button onClick={handleGenerateAI} style={{ background: '#28a745', color: 'white', border: 'none', padding: '10px', borderRadius: '5px', cursor: 'pointer' }}>
            ✨ Add
            </button>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ border: '4px solid #333', background: 'white' }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

export default App;
