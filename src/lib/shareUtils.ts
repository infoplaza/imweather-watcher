import logoSrc from "@/assets/imweatherwatcher-logo-black.jpg";

/**
 * Draws the IMWeatherWatcher logo in the top-right corner of a canvas
 * and returns the resulting blob.
 */
export async function addLogoToCanvas(canvas: HTMLCanvasElement): Promise<Blob | null> {
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvasToBlob(canvas);

  const logo = new Image();
  logo.crossOrigin = "anonymous";

  await new Promise<void>((resolve) => {
    logo.onload = () => resolve();
    logo.onerror = () => resolve();
    logo.src = logoSrc;
  });

  if (logo.naturalWidth > 0) {
    const logoHeight = 24 * 2; // account for scale: 2
    const logoWidth = (logo.naturalWidth / logo.naturalHeight) * logoHeight;
    const padding = 10 * 2;
    const x = canvas.width - logoWidth - padding;
    const y = padding;

    // Rounded clipping for the logo
    const radius = 6;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, logoWidth, logoHeight, radius);
    ctx.clip();
    ctx.drawImage(logo, x, y, logoWidth, logoHeight);
    ctx.restore();
  }

  return canvasToBlob(canvas);
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}
