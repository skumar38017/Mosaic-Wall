# Mosaic Wall Frontend Components

This frontend is organized into separate, reusable components for the mosaic wall application.

## 📁 Project Structure

```
src/
├── components/           # React components
│   ├── MobileApp.tsx    # Mobile camera interface
│   ├── KioskApp.tsx     # Kiosk display interface
│   └── QRCodeGenerator.tsx # QR code component
├── hooks/               # Custom React hooks
│   └── useWebSocket.ts  # WebSocket connection hook
├── utils/               # Utility functions
│   └── api.ts          # API client
├── styles/              # CSS styles
│   └── components.css   # Component styles
├── types/               # TypeScript types
│   └── index.ts        # Type definitions
├── config/              # Configuration
│   └── constants.ts    # App constants
└── App.tsx             # Main app component
```

## 🧩 Components

### MobileApp Component
- **Purpose**: Camera interface for mobile devices
- **Features**:
  - Camera access with environment facing camera
  - Photo capture and upload
  - Upload status feedback
  - Responsive design for mobile

### KioskApp Component  
- **Purpose**: Display interface for kiosk screens
- **Features**:
  - Real-time WebSocket connection
  - Photo display with random positioning
  - Automatic photo rotation and positioning
  - Connection status indicator
  - Auto-cleanup of old photos

### QRCodeGenerator Component
- **Purpose**: Generate QR codes for mobile access
- **Features**:
  - Simple QR code pattern generation
  - Configurable size
  - URL display
  - Instructions for users

## 🔧 Custom Hooks

### useWebSocket Hook
- **Purpose**: Manage WebSocket connections
- **Features**:
  - Auto-reconnection
  - Connection status tracking
  - Message handling
  - Error handling

## 🎨 Styling

All components use CSS classes defined in `components.css`:
- Mobile-first responsive design
- Smooth animations and transitions
- Modern gradient backgrounds
- Hover effects and visual feedback

## 🚀 Usage

### Running the App

1. **Development Mode**:
   ```bash
   npm run dev
   ```

2. **Access Different Modes**:
   - **Mode Selector**: `http://localhost:5173/`
   - **Mobile Mode**: `http://localhost:5173/?mode=mobile`
   - **Kiosk Mode**: `http://localhost:5173/?mode=kiosk`
   - **Custom Backend**: `http://localhost:5173/?mode=kiosk&backend=http://192.168.1.100:8000`

### URL Parameters

- `mode`: `mobile` | `kiosk` - Sets the app mode
- `backend`: Backend URL (default: `http://localhost:8000`)

## 📱 Mobile App Features

- **Camera Access**: Uses `navigator.mediaDevices.getUserMedia()`
- **Photo Capture**: Canvas-based image capture
- **Upload**: FormData POST to `/upload` endpoint
- **Status Feedback**: Real-time upload status

## 🖥️ Kiosk App Features

- **WebSocket Connection**: Real-time photo receiving
- **Random Positioning**: Photos appear at random positions
- **Photo Rotation**: Random rotation for natural look
- **Auto-cleanup**: Keeps only last 20 photos
- **QR Code Display**: Shows QR code for mobile access

## 🔌 API Integration

### Upload Endpoint
```typescript
POST /upload
Content-Type: multipart/form-data
Body: FormData with 'photo' field
```

### WebSocket Endpoint
```typescript
WebSocket /ws
Message Format: {
  type: 'new_photo',
  photo: 'base64-encoded-image-data'
}
```

## 🎯 Key Features

1. **Responsive Design**: Works on mobile and desktop
2. **Real-time Updates**: WebSocket for instant photo display
3. **Auto-reconnection**: Handles network interruptions
4. **Error Handling**: Graceful error handling and user feedback
5. **Modular Architecture**: Separate components for different functions
6. **TypeScript**: Full type safety
7. **Modern React**: Uses hooks and functional components

## 🔧 Configuration

Edit `src/config/constants.ts` to customize:
- Camera settings
- Photo display settings
- WebSocket configuration
- Upload settings

## 🎨 Customization

### Styling
- Modify `src/styles/components.css` for visual changes
- CSS variables for easy theming
- Responsive breakpoints included

### Behavior
- Adjust photo positioning logic in `KioskApp.tsx`
- Modify camera constraints in `MobileApp.tsx`
- Customize WebSocket handling in `useWebSocket.ts`

## 📦 Dependencies

The app uses minimal dependencies:
- React 18+ with hooks
- TypeScript for type safety
- Vite for development and building
- Standard Web APIs (Camera, WebSocket, Canvas)

No external libraries for QR codes or image processing - keeps it lightweight!
