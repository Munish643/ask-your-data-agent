"use client";

import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";

const PAGE_REVEAL_SELECTOR = "[data-anime-page] [data-anime-reveal], [data-anime-page] [data-anime-stagger] > *";
const HOVER_SELECTOR = "[data-anime-hover]";

type AnimeModule = typeof import("animejs");

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getHoverTarget(event: Event) {
  const target = event.target;
  return target instanceof Element ? target.closest<HTMLElement>(HOVER_SELECTOR) : null;
}

export function AnimeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if (prefersReducedMotion()) {
      return;
    }

    let cancelled = false;
    let cleanup = () => undefined;
    const frame = window.requestAnimationFrame(() => {
      void import("animejs").then(({ animate, stagger }) => {
        if (cancelled) {
          return;
        }

        const elements = Array.from(document.querySelectorAll<HTMLElement>(PAGE_REVEAL_SELECTOR)).filter(
          (element) => element.offsetParent !== null && !element.closest("[data-anime-skip]")
        );

        if (!elements.length) {
          return;
        }

        const animation = animate(elements, {
          opacity: [0, 1],
          translateY: [12, 0],
          duration: 420,
          delay: stagger(28),
          ease: "outCubic"
        });

        cleanup = () => {
          animation.revert();
        };
      });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      cleanup();
    };
  }, [pathname]);

  useEffect(() => {
    if (prefersReducedMotion()) {
      return;
    }

    let anime: AnimeModule | null = null;
    let cancelled = false;

    void import("animejs").then((module) => {
      if (!cancelled) {
        anime = module;
      }
    });

    const handleEnter = (event: Event) => {
      const target = getHoverTarget(event);
      if (!target || target.dataset.animeHoverActive === "true") {
        return;
      }

      target.dataset.animeHoverActive = "true";
      anime?.animate(target, {
        translateY: -2,
        scale: 1.01,
        duration: 160,
        ease: "outCubic"
      });
    };

    const handleLeave = (event: Event) => {
      const target = getHoverTarget(event);
      if (!target || target.dataset.animeHoverActive !== "true") {
        return;
      }

      target.dataset.animeHoverActive = "false";
      anime?.animate(target, {
        translateY: 0,
        scale: 1,
        duration: 180,
        ease: "outCubic"
      });
    };

    document.addEventListener("pointerover", handleEnter, { passive: true });
    document.addEventListener("pointerout", handleLeave, { passive: true });
    document.addEventListener("focusin", handleEnter);
    document.addEventListener("focusout", handleLeave);

    return () => {
      cancelled = true;
      document.removeEventListener("pointerover", handleEnter);
      document.removeEventListener("pointerout", handleLeave);
      document.removeEventListener("focusin", handleEnter);
      document.removeEventListener("focusout", handleLeave);
    };
  }, []);

  return children;
}
