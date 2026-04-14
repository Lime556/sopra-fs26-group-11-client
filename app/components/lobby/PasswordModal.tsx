"use client";

import React from "react";
import { X } from "lucide-react";
import styles from "@/styles/lobby.module.css";

interface PasswordModalProps {
  open: boolean;
  password: string;
  passwordError: string;
  onPasswordChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function PasswordModal({
  open,
  password,
  passwordError,
  onPasswordChange,
  onClose,
  onSubmit,
}: PasswordModalProps) {
  if (!open) return null;

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Enter Password</h3>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={20} />
          </button>
        </div>

        <p className={styles.modalText}>
          This lobby is private. Enter the password to join.
        </p>

        <form onSubmit={onSubmit} className={styles.formStack}>
          <div>
            <label className={styles.inputLabel}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              className={styles.input}
            />
            {passwordError && (
              <p className={styles.errorText}>{passwordError}</p>
            )}
          </div>

          <button type="submit" className={styles.modalActionButton}>
            Join Lobby
          </button>
        </form>
      </div>
    </div>
  );
}