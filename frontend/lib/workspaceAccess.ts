export const secondarySettingsMessage =
  "Solo lectura en la segunda ventana. Para modificar la configuración, usá la ventana principal.";

export function isSecondaryWindow() {
  return typeof window !== "undefined" && window.self !== window.top;
}

export function assertSettingsEditable() {
  if (isSecondaryWindow()) {
    throw new Error(secondarySettingsMessage);
  }
}
