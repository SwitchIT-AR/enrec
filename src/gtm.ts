type DataLayerWindow = Window & { dataLayer: object[] };

export function gtmPush(event: Record<string, unknown>) {
  (window as unknown as DataLayerWindow).dataLayer ??= [];
  (window as unknown as DataLayerWindow).dataLayer.push(event);
}

export function gtagConversion(label: string) {
  const id = import.meta.env.VITE_GTAG_ID;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof (window as any).gtag === "function" && id && !id.startsWith("AW-XXX")) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).gtag("event", "conversion", { send_to: `${id}/${label}` });
  }
}
