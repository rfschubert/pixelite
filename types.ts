export enum AppMode {
  HOME = 'HOME',
  QUICK = 'QUICK',
  EDITOR = 'EDITOR'
}

export interface CompressionResult {
  originalSize: number;
  compressedSize: number;
  blob: Blob;
  savings: number; // Percentage saved
  fileName: string;
}

export interface ImageState {
  file: File | null;
  previewUrl: string | null;
  name: string;
  width: number;
  height: number;
  size: number;
}

export interface EditorSettings {
  quality: number;
  resize: boolean;
  width: number;
  height: number;
  maintainAspectRatio: boolean;
}
