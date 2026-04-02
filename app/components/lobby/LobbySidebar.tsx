"use client";

import React from "react";
import { Users, Settings, History } from "lucide-react";
import styles from "@/styles/lobby.module.css";

export type TabType = "lobbies" | "friends" | "settings" | "history";

interface LobbySidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export default function LobbySidebar({
  activeTab,
  onTabChange,
}: LobbySidebarProps) {
  return (
    <div className={styles.sidebar}>
      <div className={styles.sidebarNav}>
        <button
          onClick={() => onTabChange("lobbies")}
          className={`${styles.navButton} ${
            activeTab === "lobbies" ? styles.navButtonActive : ""
          }`}
        >
          <Users size={20} />
          Lobbies
        </button>

        <button
          onClick={() => onTabChange("friends")}
          className={`${styles.navButton} ${
            activeTab === "friends" ? styles.navButtonActive : ""
          }`}
        >
          <Users size={20} />
          Friends
        </button>

        <button
          onClick={() => onTabChange("settings")}
          className={`${styles.navButton} ${
            activeTab === "settings" ? styles.navButtonActive : ""
          }`}
        >
          <Settings size={20} />
          Settings
        </button>

        <button
          onClick={() => onTabChange("history")}
          className={`${styles.navButton} ${
            activeTab === "history" ? styles.navButtonActive : ""
          }`}
        >
          <History size={20} />
          Game History
        </button>
      </div>
    </div>
  );
}