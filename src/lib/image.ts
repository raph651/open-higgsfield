function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the image'));
    reader.readAsDataURL(file);
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not decode the image'));
    image.src = url;
  });
}

/**
 * Normalizes a dropped/uploaded image to a data URL that survives localStorage.
 * Large photos are resized to maxDimension and encoded as WebP.
 * Small files keep their original bytes.
 */
export async function fileToDataUrl(file: File, maxDimension = 1600): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Use a PNG, JPG or WebP image');
  }
  if (file.size > 12_000_000) {
    throw new Error('Image is over 12 MB — resize it and try again');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    if (file.size <= 900_000) {
      return await readAsDataUrl(file);
    }

    const image = await loadImage(objectUrl);
    const ratio = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is not available in this browser');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/webp', 0.88);
    if (dataUrl.length > 3_000_000) {
      throw new Error('Image is still too large after resizing — try a smaller file');
    }
    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
