type DataLayerWindow = Window & { dataLayer: object[] };

export function gtmPush(event: Record<string, unknown>) {
  (window as unknown as DataLayerWindow).dataLayer ??= [];
  (window as unknown as DataLayerWindow).dataLayer.push(event);
}
