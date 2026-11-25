# Code Snippet 2: Frontend Visual Editor Canvas Scaling & Multi-Device Viewport

### 1. Snippet Title
Responsive Multi-Device Viewport Scaling & Coordinate Alignment (`EditorCanvas.tsx`)

### 2. Original Source File Path
`src/components/editor/EditorCanvas.tsx` (Lines 403–438)

### 3. Purpose of the Code
This React component logic manages the rendering and mathematical scaling of the embedded live website storefront inside the Advanced Visual Editor. It handles viewport transitions across Desktop ($1440 \times 900$), Tablet ($768 \times 1024$), and Mobile ($390 \times 844$), applying proportional CSS transforms with anchored coordinate origins to ensure that scaled previews remain visible, centered, and free from coordinate drift or clipping.

### 4. Code Snippet

```tsx
{/* Main Viewport Container */}
<div
  data-testid="editor-viewport-container"
  style={{
    width: `${Math.round(baseWidth * scale)}px`,
    height: `${Math.round(baseHeight * scale)}px`,
    position: "relative",
    flexShrink: 0,
    transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1), height 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
  }}
  className="mx-auto"
>
  <div
    data-testid="editor-viewport-scaler"
    style={{
      width: `${baseWidth}px`,
      height: `${baseHeight}px`,
      transform: `scale(${scale})`,
      transformOrigin: "0 0",
      position: "absolute",
      top: 0,
      left: 0,
      transition: "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
    }}
    className={cn(
      "bg-white flex flex-col",
      wrapperClass
    )}
  >
    {/* Loading Spinner Indicator */}
    {isIframeLoading && (
      <div className="absolute inset-0 z-20 bg-white/70 backdrop-blur-2xs flex flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
        <span className="text-xs font-medium text-stone-600">Rendering Storefront...</span>
      </div>
    )}

    {/* Embedded Live Storefront Iframe */}
    <iframe
      ref={iframeRef}
      key={iframeKey}
      src={storefrontUrl}
      onLoad={onIframeLoad}
      className="w-full h-full border-0 bg-white"
      title="Live Storefront Preview"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
    />
  </div>
</div>
```

### 5. Explanation of Important Lines
- **Lines 4–11:** Outer viewport wrapper sized explicitly to the scaled dimensions (`baseWidth * scale` by `baseHeight * scale`) with `className="mx-auto"`. This reserves the exact layout boundary in the visual workspace and applies smooth cubic-bezier CSS animations during device switching.
- **Lines 15–24:** Inner viewport scaler container rendered at native device resolution (`baseWidth` by `baseHeight`) with `position: absolute; top: 0; left: 0; transform-origin: 0 0`. This locks the coordinate origin $(0, 0)$ to the parent's $(0, 0)$, preventing the negative layout shift and clipping that previously blanked the canvas on desktop.
- **Lines 28–34:** Non-intrusive loading overlay featuring an animated Lucide spinner and subtle backdrop blur that displays while the storefront iframe loads fresh assets or postMessage styling updates.
- **Lines 37–45:** High-performance preview iframe rendering the live site with sandboxing attributes (`allow-scripts`, `allow-same-origin`, `allow-forms`, `allow-popups`) providing isolated execution and real-time interaction.

### 6. Contribution to GridRetail
This logic enables real-time visual website customization. Administrators can toggle instantly between Desktop, Tablet, and Mobile device frames, inspect section edits, and preview theme adaptations in real time on a properly proportioned canvas without leaving the editor workspace.
