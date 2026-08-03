import { useEffect } from "react";

export function useTabSwitchDetection(
  enabled: boolean,
  onTabSwitch: () => void,
) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const onVisibilityChange = () => {
      if (document.hidden) {
        onTabSwitch();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled, onTabSwitch]);
}
