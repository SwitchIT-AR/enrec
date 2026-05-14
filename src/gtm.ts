type DataLayerWindow = Window & { dataLayer: object[] };

export function gtmPush(event: Record<string, unknown>) {
  (window as unknown as DataLayerWindow).dataLayer ??= [];
  (window as unknown as DataLayerWindow).dataLayer.push(event);
}

export function gtagConversion(label: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof (window as any).gtag === "function") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).gtag("event", "conversion", { send_to: `AW-17026930686/${label}` });
  }
}
