import React, { useState, useEffect } from "react";
import { X, Plus, Minus } from "lucide-react";
import styles from "@/styles/gameboard.module.css";
import { resourceEmojiByType, resourceTypes } from "../constants";
import { ResourceType } from "../types";

interface YearOfPlentyResourceSelectorPopupProps {
  isVisible: boolean;
  onConfirm: (resources: ResourceType[] | null) => void;
}

export function YearOfPlentyResourceSelectorPopup({
  isVisible,
  onConfirm,
}: YearOfPlentyResourceSelectorPopupProps) {
  const [selection, setSelection] = useState<Record<ResourceType, number>>({
    wood: 0,
    brick: 0,
    wool: 0,
    wheat: 0,
    ore: 0,
  });

  useEffect(() => {
    if (isVisible) {
      setSelection({ wood: 0, brick: 0, wool: 0, wheat: 0, ore: 0 });
    }
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  const totalSelected = Object.values(selection).reduce((a, b) => a + b, 0);

  const handleAdjust = (resource: ResourceType, delta: number) => {
    setSelection((prev) => {
      const current = prev[resource];
      const next = current + delta;
      if (next < 0) return prev;
      if (delta > 0 && totalSelected >= 2) return prev;
      return { ...prev, [resource]: next };
    });
  };

  const handleConfirmClick = () => {
    const chosen: ResourceType[] = [];
    resourceTypes.forEach((r) => {
      for (let i = 0; i < selection[r]; i++) {
        chosen.push(r);
      }
    });
    onConfirm(chosen);
  };

  return (
    <div className={styles.modalOverlay} style={{ zIndex: 9999 }}>
      <div 
        className={styles.dicePopupCard} 
        style={{ 
          position: "relative", 
          padding: "40px 20px 20px",
          pointerEvents: "auto",
          maxWidth: "600px"
        }}
      >
        <button
          type="button"
          className={styles.closeButton}
          onClick={() => onConfirm(null)}
          aria-label="Close"
          style={{
            color: "#000000",
            backgroundColor: "#dc2626",
            position: "absolute",
            top: "10px",
            right: "10px",
            border: "none",
            borderRadius: "50%",
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 10,
          }}
        >
          <X size={20} />
        </button>
        <h3 className={styles.popupTitle}>Year of Plenty: Select 2 Resources</h3>
        <p style={{ marginBottom: "20px", fontWeight: "bold", textAlign: "center" }}>{totalSelected} / 2 selected</p>
        <div className={styles.monopolyResourceButtonsContainer} style={{ display: "flex", justifyContent: "center", gap: "15px", flexWrap: "nowrap", marginBottom: "30px" }}>
          {resourceTypes.map((resource) => {
            const resourceClassName = `resourcePanelTile${resource.charAt(0).toUpperCase() + resource.slice(1)}`;
            const count = selection[resource];
            return (
              <div key={resource} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                <div
                  className={`${styles.resourcePanelTile} ${styles[resourceClassName as keyof typeof styles]}`}
                  style={{
                    width: "100px",
                    height: "100px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    cursor: "default"
                  }}
                >
                  <span style={{ fontSize: "3rem" }}>{resourceEmojiByType[resource]}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", backgroundColor: "rgba(0,0,0,0.1)", borderRadius: "20px", padding: "5px 10px" }}>
                  <button type="button" onClick={() => handleAdjust(resource, -1)} disabled={count === 0} style={{ background: "none", border: "none", cursor: count > 0 ? "pointer" : "default", opacity: count > 0 ? 1 : 0.3 }}><Minus size={20} /></button>
                  <span style={{ fontWeight: "bold", minWidth: "20px", textAlign: "center" }}>{count}</span>
                  <button type="button" onClick={() => handleAdjust(resource, 1)} disabled={totalSelected >= 2} style={{ background: "none", border: "none", cursor: totalSelected < 2 ? "pointer" : "default", opacity: totalSelected < 2 ? 1 : 0.3 }}><Plus size={20} /></button>
                </div>
              </div>
            );
          })}
        </div>
        <button type="button" className={styles.tradeActionButton} onClick={handleConfirmClick} disabled={totalSelected !== 2} style={{ width: "200px", margin: "0 auto", display: "block" }}>Confirm</button>
      </div>
    </div>
  );
}