"use client";

import { useState, useEffect } from "react";
import { getParkData, type ParkDataItem } from "@/lib/park-data";

export function useParkData() {
  const [items, setItems] = useState<ParkDataItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getParkData()
      .then((data) => {
        if (!cancelled) {
          setItems(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("[ParkData] Failed to load:", err);
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { items, loading };
}
