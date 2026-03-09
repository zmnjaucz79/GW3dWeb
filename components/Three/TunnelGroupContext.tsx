'use client';

import { createContext, useContext, type RefObject } from 'react';
import type * as THREE from 'three';

export const TunnelGroupContext = createContext<RefObject<THREE.Group | null> | null>(null);

export function useTunnelGroupRef() {
  return useContext(TunnelGroupContext);
}
