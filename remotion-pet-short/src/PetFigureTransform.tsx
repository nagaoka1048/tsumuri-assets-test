import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {z} from 'zod';

export const petFigureTransformSchema = z.object({
  sourceImage: z.string(),
  modelingImage: z.string(),
  figureImage: z.string(),
  headline: z.string(),
  subline: z.string(),
  finalLabel: z.string(),
});

type PetFigureTransformProps = z.infer<typeof petFigureTransformSchema>;

const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};

const ease = Easing.bezier(0.16, 1, 0.3, 1);

const fitImage: React.CSSProperties = {
  position: 'absolute',
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

const stageLabel: React.CSSProperties = {
  position: 'absolute',
  left: 58,
  right: 58,
  bottom: 152,
  color: '#f5f7fb',
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  letterSpacing: 0,
  textAlign: 'left',
  textShadow: '0 8px 28px rgba(0,0,0,0.35)',
};

const stageCopy = [
  {at: 0.0, text: 'PHOTO INPUT'},
  {at: 1.3, text: 'SCANNING SHAPE'},
  {at: 2.5, text: 'MESH BUILD'},
  {at: 4.0, text: '3D MODEL DATA'},
  {at: 6.1, text: 'FIGURE FINISH'},
];

const useSeconds = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return {frame, fps, seconds: frame / fps};
};

const ImageLayer: React.FC<{
  src: string;
  opacity: number;
  scale: number;
  rotateY?: number;
  blur?: number;
}> = ({src, opacity, scale, rotateY = 0, blur = 0}) => (
  <Img
    src={staticFile(src)}
    style={{
      ...fitImage,
      opacity,
      filter: `blur(${blur}px) saturate(1.04) contrast(1.04)`,
      transform: `perspective(1200px) rotateY(${rotateY}deg) scale(${scale})`,
      transformOrigin: '50% 58%',
    }}
  />
);

const ScanOverlay: React.FC = () => {
  const {frame, fps} = useSeconds();
  const scanY = interpolate(frame, [0.6 * fps, 2.3 * fps], [-260, 1920], {
    ...clamp,
    easing: ease,
  });
  const opacity = interpolate(
    frame,
    [0.45 * fps, 0.8 * fps, 2.45 * fps, 2.8 * fps],
    [0, 1, 1, 0],
    clamp,
  );

  return (
    <AbsoluteFill style={{opacity, mixBlendMode: 'screen'}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'repeating-linear-gradient(180deg, rgba(87,224,255,0.11) 0 2px, transparent 2px 24px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: scanY,
          height: 210,
          background:
            'linear-gradient(180deg, transparent, rgba(93,229,255,0.85), rgba(255,255,255,0.85), transparent)',
          boxShadow: '0 0 58px rgba(88,226,255,0.7)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 74,
          border: '2px solid rgba(89,226,255,0.42)',
          borderRadius: 28,
        }}
      />
    </AbsoluteFill>
  );
};

