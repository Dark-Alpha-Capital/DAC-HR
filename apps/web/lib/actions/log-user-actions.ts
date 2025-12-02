function safeGtag(...args: any[]) {
  if (typeof window !== "undefined" && typeof (window as any).gtag === "function") {
    (window as any).gtag(...args);
  } else {
    console.warn("gtag not loaded yet:", args);
  }
}

export function logUserChange({
  username,
  email,
  changeType,
  metadata = {},
}: {
  username: string;
  email: string;
  changeType: string;
  metadata?: Record<string, any>;
}) {
  safeGtag("event", "user_change", {
    user_name: username,
    user_email: email,
    change_type: changeType,
    ...metadata,
  });
}
