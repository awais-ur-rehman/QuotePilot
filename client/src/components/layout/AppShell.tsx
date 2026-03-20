import { Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import ProfileSetupModal from "../common/ProfileSetupModal";
import { useProfile } from "../../context/ProfileContext";

export default function AppShell() {
  const { profile, saveProfile } = useProfile();
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    if (!profile) {
      const timer = setTimeout(() => setShowProfileModal(true), 800);
      return () => clearTimeout(timer);
    }
  }, [profile]);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#FAFAFA]">
        <Outlet />
      </div>

      {showProfileModal && !profile && (
        <ProfileSetupModal
          onSave={(p) => { saveProfile(p); setShowProfileModal(false); }}
        />
      )}
    </div>
  );
}
