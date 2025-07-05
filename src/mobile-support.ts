// Mobile-specific enhancements for the code editor

export function initMobileSupport() {
  // Handle virtual keyboard on modern browsers
  if ("virtualKeyboard" in navigator) {
    try {
      // Opt out of automatic viewport resizing on mobile
      (navigator as any).virtualKeyboard.overlaysContent = true;

      // Listen for keyboard geometry changes
      (navigator as any).virtualKeyboard.addEventListener(
        "geometrychange",
        () => {
          // Adjust editor layout when virtual keyboard appears/disappears
          requestAnimationFrame(() => {
            const editor = document.querySelector(".cm-editor") as HTMLElement;
            if (editor) {
              // Force layout recalculation
              editor.style.height = "100dvh";
            }
          });
        },
      );
    } catch (error) {
      // Fallback for browsers that don't support VirtualKeyboard API
    }
  }

  // Improve touch scrolling
  document.addEventListener(
    "touchstart",
    (e) => {
      // Enable momentum scrolling on iOS
      const target = e.target as HTMLElement;
      if (target.closest(".cm-scroller")) {
        (target.style as any).webkitOverflowScrolling = "touch";
      }
    },
    { passive: true },
  );

  // Prevent zoom on double-tap for code editor
  let lastTouchEnd = 0;
  document.addEventListener(
    "touchend",
    (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        const target = e.target as HTMLElement;
        if (target.closest(".cm-editor")) {
          e.preventDefault();
        }
      }
      lastTouchEnd = now;
    },
    false,
  );

  // Add touch feedback for better UX
  document.addEventListener(
    "touchstart",
    (e) => {
      const target = e.target as HTMLElement;
      if (target.closest(".run-button, .vim-toggle-container, .error-clear")) {
        target.style.opacity = "0.7";
      }
    },
    { passive: true },
  );

  document.addEventListener(
    "touchend",
    (e) => {
      const target = e.target as HTMLElement;
      if (target.closest(".run-button, .vim-toggle-container, .error-clear")) {
        setTimeout(() => {
          target.style.opacity = "";
        }, 150);
      }
    },
    { passive: true },
  );

  // Handle orientation changes
  window.addEventListener("orientationchange", () => {
    setTimeout(() => {
      // Recalculate viewport after orientation change
      const editor = document.querySelector(".cm-editor") as HTMLElement;
      if (editor) {
        editor.style.height = "100vh";
        editor.style.height = "100dvh";
      }
    }, 500); // Delay to ensure orientation change is complete
  });

  // Add pull-to-refresh prevention for the editor area
  document.addEventListener(
    "touchmove",
    (e) => {
      const target = e.target as HTMLElement;
      if (target.closest(".cm-editor")) {
        // Prevent pull-to-refresh when at top of editor
        const scrollTop = target.closest(".cm-scroller")?.scrollTop || 0;
        if (scrollTop === 0) {
          e.preventDefault();
        }
      }
    },
    { passive: false },
  );
}
