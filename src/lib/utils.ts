import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function scrollFocusedFieldIntoView(element: Element) {
  const scroll = () => {
    const scrollContainer = findScrollContainer(element);
    const visualViewportOffsetTop = window.visualViewport?.offsetTop ?? 0;
    const topPadding = visualViewportOffsetTop + 16;
    const rect = element.getBoundingClientRect();

    if (scrollContainer) {
      const containerRect = scrollContainer.getBoundingClientRect();
      const top = scrollContainer.scrollTop + rect.top - containerRect.top - 16;
      scrollContainer.scrollTo({
        top: Math.max(0, top),
        behavior: "smooth",
      });
      return;
    }

    window.scrollTo({
      top: Math.max(0, window.scrollY + rect.top - topPadding),
      behavior: "smooth",
    });
  };

  window.setTimeout(scroll, 500);
  window.setTimeout(scroll, 820);
}

function findScrollContainer(element: Element) {
  let parent = element.parentElement;

  while (parent) {
    const { overflowY } = window.getComputedStyle(parent);
    if ((overflowY === "auto" || overflowY === "scroll") && parent.scrollHeight > parent.clientHeight) {
      return parent;
    }

    parent = parent.parentElement;
  }

  return null;
}
