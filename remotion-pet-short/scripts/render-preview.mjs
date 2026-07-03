import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import sharp from 'sharp';

const root = process.cwd();
const width = 1080;
const height = 1920;
const fps = 30;
const duration = 8;
const totalFrames = fps * duration;

const assets = {
  source: path.join(root, 'public/assets/pet-adventurer/source.png'),
  modeling: path.join(root, 'public/assets/pet-adventurer/modeling.png'),
  figure: path.join(root, 'public/assets/pet-adventurer/figure.png'),
};

const outDir = path.join(root, 'out');
const framesDir = path.join(outDir, 'preview-frames');
const output = path.join(outDir, 'pet-figure-transform-preview.mp4');
const ffmpeg = path.join(root, 'node_modules/@remotion/compositor-darwin-arm64/ffmpeg');
const ffmpegLib = path.dirname(ffmpeg);

const ease = (t) => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
const lerp = (a, b, t) => a + (b - a) * t;
const range = (seconds, start, end) => {
  if (seconds <= start) return 0;
  if (seconds >= end) return 1;
  return (seconds - start) / (end - start);
};

const svg = (body) => Buffer.from(`<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`);

const esc = (text) =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const baseImage = async (file, opacity, scale, blur = 0) => {
  const safeScale = Math.max(1, scale);
  const imageWidth = Math.ceil(width * safeScale);
  const imageHeight = Math.ceil(height * safeScale);
  const pipeline = sharp(file).resize(imageWidth, imageHeight, {fit: 'cover'});
  if (blur >= 0.3) {
    pipeline.blur(blur);
  }
  const leftCrop = Math.max(0, Math.floor((imageWidth - width) / 2));
  const topCrop = Math.max(0, Math.floor((imageHeight - height) / 2));
  const input = await pipeline
    .extract({left: leftCrop, top: topCrop, width, height})
    .modulate({saturation: 1.05})
    .png()
    .toBuffer();
  return {input, left: 0, top: 0, blend: 'over', opacity};
};

const overlaySvg = (body, opacity = 1) => ({
  input: svg(body),
  left: 0,
  top: 0,
  blend: 'over',
  opacity,
});

const scanOverlay = (seconds) => {
  const p = ease(range(seconds, 0.6, 2.3));
  const y = lerp(-260, height, p);
  let lines = '';
  for (let i = 0; i < height; i += 28) {
    lines += `<line x1="0" y1="${i}" x2="${width}" y2="${i}" stroke="#bff7ff" stroke-opacity="0.18" stroke-width="2"/>`;
  }
  return `
    <rect width="100%" height="100%" fill="rgba(84,218,255,0.08)"/>
    ${lines}
    <rect x="78" y="78" width="${width - 156}" height="${height - 156}" rx="28" fill="none" stroke="#74e8ff" stroke-opacity="0.46" stroke-width="3"/>
    <rect x="0" y="${y}" width="${width}" height="190" fill="url(#scanGrad)"/>
    <defs>
      <linearGradient id="scanGrad" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="#67e8f9" stop-opacity="0"/>
        <stop offset="0.48" stop-color="#e8fbff" stop-opacity="0.78"/>
        <stop offset="1" stop-color="#67e8f9" stop-opacity="0"/>
      </linearGradient>
    </defs>`;
};

const meshOverlay = (seconds, frame) => {
  let body = '';
  for (let row = 0; row < 18; row++) {
    for (let col = 0; col < 7; col++) {
      const x = 160 + col * 126 + Math.sin(row * 1.7 + frame / 35) * 18;
      const y = 260 + row * 78 + Math.cos(col * 1.2 + frame / 42) * 24;
      const opacity = 0.1 + ((row + col) % 4) * 0.05;
      body += `<polygon points="${x},${y} ${x + 108},${y + 26} ${x + 54},${y + 92}" fill="none" stroke="#9ff6ff" stroke-opacity="${opacity}" stroke-width="1.5"/>`;
    }
  }
  for (let i = 0; i < 75; i++) {
    const x = 120 + ((i * 97) % 840) + Math.sin(frame / 18 + i) * 8;
    const y = 240 + ((i * 151) % 1160) + Math.cos(frame / 22 + i) * 8;
    body += `<circle cx="${x}" cy="${y}" r="${2 + (i % 3)}" fill="#9ff6ff" fill-opacity="0.22"/>`;
  }
  const ringScale = 1 + Math.sin(seconds * 2.1) * 0.025;
  body += `<ellipse cx="540" cy="930" rx="${430 * ringScale}" ry="${710 * ringScale}" fill="none" stroke="#67e8f9" stroke-opacity="0.28" stroke-width="3"/>`;
  body += `<ellipse cx="540" cy="930" rx="${330 / ringScale}" ry="${585 / ringScale}" fill="none" stroke="#ffffff" stroke-opacity="0.22" stroke-width="2" stroke-dasharray="12 16"/>`;
  return body;
};

