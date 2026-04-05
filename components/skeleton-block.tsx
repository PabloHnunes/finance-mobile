import { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

interface Props {
  className?: string;
  style?: ViewStyle;
}

export function SkeletonBlock({ className, style }: Props) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return <Animated.View style={[style, { opacity }]} className={className} />;
}
