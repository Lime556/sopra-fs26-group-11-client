"use client";

import React from "react";
import styles from "@/styles/lobby.module.css";

interface SettingsTabProps {
  username: string;
  email: string;
  playerId: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  onCurrentPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmitPasswordChange: (e: React.FormEvent) => void;
  passwordMessage?: string;
}

export default function SettingsTab({
  username,
  email,
  playerId,
  currentPassword,
  newPassword,
  confirmPassword,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onSubmitPasswordChange,
  passwordMessage,
}: SettingsTabProps) {
  return (
    <div>
      <h2 className={styles.sectionTitle}>Settings</h2>

      <div className={styles.settingsCard}>
        <div className={styles.settingsSection}>
          <h3 className={styles.settingsSectionTitle}>Account</h3>

          <div className={styles.formGrid}>
            <div>
              <label className={styles.inputLabel}>Username</label>
              <input
                type="text"
                value={username}
                readOnly
                className={styles.readonlyInput}
              />
            </div>

            <div>
              <label className={styles.inputLabel}>Email</label>
              <input
                type="email"
                value={email}
                readOnly
                className={styles.readonlyInput}
              />
            </div>

            <div>
              <label className={styles.inputLabel}>Player ID</label>
              <input
                type="text"
                value={playerId}
                readOnly
                className={styles.readonlyInput}
              />
            </div>
          </div>
        </div>

        <div className={styles.settingsSection}>
          <h3 className={styles.settingsSectionTitle}>Change Password</h3>

          <form onSubmit={onSubmitPasswordChange} className={styles.formGrid}>
            <div>
              <label className={styles.inputLabel}>Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => onCurrentPasswordChange(e.target.value)}
                placeholder="Enter current password"
                className={styles.input}
              />
            </div>

            <div>
              <label className={styles.inputLabel}>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => onNewPasswordChange(e.target.value)}
                placeholder="Enter new password"
                className={styles.input}
              />
            </div>

            <div>
              <label className={styles.inputLabel}>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => onConfirmPasswordChange(e.target.value)}
                placeholder="Confirm new password"
                className={styles.input}
              />
            </div>

            <button className={styles.fullWidthButton}>
              Update Password
            </button>
            {passwordMessage && (
              <p className={styles.modalText}>{passwordMessage}</p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}