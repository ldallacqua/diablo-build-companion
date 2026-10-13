import { createWorker, type Worker } from 'tesseract.js';
let worker: Worker | undefined;
let pending: Promise<Worker> | undefined;
let idleTimer: ReturnType<typeof setTimeout> | undefined;
export async function recognize(image: Buffer, languagePath: string) {
  clearTimeout(idleTimer);
  const start = performance.now();
  if (!worker) {
    pending ??= createWorker('eng', 1, {
      langPath: languagePath,
      cacheMethod: 'none',
      gzip: true,
      workerPath: require
        .resolve('tesseract.js/src/worker-script/node/index.js')
        .replace('app.asar', 'app.asar.unpacked'),
    });
    try {
      worker = await pending;
    } catch (e) {
      pending = undefined;
      throw e;
    }
  }
  const { data } = await worker.recognize(image);
  idleTimer = setTimeout(() => {
    void stopOcr();
  }, 15000);
  idleTimer.unref();
  return {
    text: data.text,
    confidence: data.confidence,
    milliseconds: Math.round(performance.now() - start),
  };
}
export async function stopOcr() {
  clearTimeout(idleTimer);
  const retiring = worker;
  worker = undefined;
  pending = undefined;
  await retiring?.terminate();
}
