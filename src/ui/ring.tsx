import { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  size: number;
  stroke: number;
  /** 0..1 portion of the ring that is filled. */
  progress: number;
  color: string;
  trackColor: string;
  delay?: number;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Activity-style ring; animates from empty to `progress` on mount and on change. */
export function Ring({ size, stroke, progress, color, trackColor, delay = 250, children, style }: Props) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const value = useSharedValue(0);
  useEffect(() => {
    value.set(withDelay(delay, withTiming(Math.max(0, Math.min(1, progress)), { duration: 900, easing: Easing.bezier(0.32, 0.72, 0, 1) })));
  }, [progress, delay, value]);
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - value.get()) }));
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
        />
      </Svg>
      {children}
    </View>
  );
}
