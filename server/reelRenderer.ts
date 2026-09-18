import path from 'path';
import fs from 'fs';
import { bundle } from '@remotion/bundler';
import { selectComposition, renderMedia } from '@remotion/renderer';
import type { ReelCompositionProps } from '../remotion/ReelComposition';

let bundlePromise: Promise<string> | null = null;

/**
 * Returns the cached webpack bundle location for the Remotion composition.
 * Bundling is performed once on first call and cached indefinitely across requests.
 */
export async function getRemotionBundle(): Promise<string> {
  if (!bundlePromise) {
    bundlePromise = (async () => {
      const entryPoint = path.join(process.cwd(), 'remotion', 'index.ts');
      console.log('[Remotion] Compiling and caching Remotion composition bundle at:', entryPoint);
      try {
        const bundleLocation = await bundle({
          entryPoint,
          onProgress: (p) => {
            if (p % 25 === 0 || p === 100) {
              console.log(`[Remotion] Bundling progress: ${p}%`);
            }
          },
        });
        console.log('[Remotion] Composition bundle compiled successfully at:', bundleLocation);
        return bundleLocation;
      } catch (err) {
        // Reset bundlePromise on error so subsequent requests can retry cleanly
        bundlePromise = null;
        console.error('[Remotion] Bundle failed:', err);
        throw err;
      }
    })();
  }
  return bundlePromise;
}

export interface RenderReelOptions {
  inputProps: ReelCompositionProps;
  outputPath: string;
  onProgress?: (progressPercent: number) => void;
}

export interface RenderReelResult {
  outputPath: string;
  sizeBytes: number;
  durationInSeconds: number;
  fps: number;
}

/**
 * Programmatically renders a 15-second viral local reel video using Remotion server-side.
 */
export async function renderReelVideo(options: RenderReelOptions): Promise<RenderReelResult> {
  const { inputProps, outputPath, onProgress } = options;

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // 1. Obtain cached composition bundle
  const serveUrl = await getRemotionBundle();

  // 2. Select composition with dynamic props
  const composition = await selectComposition({
    serveUrl,
    id: 'ReelVideo',
    inputProps: inputProps as unknown as Record<string, unknown>,
  });

  // 3. Render MP4 media
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    crf: 22, // Optimized encoding speed and pristine quality
    outputLocation: outputPath,
    inputProps: inputProps as unknown as Record<string, unknown>,
    concurrency: 2, // Balance CPU utilization inside container
    onProgress: (p) => {
      const percent = Math.min(100, Math.round(p.progress * 100));
      if (onProgress) {
        onProgress(percent);
      }
    },
  });

  const stats = fs.statSync(outputPath);
  const durationInSeconds = composition.durationInFrames / composition.fps;

  return {
    outputPath,
    sizeBytes: stats.size,
    durationInSeconds,
    fps: composition.fps,
  };
}