const MeshBurst: React.FC = () => {
  const {frame, fps} = useSeconds();
  const opacity = interpolate(
    frame,
    [2.0 * fps, 2.45 * fps, 5.9 * fps, 6.35 * fps],
    [0, 1, 1, 0],
    clamp,
  );
  const spread = interpolate(frame, [2.0 * fps, 3.5 * fps], [0, 1], {
    ...clamp,
    easing: ease,
  });
  const rotate = interpolate(frame, [2.4 * fps, 5.7 * fps], [-4, 7], clamp);

  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: `rotate(${rotate}deg)`,
        mixBlendMode: 'screen',
      }}
    >
      <svg width="1080" height="1920" viewBox="0 0 1080 1920">
        <defs>
          <linearGradient id="mesh" x1="0" x2="1" y1="0" y2="1">
            <stop stopColor="#67e8f9" />
            <stop offset="1" stopColor="#f7fbff" />
          </linearGradient>
        </defs>
        {Array.from({length: 18}).map((_, row) =>
          Array.from({length: 7}).map((__, col) => {
            const x = 160 + col * 126 + Math.sin(row * 1.7) * 18 * spread;
            const y = 260 + row * 78 + Math.cos(col * 1.2) * 24 * spread;
            const p = `${x},${y} ${x + 108},${y + 26} ${x + 54},${y + 92}`;
            return (
              <polygon
                key={`${row}-${col}`}
                points={p}
                fill="none"
                stroke="url(#mesh)"
                strokeWidth={1.3}
                opacity={0.08 + ((row + col) % 4) * 0.045}
              />
            );
          }),
        )}
        {Array.from({length: 80}).map((_, i) => {
          const x = 120 + ((i * 97) % 840);
          const y = 240 + ((i * 151) % 1160);
          const r = 1.8 + (i % 3);
          return (
            <circle
              key={i}
              cx={x + Math.sin(frame / 18 + i) * 8 * spread}
              cy={y + Math.cos(frame / 22 + i) * 8 * spread}
              r={r}
              fill="#9ff6ff"
              opacity={0.2}
            />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

const HudRings: React.FC = () => {
  const {frame, fps} = useSeconds();
  const opacity = interpolate(
    frame,
    [3.0 * fps, 3.35 * fps, 6.0 * fps, 6.4 * fps],
    [0, 1, 1, 0],
    clamp,
  );
  const scale = interpolate(frame, [3.0 * fps, 5.9 * fps], [0.94, 1.06], clamp);
  const rotate = interpolate(frame, [3.0 * fps, 6.0 * fps], [0, 28], clamp);

  return (
    <AbsoluteFill style={{opacity, mixBlendMode: 'screen'}}>
      <div
        style={{
          position: 'absolute',
          left: 92,
          right: 92,
          top: 240,
          bottom: 322,
          border: '2px solid rgba(108,232,255,0.28)',
          borderRadius: '50%',
          transform: `scale(${scale}) rotate(${rotate}deg)`,
          boxShadow: 'inset 0 0 42px rgba(108,232,255,0.12)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 176,
          right: 176,
          top: 326,
          bottom: 410,
          border: '1px dashed rgba(234,251,255,0.36)',
          borderRadius: '50%',
          transform: `scale(${1.1 - (scale - 1)}) rotate(${-rotate * 1.4}deg)`,
        }}
      />
    </AbsoluteFill>
  );
};

const FinalGlow: React.FC = () => {
  const {frame, fps} = useSeconds();
  const opacity = interpolate(frame, [5.9 * fps, 6.45 * fps, 7.7 * fps], [0, 1, 0.72], clamp);
  const scale = interpolate(frame, [5.9 * fps, 6.45 * fps], [1.12, 1], {
    ...clamp,
    easing: ease,
  });

  return (
    <AbsoluteFill style={{opacity}}>
      <div
        style={{
          position: 'absolute',
          left: 156,
          right: 156,
          bottom: 196,
          height: 44,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(255,255,255,0.72), rgba(255,197,92,0.18) 46%, transparent 72%)',
          filter: 'blur(8px)',
          transform: `scale(${scale})`,
        }}
      />
    </AbsoluteFill>
  );
};

const TextBlock: React.FC<PetFigureTransformProps> = ({
  headline,
  subline,
  finalLabel,
}) => {
  const {frame, fps} = useSeconds();
  const introOpacity = interpolate(
    frame,
    [0.15 * fps, 0.55 * fps, 2.15 * fps, 2.45 * fps],
    [0, 1, 1, 0],
    clamp,
  );
  const finalOpacity = interpolate(frame, [6.0 * fps, 6.55 * fps], [0, 1], {
    ...clamp,
    easing: ease,
  });
  const progressLabelOpacity = interpolate(
    frame,
    [0, 5.85 * fps, 6.25 * fps],
    [0.88, 0.88, 0],
    clamp,
  );

  const labelIndex = stageCopy.reduce((active, item, index) => {
    return frame >= item.at * fps ? index : active;
  }, 0);

  return (
    <>
      <div
        style={{
          ...stageLabel,
          opacity: introOpacity,
          top: 128,
          bottom: 'auto',
        }}
      >
        <div style={{fontSize: 64, fontWeight: 800, lineHeight: 1.05}}>
          {headline}
        </div>
        <div
          style={{
            marginTop: 18,
            fontSize: 38,
            fontWeight: 650,
            color: '#dff7ff',
          }}
        >
          {subline}
        </div>
      </div>
      <div style={{...stageLabel, opacity: progressLabelOpacity}}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 14,
            padding: '16px 22px',
            border: '1px solid rgba(255,255,255,0.22)',
            borderRadius: 8,
            background: 'rgba(8,15,24,0.42)',
            backdropFilter: 'blur(12px)',
            fontSize: 28,
            fontWeight: 800,
          }}
        >
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: '#67e8f9',
              boxShadow: '0 0 18px #67e8f9',
            }}
          />
          {stageCopy[labelIndex].text}
        </div>
      </div>
      <div
        style={{
          ...stageLabel,
          opacity: finalOpacity,
          textAlign: 'center',
          bottom: 122,
        }}
      >
        <div style={{fontSize: 72, fontWeight: 900, lineHeight: 1}}>
          {finalLabel}
        </div>
        <div
          style={{
            marginTop: 14,
            fontSize: 31,
            fontWeight: 700,
            color: '#fff4d4',
          }}
        >
          画像から、立体のたからものへ
        </div>
      </div>
    </>
  );
};

