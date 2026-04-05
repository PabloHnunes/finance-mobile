import { useEffect, useRef } from 'react';
import { Animated, Dimensions } from 'react-native';

interface Props {
  index: number;
  direction?: 'left' | 'right';
  children: React.ReactNode;
}

const screenWidth = Dimensions.get('window').width;

export function AnimatedRow({ index, direction = 'right', children }: Props) {
  const startX = direction === 'right' ? screenWidth : -screenWidth;
  const translateX = useRef(new Animated.Value(startX)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    translateX.setValue(startX);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 0,
        duration: 300,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        delay: index * 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, [direction]);

  return (
    <Animated.View style={{ transform: [{ translateX }], opacity }}>
      {children}
    </Animated.View>
  );
}
