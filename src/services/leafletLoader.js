const LEAFLET_CSS_ID = "leaflet-css-cdn";
const LEAFLET_JS_ID = "leaflet-js-cdn";
const LEAFLET_CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

let leafletPromise = null;

const appendCssIfMissing = () => {
  if (document.getElementById(LEAFLET_CSS_ID)) return;

  const stylesheet = document.createElement("link");
  stylesheet.id = LEAFLET_CSS_ID;
  stylesheet.rel = "stylesheet";
  stylesheet.href = LEAFLET_CSS_URL;
  stylesheet.crossOrigin = "";
  document.head.appendChild(stylesheet);
};

export const loadLeaflet = () => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Leaflet can only be loaded in a browser."));
  }

  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;

  appendCssIfMissing();

  leafletPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(LEAFLET_JS_ID);
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.L));
      existingScript.addEventListener("error", () => reject(new Error("Failed to load Leaflet script.")));
      return;
    }

    const script = document.createElement("script");
    script.id = LEAFLET_JS_ID;
    script.src = LEAFLET_JS_URL;
    script.async = true;
    script.crossOrigin = "";
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error("Failed to load Leaflet script."));
    document.body.appendChild(script);
  });

  return leafletPromise;
};