export const PetFigureTransform: React.FC<PetFigureTransformProps> = (props) => {
  const {frame, fps} = useSeconds();

  const sourceOpacity = interpolate(
    frame,
    [0, 1.8 * fps, 2.45 * fps],
    [1, 1, 0],
    clamp,
  );
  const modelingOpacity = interpolate(
    frame,
    [1.8 * fps, 2.65 * fps, 5.7 * fps, 6.35 * fps],
    [0, 1, 1, 0],
    clamp,
  );
  const figureOpacity = interpolate(frame, [5.55 * fps, 6.35 * fps], [0, 1], {
    ...clamp,
    easing: ease,
  });
  const modelRotate = interpolate(frame, [3.0 * fps, 5.9 * fps], [-7, 7], {
    ...clamp,
    easing: Easing.inOut(Easing.ease),
  });
  const pulse = interpolate(
    frame,
    [2.0 * fps, 3.2 * fps, 4.4 * fps, 5.6 * fps],
    [1, 1.035, 0.985, 1.02],
    clamp,
  );

  return (
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(circle at 50% 38%, #3d4652 0%, #111923 42%, #080b10 100%)',
        overflow: 'hidden',
      }}
    >
      <ImageLayer
        src={props.sourceImage}
        opacity={sourceOpacity}
        scale={interpolate(frame, [0, 2.3 * fps], [1, 1.08], clamp)}
        blur={interpolate(frame, [1.6 * fps, 2.45 * fps], [0, 3], clamp)}
      />
      <ScanOverlay />
      <MeshBurst />
      <ImageLayer
        src={props.modelingImage}
        opacity={modelingOpacity}
        scale={pulse}
        rotateY={modelRotate}
      />
      <HudRings />
      <FinalGlow />
      <ImageLayer
        src={props.figureImage}
        opacity={figureOpacity}
        scale={interpolate(frame, [5.8 * fps, 6.55 * fps], [1.08, 1], {
          ...clamp,
          easing: ease,
        })}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.24), transparent 28%, transparent 68%, rgba(0,0,0,0.58))',
        }}
      />
      <TextBlock {...props} />
    </AbsoluteFill>
  );
};
