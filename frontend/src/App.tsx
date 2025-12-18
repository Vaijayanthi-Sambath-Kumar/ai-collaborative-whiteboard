import { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric'; 
import io from 'socket.io-client';
import axios from 'axios';

const socket = io('http://localhost:4000');

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);
  const [prompt, setPrompt] = useState('');
  
  // STATE: Drawing Mode & Brush Color
  const [isDrawing, setIsDrawing] = useState(true);
  const [brushColor, setBrushColor] = useState('#000000'); // Default black

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
    canvas.freeDrawingBrush.color = brushColor; // Use state color

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

  // --- 2. Handle Color Changes ---
  // Whenever 'brushColor' changes, update the canvas brush
  useEffect(() => {
    if (fabricCanvas) {
      fabricCanvas.freeDrawingBrush.color = brushColor;
    }
  }, [brushColor, fabricCanvas]);

  // --- 3. Toggle Mode ---
  const toggleMode = () => {
    if (!fabricCanvas) return;
    const newMode = !isDrawing;
    setIsDrawing(newMode);
    fabricCanvas.isDrawingMode = newMode;
  };

  // --- 4. Receive Updates ---
  useEffect(() => {
    if (!fabricCanvas) return;

    const handleRemoteUpdate = async (data: any) => {
      isRemoteUpdate.current = true;
      try {
        await fabricCanvas.loadFromJSON(data);
        fabricCanvas.isDrawingMode = isDrawing; // Restore mode
        // Restore brush color (sometimes loadFromJSON resets it)
        fabricCanvas.freeDrawingBrush.color = brushColor; 
        fabricCanvas.renderAll();
      } catch (e) {
        console.error(e);
      } finally {
        isRemoteUpdate.current = false;
      }
    };

    socket.on('canvas-update', handleRemoteUpdate);
    return () => { socket.off('canvas-update', handleRemoteUpdate); };
  }, [fabricCanvas, isDrawing, brushColor]);

  // --- 5. AI Generation ---
  const handleGenerateAI = async () => {
    if (!prompt || !fabricCanvas) return;
    try {
      const res = await axios.post('http://localhost:4000/generate-image', { prompt });
      
      setIsDrawing(false);
      fabricCanvas.isDrawingMode = false;

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
            onChange={(e) => setBrushColor(e.target.value)} 
            style={{ width: '40px', height: '40px', cursor: 'pointer', border: 'none', background: 'transparent' }}
            title="Choose Brush Color"
          />
        </div>

        <div style={{ width: '1px', height: '30px', background: '#ddd' }}></div>

        {/* Mode Toggle */}
        <button 
          onClick={toggleMode}
          style={{
            background: isDrawing ? '#007bff' : '#6c757d',
            color: 'white', border: 'none', padding: '10px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold'
          }}
        >
          {isDrawing ? '✏️ Drawing' : '✋ Select / Move'}
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
