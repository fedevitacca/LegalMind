"use client";

import { useSyncExternalStore } from "react";
import { isSecondaryWindow } from "./workspaceAccess";

const subscribe = () => () => {};
const getServerSnapshot = () => true;

export function useSecondaryWindow() {
  // Keep settings locked until hydration identifies the current window.
  return useSyncExternalStore(subscribe, isSecondaryWindow, getServerSnapshot);
}
