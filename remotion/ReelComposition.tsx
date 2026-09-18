import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  Series,
  Img,
} from 'remotion';

export interface ReelScene {
  scene: string | number;
  visual: string;
  audio: string;
}

export interface ReelCompositionProps {
  scenes: ReelScene[];
  logoUrl?: string;
  primaryColor?: string;
  businessName?: string;
  photoUrls?: string[];
}

export const REEL_FPS = 30;
export const SCENE_DURATION_IN_FRAMES = 150; // 5 seconds at 30 fps
export const REEL_DURATION_IN_FRAMES = 450; // 15 seconds total (3 scenes x 5s)
export const REEL_WIDTH = 1080;
export const REEL_HEIGHT = 1920;

// High quality generic fallbacks if no company photos exist
const FALLBACK_SCENE_PHOTOS = [
  'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1080&q=80',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1080&q=80',
  'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1080&q=80',
];

/**
 * Individual 5-second Scene Component with Ken Burns camera motion & animated captions
 */
const SceneSegment: React.FC<{
  scene: ReelScene;
  sceneIndex: number;
  photoUrl: string;
  primaryColor: string;
  businessName?: string;
}> = ({ scene, sceneIndex, photoUrl, primaryColor, businessName }) => {
  const frame = useCurrentFrame();

  // Ken Burns slow cinematic camera motion: Alternate directions per scene
  const isEven = sceneIndex % 2 === 0;
  const scale = interpolate(
    frame,
    [0, SCENE_DURATION_IN_FRAMES],
    isEven ? [1.05, 1.22] : [1.2, 1.05],
    { extrapolateRight: 'clamp' }
  );

  const translateY = interpolate(
    frame,
    [0, SCENE_DURATION_IN_FRAMES],
    isEven ? [0, -35] : [-25, 15],
    { extrapolateRight: 'clamp' }
  );

  const translateX = interpolate(
    frame,
    [0, SCENE_DURATION_IN_FRAMES],
    isEven ? [-15, 15] : [15, -15],
    { extrapolateRight: 'clamp' }
  );

  // Scene entrance & exit crossfade transitions
  const sceneOpacity = interpolate(
    frame,
    [0, 12, SCENE_DURATION_IN_FRAMES - 12, SCENE_DURATION_IN_FRAMES],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Animated Caption Entry (Spring-like pop in after scene settles)
  const captionScale = interpolate(frame, [10, 24], [0.85, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const captionOpacity = interpolate(frame, [10, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const captionY = interpolate(frame, [10, 24], [25, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Scene Indicator Badge
  const sceneLabel =
    typeof scene.scene === 'string'
      ? scene.scene.replace(/\(.*\)/, '').trim()
      : `Scene ${scene.scene}`;

  return (
    <AbsoluteFill style={{ opacity: sceneOpacity, backgroundColor: '#090d16', overflow: 'hidden' }}>
      {/* Ken-Burns Slow Zoom & Pan Photo Background */}
      <div
        style={{
          position: 'absolute',
          inset: -60,
          transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
          transformOrigin: 'center center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Img
          src={photoUrl}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </div>

      {/* Cinematic Multi-Layer Dark Vignette & Gradient Overlays */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(15,23,42,0.75) 0%, rgba(15,23,42,0.3) 30%, rgba(15,23,42,0.5) 60%, rgba(15,23,42,0.92) 100%)',
        }}
      />

      {/* Scene Header Hook Pill */}
      <div
        style={{
          position: 'absolute',
          top: 130,
          left: 60,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            backgroundColor: primaryColor,
            color: '#ffffff',
            padding: '8px 20px',
            borderRadius: 999,
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
          }}
        >
          {sceneLabel}
        </div>
        {scene.visual && (
          <div
            style={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
              color: 'rgba(255,255,255,0.9)',
              padding: '8px 18px',
              borderRadius: 999,
              fontSize: 20,
              fontWeight: 600,
              maxWidth: 550,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {scene.visual}
          </div>
        )}
      </div>

      {/* Primary Animated On-Screen Audio Caption */}
      {/* Phase 2: add text-to-speech voiceover & audio waveform synchronization */}
      <div
        style={{
          position: 'absolute',
          bottom: 220,
          left: 60,
          right: 60,
          transform: `translateY(${captionY}px) scale(${captionScale})`,
          opacity: captionOpacity,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.88)',
            border: '2px solid rgba(255, 255, 255, 0.18)',
            borderRadius: 28,
            padding: '36px 44px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
            backdropFilter: 'blur(16px)',
            maxWidth: 960,
            width: '100%',
          }}
        >
          <div
            style={{
              color: '#38bdf8',
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: 14,
            }}
          >
            🎙️ Narrator Script
          </div>
          <div
            style={{
              color: '#ffffff',
              fontSize: 42,
              fontWeight: 800,
              lineHeight: 1.3,
              textShadow: '0 2px 10px rgba(0,0,0,0.5)',
            }}
          >
            "{scene.audio}"
          </div>
        </div>
      </div>

      {/* Visual Bottom CTA Bar for Scene 3 */}
      {sceneIndex === 2 && (
        <div
          style={{
            position: 'absolute',
            bottom: 90,
            left: 60,
            right: 60,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              backgroundColor: primaryColor,
              color: '#ffffff',
              padding: '18px 48px',
              borderRadius: 24,
              fontSize: 30,
              fontWeight: 800,
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <span>👉 Connect With {businessName || 'Us'} Today</span>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

/**
 * Main 15-Second Viral Local Reel Composition
 */
export const ReelComposition: React.FC<ReelCompositionProps> = ({
  scenes = [],
  logoUrl,
  primaryColor = '#4f46e5',
  businessName = 'Local Business',
  photoUrls = [],
}) => {
  // Ensure we have exactly 3 scenes (standard 15s viral reel format)
  const normalizedScenes = scenes.length >= 3 ? scenes.slice(0, 3) : [
    scenes[0] || { scene: 'Scene 1', visual: 'Hook & Problem', audio: 'Are you searching for quality services you can trust?' },
    scenes[1] || { scene: 'Scene 2', visual: 'Value & Solution', audio: 'Our verified team provides top results across town.' },
    scenes[2] || { scene: 'Scene 3', visual: 'Action & CTA', audio: 'Call or message us on WhatsApp today to get started!' },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: '#090d16', fontFamily: 'sans-serif' }}>
      {/* 3 x 5-Second Scenes in Series Sequence */}
      <Series>
        {normalizedScenes.map((scene, idx) => {
          const photo =
            (photoUrls && photoUrls[idx]) ||
            FALLBACK_SCENE_PHOTOS[idx % FALLBACK_SCENE_PHOTOS.length];

          return (
            <Series.Sequence key={idx} durationInFrames={SCENE_DURATION_IN_FRAMES}>
              <SceneSegment
                scene={scene}
                sceneIndex={idx}
                photoUrl={photo}
                primaryColor={primaryColor}
                businessName={businessName}
              />
            </Series.Sequence>
          );
        })}
      </Series>

      {/* Persistent Top Corner Brand Logo Watermark */}
      <div
        style={{
          position: 'absolute',
          top: 48,
          right: 48,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: 20,
          padding: '10px 18px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}
      >
        {logoUrl ? (
          <Img
            src={logoUrl}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              objectFit: 'contain',
              backgroundColor: '#ffffff',
              padding: 4,
            }}
          />
        ) : (
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: primaryColor,
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 20,
            }}
          >
            {(businessName || 'B')[0].toUpperCase()}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              color: '#ffffff',
              fontSize: 18,
              fontWeight: 700,
              maxWidth: 260,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {businessName}
          </span>
          <span
            style={{
              color: '#94a3b8',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Verified Local
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