const labelText = (seconds) => {
  if (seconds >= 6.1) return '';
  if (seconds >= 4.0) return '3D MODEL DATA';
  if (seconds >= 2.5) return 'MESH BUILD';
  if (seconds >= 1.3) return 'SCANNING SHAPE';
  return 'PHOTO INPUT';
};

const textOverlay = (seconds) => {
  const intro = 1 - range(seconds, 2.15, 2.45);
  const final = ease(range(seconds, 6.0, 6.55));
  const label = labelText(seconds);
  const labelBody = label
    ? `<g>
        <rect x="58" y="1630" width="260" height="62" rx="8" fill="#081018" fill-opacity="0.55" stroke="#ffffff" stroke-opacity="0.22"/>
        <circle cx="88" cy="1661" r="7" fill="#67e8f9"/>
        <text x="106" y="1672" font-size="27" font-weight="800" fill="#f8fbff" font-family="Arial, sans-serif">${label}</text>
      </g>`
    : '';
  return `
    <rect width="100%" height="100%" fill="url(#shade)"/>
    <defs>
      <linearGradient id="shade" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="#000" stop-opacity="0.24"/>
        <stop offset="0.28" stop-color="#000" stop-opacity="0"/>
        <stop offset="0.68" stop-color="#000" stop-opacity="0"/>
        <stop offset="1" stop-color="#000" stop-opacity="0.58"/>
      </linearGradient>
    </defs>
    <g opacity="${Math.max(0, intro)}">
      <text x="58" y="164" font-size="62" font-weight="900" fill="#f8fbff" font-family="Arial, sans-serif">${esc('写真のかわいいを')}</text>
      <text x="58" y="224" font-size="36" font-weight="800" fill="#dff7ff" font-family="Arial, sans-serif">${esc('3Dデータからフィギュアへ')}</text>
    </g>
    ${labelBody}
    <g opacity="${final}">
      <text x="540" y="1658" font-size="72" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="Arial, sans-serif">FIGURE READY</text>
      <text x="540" y="1712" font-size="30" font-weight="800" fill="#fff4d4" text-anchor="middle" font-family="Arial, sans-serif">${esc('画像から、立体のたからものへ')}</text>
    </g>`;
};

const frameComposites = async (frame) => {
  const seconds = frame / fps;
  const sourceOpacity = 1 - ease(range(seconds, 1.8, 2.45));
  const modelingIn = ease(range(seconds, 1.8, 2.65));
  const modelingOut = 1 - ease(range(seconds, 5.7, 6.35));
  const modelingOpacity = modelingIn * modelingOut;
  const figureOpacity = ease(range(seconds, 5.55, 6.35));
  const sourceScale = lerp(1, 1.08, range(seconds, 0, 2.3));
  const modelingScale = 1 + Math.sin(seconds * 3.4) * 0.018;
  const figureScale = lerp(1.08, 1, ease(range(seconds, 5.8, 6.55)));

  const layers = [];
  if (sourceOpacity > 0.01) layers.push(await baseImage(assets.source, sourceOpacity, sourceScale, range(seconds, 1.6, 2.45) * 3));
  if (seconds >= 0.45 && seconds <= 2.8) layers.push(overlaySvg(scanOverlay(seconds), range(seconds, 0.45, 0.8) * (1 - range(seconds, 2.45, 2.8))));
  if (modelingOpacity > 0.01) layers.push(await baseImage(assets.modeling, modelingOpacity, modelingScale));
  if (seconds >= 2.0 && seconds <= 6.35) layers.push(overlaySvg(meshOverlay(seconds, frame), range(seconds, 2.0, 2.45) * (1 - range(seconds, 5.9, 6.35))));
  if (figureOpacity > 0.01) layers.push(await baseImage(assets.figure, figureOpacity, figureScale));
  layers.push(overlaySvg(textOverlay(seconds), 1));
  return layers;
};

await fs.rm(framesDir, {recursive: true, force: true});
await fs.mkdir(framesDir, {recursive: true});
await fs.mkdir(outDir, {recursive: true});

for (let frame = 0; frame < totalFrames; frame++) {
  const composites = await frameComposites(frame);
  const framePath = path.join(framesDir, `frame-${String(frame).padStart(4, '0')}.jpg`);
  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: '#080b10',
    },
  })
    .composite(composites)
    .jpeg({quality: 91, chromaSubsampling: '4:2:0'})
    .toFile(framePath);
  if (frame % 30 === 0) console.log(`Generated frame ${frame}/${totalFrames}`);
}

await new Promise((resolve, reject) => {
  const child = spawn(
    ffmpeg,
    [
      '-y',
      '-framerate',
      String(fps),
      '-i',
      path.join(framesDir, 'frame-%04d.jpg'),
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      output,
    ],
    {
      cwd: root,
      stdio: 'inherit',
      env: {
        ...process.env,
        DYLD_LIBRARY_PATH: ffmpegLib,
      },
    },
  );
  child.on('exit', (code) => {
    if (code === 0) resolve();
    else reject(new Error(`ffmpeg exited with code ${code}`));
  });
  child.on('error', reject);
});

console.log(`Preview video written to ${output}`);
