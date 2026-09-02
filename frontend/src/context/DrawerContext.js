import React, { createContext, useContext, useRef, useState, useCallback } from "react";
import { Animated } from "react-native";

const DRAWER_WIDTH = 300;

const DrawerContext = createContext({
  isOpen: false,
  translateX: null,
  scrimOpacity: null,
  openDrawer: () => {},
  closeDrawer: () => {},
});

/**
 * DrawerProvider — wraps a DriverStack/FieldAgentStack root.
 * Provides animated values for the side drawer so that:
 *   1. Any screen can call openDrawer() to slide the panel in.
 *   2. FloatingTabBar hides itself while the drawer is open.
 *   3. All animation is centralised here (spring-in, timing-out).
 */
export function DrawerProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const scrimOpacity = useRef(new Animated.Value(0)).current;

  const openDrawer = useCallback(() => {
    setIsOpen(true);
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        damping: 22,
        stiffness: 200,
        mass: 0.8,
      }),
      Animated.timing(scrimOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateX, scrimOpacity]);

  const closeDrawer = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: -DRAWER_WIDTH,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scrimOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setIsOpen(false));
  }, [translateX, scrimOpacity]);

  return (
    <DrawerContext.Provider value={{ isOpen, translateX, scrimOpacity, openDrawer, closeDrawer }}>
      {children}
    </DrawerContext.Provider>
  );
}

export function useDrawer() {
  return useContext(DrawerContext);
}

export const DRAWER_WIDTH_EXPORT = DRAWER_WIDTH;
