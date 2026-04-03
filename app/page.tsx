"use client";

import { useRouter } from "next/navigation";
import styles from "@/styles/landing.module.css";

export default function Home() {
  const router = useRouter();

  return (
    <div className={styles.page}>
      {/* Overlay */}
      <div className={styles.overlay} />

      {/* Content */}
      <div className={styles.content}>
        {/* Title */}
        <div className={styles.header}>
          <div className={styles.banner}>
            <h1 className={styles.title}>The Settlers of Catan</h1>
          </div>
          <p className={styles.subtitle}>SoPra FS26</p>
          <p className={styles.subtitle}>Group 11</p>
        </div>

        {/* Buttons */}
        <div className={styles.actions}>
          <button
            className={styles.button}
            onClick={() => router.push("/login")}
          >
            Login
          </button>

          <button
            className={styles.button}
            onClick={() => router.push("/register")}
          >
            Register
          </button>
        </div>
      </div>
    </div>
  );
}