import React from "react";
import { X } from "lucide-react";
import styles from "@/styles/gameboard.module.css";
import { resourceEmojiByType, resourceTypes } from "../constants";
import { ResourceType } from "../types";

interface MonopolyResourceSelectorPopupProps {
  isVisible: boolean;
  onSelectResource: (resource: ResourceType | null) => void;
  onClose: () => void;
}

export function MonopolyResourceSelectorPopup({
  isVisible,
  onSelectResource,
  onClose,
}: MonopolyResourceSelectorPopupProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <div className={styles.modalOverlay} style={{ zIndex: 9999 }}>
      <div 
        className={styles.dicePopupCard} 
        style={{ 
          position: "relative", 
          padding: "40px 20px 20px",
          pointerEvents: "auto" 
        }}
      >
        <button
          type="button"
          className={styles.closeButton}
          onClick={() => onSelectResource(null)}
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
        <h3 className={styles.popupTitle} style={{ marginBottom: "30px" }}>Monopoly: Select Resource to Claim</h3>
        <div className={styles.monopolyResourceButtonsContainer} style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
          {resourceTypes.map((resource) => {
            const resourceClassName = `resourcePanelTile${resource.charAt(0).toUpperCase() + resource.slice(1)}`;
            return (
              <button
                type="button"
                key={resource}
                className={`${styles.resourcePanelTile} ${styles[resourceClassName as keyof typeof styles]}`}
                onClick={() => onSelectResource(resource)}
                style={{
                  border: "none",
                  cursor: "pointer",
                  width: "100px",
                  height: "100px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: "3rem" }}>{resourceEmojiByType[resource]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}