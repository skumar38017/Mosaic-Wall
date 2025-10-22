import { useEffect, useRef } from 'react';

interface QRCodeGeneratorProps {
  url: string;
  size?: number;
}

export const QRCodeGenerator = ({ url, size = 200 }: QRCodeGeneratorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    generateQRCode();
  }, [url]);

  const generateQRCode = () => {
    if (!canvasRef.current) return;

    // Simple QR code generation using a library would be better
    // For now, we'll create a placeholder
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    canvas.width = size;
    canvas.height = size;

    // Draw a simple placeholder QR code pattern
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, size, size);
    
    ctx.fillStyle = '#fff';
    const cellSize = size / 25;
    
    // Create a simple pattern
    for (let i = 0; i < 25; i++) {
      for (let j = 0; j < 25; j++) {
        if ((i + j) % 2 === 0) {
          ctx.fillRect(i * cellSize, j * cellSize, cellSize, cellSize);
        }
      }
    }

    // Add corner squares (QR code markers)
    ctx.fillStyle = '#000';
    // Top-left
    ctx.fillRect(0, 0, cellSize * 7, cellSize * 7);
    ctx.fillStyle = '#fff';
    ctx.fillRect(cellSize, cellSize, cellSize * 5, cellSize * 5);
    ctx.fillStyle = '#000';
    ctx.fillRect(cellSize * 2, cellSize * 2, cellSize * 3, cellSize * 3);
  };

  return (
    <div className="qr-code-container">
      <h3>Scan to add photos:</h3>
      <canvas ref={canvasRef} className="qr-code" />
      <p className="qr-url">{url}</p>
      <p className="qr-instruction">
        Point your phone camera at this QR code to open the photo capture app
      </p>
    </div>
  );
};
