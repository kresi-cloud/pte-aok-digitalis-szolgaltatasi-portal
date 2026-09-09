import { useEffect } from "react";
import { translate, useLanguage } from "./language";

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE"]);
const ATTRS = ["placeholder", "aria-label", "title", "alt"];

export function DomTranslator() {
  const { lang } = useLanguage();

  useEffect(() => {
    if (lang !== "en" || typeof window === "undefined") return;

    const applyNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const parent = node.parentElement;
        if (!parent || SKIP_TAGS.has(parent.tagName)) return;
        if (parent.closest("[data-no-i18n]")) return;
        const text = node.nodeValue ?? "";
        if (!text.trim()) return;
        const next = translate(text, "en");
        if (next !== text) node.nodeValue = next;
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node as Element;
      if (SKIP_TAGS.has(el.tagName) || el.hasAttribute("data-no-i18n")) return;
      for (const attr of ATTRS) {
        const v = el.getAttribute(attr);
        if (v) {
          const next = translate(v, "en");
          if (next !== v) el.setAttribute(attr, next);
        }
      }
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const texts: Text[] = [];
      while (walker.nextNode()) texts.push(walker.currentNode as Text);
      texts.forEach(applyNode);
      el.querySelectorAll(ATTRS.map((a) => `[${a}]`).join(",")).forEach((child) => {
        if (child.closest("[data-no-i18n]")) return;
        for (const attr of ATTRS) {
          const v = child.getAttribute(attr);
          if (v) {
            const next = translate(v, "en");
            if (next !== v) child.setAttribute(attr, next);
          }
        }
      });
    };

    let scheduled = false;
    const run = () => {
      scheduled = false;
      observer.disconnect();
      applyNode(document.body);
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributeFilter: ATTRS,
      });
    };
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(run);
    };
    const observer = new MutationObserver(schedule);
    run();
    document.title = translate(document.title, "en");

    return () => observer.disconnect();
  }, [lang]);

  return null;
}
