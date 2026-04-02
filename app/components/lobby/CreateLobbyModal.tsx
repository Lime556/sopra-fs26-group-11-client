"use client";

import React from "react";
import { X } from "lucide-react";
import styles from "@/styles/lobby.module.css";

interface CreateLobbyModalProps {
  open: boolean;
  newLobbyName: string;
  newLobbyIsPrivate: boolean;
  newLobbyPassword: string;
  createLobbyError: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onNameChange: (value: string) => void;
  onPrivateChange: (checked: boolean) => void;
  onPasswordChange: (value: string) => void;
}

export default function CreateLobbyModal({
  open,
  newLobbyName,
  newLobbyIsPrivate,
  newLobbyPassword,
  createLobbyError,
  onClose,
  onSubmit,
  onNameChange,
  onPrivateChange,
  onPasswordChange,
}: CreateLobbyModalProps) {
  if (!open) return null;

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Create Lobby</h3>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className={styles.formStack}>
          <div>
            <label className={styles.inputLabel}>Lobby Name</label>
            <input
              type="text"
              value={newLobbyName}
              onChange={(e) => onNameChange(e.target.value)}
              className={styles.input}
            />
            {createLobbyError && (
              <p className={styles.errorText}>{createLobbyError}</p>
            )}
          </div>

          <div>
            <label className={styles.inputLabel}>Privacy</label>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={newLobbyIsPrivate}
                onChange={(e) => onPrivateChange(e.target.checked)}
              />
              <span>Make this lobby private</span>
            </label>
          </div>

          {newLobbyIsPrivate && (
            <div>
              <label className={styles.inputLabel}>Password</label>
              <input
                type="password"
                value={newLobbyPassword}
                onChange={(e) => onPasswordChange(e.target.value)}
                className={styles.input}
              />
            </div>
          )}

          <button type="submit" className={styles.modalActionButton}>
            Create Lobby
          </button>
        </form>
      </div>
    </div>
  );
}