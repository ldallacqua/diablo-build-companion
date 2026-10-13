import type { AppState, Settings, Asset } from '../domain/models';
import type { GameLibrary, GameInspection } from './gameAssets';
export interface OcrResult {
  text: string;
  confidence: number;
  milliseconds: number;
  image?: string;
}
export interface DisplayInfo {
  id: string;
  name: string;
  width: number;
  height: number;
  scale: number;
}
declare global {
  interface Window {
    sanctum?: {
      load(): Promise<AppState>;
      save(state: AppState): Promise<void>;
      applySettings(settings: Settings): Promise<string[]>;
      displays(): Promise<DisplayInfo[]>;
      capture(): Promise<void>;
      scanImage(image: string): Promise<OcrResult>;
      toggleOverlay(): Promise<void>;
      resizeOverlay(height: number): Promise<void>;
      showMain(): Promise<void>;
      openLink(url: string): Promise<void>;
      importAsset(meta: Omit<Asset, 'checksum' | 'filename'>): Promise<Asset | null>;
      readAsset(id: string): Promise<string | null>;
      gameLibrary(): Promise<GameLibrary | null>;
      inspectGame(): Promise<GameInspection | null>;
      extractGame(names?: string[]): Promise<GameLibrary>;
      readGameResource(key: string): Promise<string | null>;
      cancelGameExtraction(): Promise<void>;
      onGameProgress(fn: (message: string) => void): () => void;
      clearData(): Promise<AppState>;
      onOcr(fn: (value: OcrResult) => void): () => void;
      onBusy(fn: (value: boolean) => void): () => void;
      onError(fn: (value: string) => void): () => void;
      onState(fn: (value: AppState) => void): () => void;
    };
  }
}
