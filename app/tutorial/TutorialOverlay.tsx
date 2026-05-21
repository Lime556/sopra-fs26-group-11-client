"use client";

import { useLayoutEffect, useMemo, useState } from "react";
import styles from "@/styles/gameboard.module.css";
import { tutorialSteps } from "./tutorialSteps";

type Props = {
  currentStepIndex: number;
  onStepChange: (stepIndex: number) => void;
  onClose: () => void;
};

const TOOLTIP_WIDTH = 340;
const TOOLTIP_HEIGHT = 260;
const VIEWPORT_PADDING = 24;

export function TutorialOverlay({ currentStepIndex, onStepChange, onClose }: Props) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = tutorialSteps[currentStepIndex];

  useLayoutEffect(() => {
    if (!step.target) {
      setTargetRect(null);
      return;
    }

    const element = document.querySelector(
      `[data-tutorial="${step.target}"]`
    );

    if (!(element instanceof HTMLElement)) {
      setTargetRect(null);
      return;
    }

    element.scrollIntoView({
      behavior: "auto",
      block: "center",
    });

    const updateRect = () => {
      setTargetRect(element.getBoundingClientRect());
    };

    updateRect();
    const animationFrame = window.requestAnimationFrame(updateRect);

    // Keep aligned on resize
    window.addEventListener("resize", updateRect);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", updateRect);
    };
  }, [step.target]);

  const tooltipPosition = useMemo(() => {
    if (!targetRect) {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const spaceBelow = viewportHeight - targetRect.bottom;
    const spaceAbove = targetRect.top;
    const spaceRight = viewportWidth - targetRect.right;
    const spaceLeft = targetRect.left;

    const comfortableVerticalSpace =
      TOOLTIP_HEIGHT + 80;

    const canFitBelow =
      spaceBelow >= comfortableVerticalSpace;

    const canFitAbove =
      spaceAbove >= comfortableVerticalSpace;

    const canFitRight =
      spaceRight >= TOOLTIP_WIDTH + 40;

    const canFitLeft =
      spaceLeft >= TOOLTIP_WIDTH + 40;

    /* -------------------------------- */
    /* PREFER SIDE POSITIONING FIRST    */
    /* if vertical space is tight       */
    /* -------------------------------- */

    if (!canFitBelow && !canFitAbove) {
      if (canFitRight) {
        let top =
          targetRect.top +
          targetRect.height / 2;

        top = Math.max(
          TOOLTIP_HEIGHT / 2 + VIEWPORT_PADDING,
          top
        );

        top = Math.min(
          viewportHeight -
            TOOLTIP_HEIGHT / 2 -
            VIEWPORT_PADDING,
          top
        );

        return {
          top,
          left: targetRect.right + 24,
          transform: "translateY(-50%)",
        };
      }

      if (canFitLeft) {
        let top =
          targetRect.top +
          targetRect.height / 2;

        top = Math.max(
          TOOLTIP_HEIGHT / 2 + VIEWPORT_PADDING,
          top
        );

        top = Math.min(
          viewportHeight -
            TOOLTIP_HEIGHT / 2 -
            VIEWPORT_PADDING,
          top
        );

        return {
          top,
          left: targetRect.left - TOOLTIP_WIDTH - 24,
          transform: "translateY(-50%)",
        };
      }
    }

    /* -------------------------------- */
    /* BELOW                            */
    /* -------------------------------- */

    if (canFitBelow) {
      let left =
        targetRect.left + targetRect.width / 2;

      left = Math.max(
        TOOLTIP_WIDTH / 2 + VIEWPORT_PADDING,
        left
      );

      left = Math.min(
        viewportWidth -
          TOOLTIP_WIDTH / 2 -
          VIEWPORT_PADDING,
        left
      );

      return {
        top: targetRect.bottom + 20,
        left,
        transform: "translateX(-50%)",
      };
    }

    /* -------------------------------- */
    /* ABOVE                            */
    /* -------------------------------- */

    if (canFitAbove) {
      let left =
        targetRect.left + targetRect.width / 2;

      left = Math.max(
        TOOLTIP_WIDTH / 2 + VIEWPORT_PADDING,
        left
      );

      left = Math.min(
        viewportWidth -
          TOOLTIP_WIDTH / 2 -
          VIEWPORT_PADDING,
        left
      );

      return {
        top: targetRect.top - TOOLTIP_HEIGHT - 20,
        left,
        transform: "translateX(-50%)",
      };
    }

    /* -------------------------------- */
    /* RIGHT                            */
    /* -------------------------------- */

    if (canFitRight) {
      let top =
        targetRect.top +
        targetRect.height / 2;

      top = Math.max(
        TOOLTIP_HEIGHT / 2 + VIEWPORT_PADDING,
        top
      );

      top = Math.min(
        viewportHeight -
          TOOLTIP_HEIGHT / 2 -
          VIEWPORT_PADDING,
        top
      );

      return {
        top,
        left: targetRect.right + 32,
        transform: "translateY(-50%)",
      };
    }

    /* -------------------------------- */
    /* LEFT                             */
    /* -------------------------------- */

    if (canFitLeft) {
      let top =
        targetRect.top +
        targetRect.height / 2;

      top = Math.max(
        TOOLTIP_HEIGHT / 2 + VIEWPORT_PADDING,
        top
      );

      top = Math.min(
        viewportHeight -
          TOOLTIP_HEIGHT / 2 -
          VIEWPORT_PADDING,
        top
      );

      return {
        top,
        left:
          targetRect.left -
          TOOLTIP_WIDTH -
          32,
        transform: "translateY(-50%)",
      };
    }}, [targetRect]);

  const goNext = () => {
    if (currentStepIndex >= tutorialSteps.length - 1) {
      onClose();
      return;
    }

    onStepChange(currentStepIndex + 1);
  };

  const goBack = () => {
    onStepChange(Math.max(0, currentStepIndex - 1));
  };

  return (
    <>
      {/* DARK OVERLAY */}
      {!targetRect ? (
        <div className={styles.tutorialDarkLayer} />
      ) : null}

      {/* SPOTLIGHT */}
      {targetRect ? (
        <div
          className={styles.tutorialSpotlight}
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
        />
      ) : null}

      {/* TOOLTIP */}
      <div
        className={styles.tutorialTooltip}
        style={tooltipPosition}
      >
        <div className={styles.tutorialTooltipTitle}>
          {step.title}
        </div>

        <div className={styles.tutorialTooltipText}>
          {step.description}
        </div>

        <div className={styles.tutorialControls}>
          <button
            type="button"
            onClick={goBack}
            disabled={currentStepIndex === 0}
            className={styles.tutorialControlButton}
          >
            Back
          </button>

          <button
            type="button"
            onClick={goNext}
            className={styles.tutorialControlButton}
          >
            {currentStepIndex === tutorialSteps.length - 1
              ? "Finish"
              : "Next"}
          </button>
        </div>
      </div>
    </>
  );
}
