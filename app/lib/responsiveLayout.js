"use client";

import { useSyncExternalStore } from "react";

export const OSA_BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};

export const OSA_MOBILE_MAX_WIDTH = OSA_BREAKPOINTS.md - 1;

export function getResponsiveTier(width) {
  if (width >= OSA_BREAKPOINTS.xl) return "xl";
  if (width >= OSA_BREAKPOINTS.lg) return "lg";
  if (width >= OSA_BREAKPOINTS.md) return "md";
  if (width >= OSA_BREAKPOINTS.sm) return "sm";
  return "xs";
}

export function rv(isMobile, desktopValue, mobileValue) {
  return isMobile ? mobileValue : desktopValue;
}

export function responsiveStyle(isMobile, desktopStyle = {}, mobileStyle = {}) {
  return isMobile ? { ...desktopStyle, ...mobileStyle } : desktopStyle;
}

function subscribeToViewport(callback) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("resize", callback, { passive: true });
  return () => window.removeEventListener("resize", callback);
}

function getViewportWidthSnapshot() {
  if (typeof window === "undefined") return OSA_MOBILE_MAX_WIDTH;
  return window.innerWidth;
}

function getViewportWidthServerSnapshot() {
  return OSA_MOBILE_MAX_WIDTH;
}

export function useResponsiveLayout() {
  const width = useSyncExternalStore(
    subscribeToViewport,
    getViewportWidthSnapshot,
    getViewportWidthServerSnapshot
  );

  const tier = getResponsiveTier(width);
  const isMobile = width <= OSA_MOBILE_MAX_WIDTH;

  return {
    width,
    tier,
    isXs: tier === "xs",
    isSm: tier === "sm",
    isMd: tier === "md",
    isLg: tier === "lg",
    isXl: tier === "xl",
    isMobile,
    isTablet: width >= OSA_BREAKPOINTS.md && width < OSA_BREAKPOINTS.lg,
    isDesktop: width >= OSA_BREAKPOINTS.lg,
    workspaceNarrow: width < OSA_BREAKPOINTS.xl,
    workspaceThreeColumn: width >= OSA_BREAKPOINTS.xl,
  };
}
