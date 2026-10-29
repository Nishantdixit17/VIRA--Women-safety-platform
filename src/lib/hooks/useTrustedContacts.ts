"use client";

import { useCallback, useEffect, useState } from "react";

export interface TrustedContactRecord {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  consentWhen: "MANUAL" | "NIGHT_ONLY" | "HIGH_RISK_ZONE" | "SOS_ONLY";
  consentWhatJson: string;
  consentDurationMinutes: number;
  isActive: boolean;
  currentlySharing: boolean;
}

/**
 * Loads the user's trusted contacts so Trusted Circle, Trip Monitor and SOS
 * all show the same live list (count + details).
 */
export function useTrustedContacts() {
  const [contacts, setContacts] = useState<TrustedContactRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/circle");
      const data = await res.json();
      if (Array.isArray(data.contacts)) setContacts(data.contacts);
    } catch {
      // keep what we have
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { contacts, loading, reload, setContacts };
}

/** Digits-only phone, defaulting to India (+91) for 10-digit numbers. */
export function phoneToIntl(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
}
