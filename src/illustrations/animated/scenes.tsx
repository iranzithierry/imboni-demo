import { useEffect, useMemo, type JSX } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';

import { useArtPalette, type ArtPalette } from '../palette';
import changed from './changed';
import kept from './kept';
import { H, W } from './kit';
import remind from './remind';
import roads from './roads';
import { pose, type Motion, type SceneDef } from './timeline';
import truth from './truth';

const START_DELAY = 300;

type SceneProps = { playing: boolean; width?: number };
type Size = { width: number; height: number };

function MovingLayer({ xml, motion, t, size }: { xml: string; motion: Motion; t: SharedValue<number>; size: Size }) {
  const k = size.width / W;
  const style = useAnimatedStyle(() => {
    const q = pose(motion, t.get());
    return {
      opacity: q.o,
      transform: [
        { translateX: q.tx * k },
        { translateY: q.ty * k },
        { rotate: `${q.rot}rad` },
        { skewX: `${q.skew}rad` },
        { scaleX: q.sx },
        { scaleY: q.sy },
      ],
    };
  });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <SvgXml xml={xml} width={size.width} height={size.height} />
    </Animated.View>
  );
}

/**
 * Plays a scene once: starts shortly after `playing` turns true, freezes where it is when it turns
 * false, resumes from there, and holds the last frame. Reduced motion shows the last frame at once.
 */
function Stage({ scene, palette, playing, width = W }: SceneProps & { scene: SceneDef; palette: ArtPalette }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(reduced ? scene.duration : 0);
  const size = { width, height: (width * H) / W };
  const xml = useMemo(() => scene.layers.map((layer) => layer.draw(palette)), [scene, palette]);

  useEffect(() => {
    if (reduced) {
      t.set(scene.duration);
      return;
    }
    const from = t.get();
    if (!playing || from >= scene.duration) return;
    const run = withTiming(scene.duration, { duration: scene.duration - from, easing: Easing.linear });
    t.set(from === 0 ? withDelay(START_DELAY, run) : run);
    return () => cancelAnimation(t);
  }, [playing, reduced, scene.duration, t]);

  return (
    <View style={size} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {scene.layers.map((layer, i) =>
        layer.motion ? (
          <MovingLayer key={layer.id} xml={xml[i]} motion={layer.motion} t={t} size={size} />
        ) : (
          <View key={layer.id} style={StyleSheet.absoluteFill}>
            <SvgXml xml={xml[i]} width={size.width} height={size.height} />
          </View>
        ),
      )}
    </View>
  );
}

/** A post about an official letter: the letter lifts out and becomes a verified record. */
export function SceneKept(props: SceneProps): JSX.Element {
  const palette = useArtPalette();
  return <Stage scene={kept} palette={palette} {...props} />;
}

/** A desk calendar counts down from 9 to 6, the bell swings and a reminder rises. */
export function SceneRemind(props: SceneProps): JSX.Element {
  const palette = useArtPalette();
  return <Stage scene={remind} palette={palette} {...props} />;
}

/** A record's date is struck out and replaced; the unchanged rows are ticked. */
export function SceneChanged(props: SceneProps): JSX.Element {
  const palette = useArtPalette();
  return <Stage scene={changed} palette={palette} {...props} />;
}

/** A barrier drops onto the road ahead and the car takes the drawn diversion. */
export function SceneRoads(props: SceneProps): JSX.Element {
  const palette = useArtPalette();
  return <Stage scene={roads} palette={palette} {...props} />;
}

/** A forwarded message is checked against the official letter, which flags it. */
export function SceneTruth(props: SceneProps): JSX.Element {
  const palette = useArtPalette();
  return <Stage scene={truth} palette={palette} {...props} />;
}

export const FEATURE_SCENES = {
  kept: SceneKept,
  remind: SceneRemind,
  changed: SceneChanged,
  roads: SceneRoads,
  truth: SceneTruth,
} as const;
