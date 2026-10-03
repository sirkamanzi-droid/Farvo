import * as ort from 'onnxruntime-web';

const LABELS = ['angular_leaf_spot', 'bean_rust', 'healthy'] as const;

let cachedSession: ort.InferenceSession | null = null;

async function getSession(): Promise<ort.InferenceSession> {
  if (cachedSession) return cachedSession;
  cachedSession = await ort.InferenceSession.create('/beans_model.onnx');
  return cachedSession;
}

const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

function preprocessImage(img: HTMLImageElement): Float32Array {
  const canvas = document.createElement('canvas');
  canvas.width = 224;
  canvas.height = 224;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, 224, 224);
  const { data } = ctx.getImageData(0, 0, 224, 224);

  const chw = new Float32Array(3 * 224 * 224);
  const pixelCount = 224 * 224;
  for (let i = 0; i < pixelCount; i++) {
    const r = data[i * 4] / 255;
    const g = data[i * 4 + 1] / 255;
    const b = data[i * 4 + 2] / 255;
    chw[i] = (r - MEAN[0]) / STD[0];
    chw[pixelCount + i] = (g - MEAN[1]) / STD[1];
    chw[pixelCount * 2 + i] = (b - MEAN[2]) / STD[2];
  }
  return chw;
}

function softmax(logits: Float32Array): number[] {
  const max = Math.max(...logits);
  const exps = Array.from(logits).map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((v) => v / sum);
}

function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export interface BeansPrediction {
  label: (typeof LABELS)[number];
  confidencePercent: number;
}

export async function runBeansInference(photoDataUrl: string): Promise<BeansPrediction> {
  const session = await getSession();
  const img = await loadImageFromDataUrl(photoDataUrl);
  const inputData = preprocessImage(img);

  const inputTensor = new ort.Tensor('float32', inputData, [1, 3, 224, 224]);
  const results = await session.run({ input: inputTensor });
  const logits = results.logits.data as Float32Array;
  const probs = softmax(logits);

  let bestIdx = 0;
  for (let i = 1; i < probs.length; i++) {
    if (probs[i] > probs[bestIdx]) bestIdx = i;
  }

  return {
    label: LABELS[bestIdx],
    confidencePercent: Math.round(probs[bestIdx] * 100),
  };
}
