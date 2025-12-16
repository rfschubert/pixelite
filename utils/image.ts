/**
 * Converts a File object to a data URL string.
 */
export const fileToDataUri = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      resolve(event.target?.result as string);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

/**
 * Loads an image from a source URL into an HTMLImageElement.
 */
export const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (error) => reject(error);
    img.src = src;
  });
};

/**
 * Compresses an image to WebP format using canvas with optional resizing.
 */
export const compressToWebP = async (
  img: HTMLImageElement,
  options: {
    quality: number; // 0 to 1
    width?: number;
    height?: number;
  }
): Promise<Blob> => {
  const canvas = document.createElement("canvas");
  
  // Use provided dimensions or fallback to natural dimensions
  const targetWidth = options.width && options.width > 0 ? options.width : img.naturalWidth;
  const targetHeight = options.height && options.height > 0 ? options.height : img.naturalHeight;

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  
  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("Could not get canvas context");

  // Optional: Better scaling quality if browser supports it
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Draw image to canvas with new dimensions
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Canvas to Blob failed"));
        }
      },
      "image/webp",
      options.quality
    );
  });
};

/**
 * Formats bytes to human readable string (KB, MB)
 */
export const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Trigger a browser download
 */
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  // Change extension to .webp
  const name = filename.replace(/\.[^/.]+$/, "") + ".webp";
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
