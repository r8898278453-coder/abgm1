import React from 'react';
import { Composition } from 'remotion';
import {
  ReelComposition,
  REEL_FPS,
  REEL_DURATION_IN_FRAMES,
  REEL_WIDTH,
  REEL_HEIGHT,
} from './ReelComposition';

export const Root: React.FC = () => {
  return (
    <Composition
      id="ReelVideo"
      component={ReelComposition}
      durationInFrames={REEL_DURATION_IN_FRAMES}
      fps={REEL_FPS}
      width={REEL_WIDTH}
      height={REEL_HEIGHT}
      defaultProps={{
        scenes: [
          {
            scene: 'Scene 1',
            visual: 'Customer looking for reliable service',
            audio: 'Looking for dependable, high-quality service in your city?',
          },
          {
            scene: 'Scene 2',
            visual: 'Dedicated team executing with excellence',
            audio: 'Here is why thousands of local clients trust our team every day.',
          },
          {
            scene: 'Scene 3',
            visual: 'Call to action and contact details',
            audio: 'Tap the link or message us on WhatsApp to get started today!',
          },
        ],
        logoUrl: '',
        primaryColor: '#4f46e5',
        businessName: 'Aaditech BGA',
        photoUrls: [],
      }}
    />
  );
};
