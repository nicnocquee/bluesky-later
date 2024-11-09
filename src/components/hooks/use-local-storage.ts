import { useSyncExternalStore, useCallback } from "react";

export const useLocalStorage = (key: string, initialValue?: string | null) => {
  const data = useSyncExternalStore(
    (onChange) => {
      const onStorageEvent = (e: Event) => {
        const customEvent = e as CustomEvent;
        if (customEvent.detail.key === key) {
          onChange();
        }
      };
      window.addEventListener("storage", onChange);
      window.addEventListener(
        "local-storage-change",
        onStorageEvent as EventListener
      );
      return () => {
        window.removeEventListener("storage", onChange);
        window.removeEventListener(
          "local-storage-change",
          onStorageEvent as EventListener
        );
      };
    },
    () => {
      const data = localStorage.getItem(key);
      return data || initialValue;
    },
    () => initialValue
  );

  const setData = useCallback(
    (value: string) => {
      localStorage.setItem(key, value);
      window.dispatchEvent(
        new CustomEvent("local-storage-change", { detail: { key } })
      );
    },
    [key]
  );

  return [data, setData] as const;
};
