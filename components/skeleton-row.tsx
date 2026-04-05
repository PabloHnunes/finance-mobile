import { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';

interface Props {
  delay?: number;
}

export function SkeletonRow({ delay = 0 }: Props) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, delay, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View style={{ opacity }} className="bg-white dark:bg-gray-600 rounded-2xl p-4 flex-row items-center">
      <View className="w-1 h-12 rounded-full bg-gray-200 dark:bg-gray-500 mr-3" />
      <View className="flex-1 gap-2">
        <View className="w-24 h-3 rounded bg-gray-200 dark:bg-gray-500" />
        <View className="w-40 h-2 rounded bg-gray-100 dark:bg-gray-500" />
      </View>
      <View className="w-20 h-4 rounded bg-gray-200 dark:bg-gray-500" />
    </Animated.View>
  );
}
