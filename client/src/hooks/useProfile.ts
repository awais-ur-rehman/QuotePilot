import { useState, useCallback } from "react";

export interface Profile {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
}

const STORAGE_KEY = "qp_profile";

function readProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

function writeProfile(profile: Profile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(() => readProfile());

  const saveProfile = useCallback((p: Profile) => {
    writeProfile(p);
    setProfile(p);
  }, []);

  const clearProfile = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setProfile(null);
  }, []);

  return { profile, saveProfile, clearProfile };
}
