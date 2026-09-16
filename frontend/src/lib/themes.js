// Thèmes prêts à l'emploi : chaque vendeur choisit une base + sa couleur d'accent.
export const THEME_PRESETS = {
  "dark-premium": {
    label: "Sombre premium",
    canvas: "#23262B",
    surface: "#2C3038",
    ink: "#F5F5F0",
    muted: "#9A9DA6",
    defaultAccent: "#D4FF3D",
  },
  "light-classic": {
    label: "Clair classique",
    canvas: "#FAFAF8",
    surface: "#FFFFFF",
    ink: "#171717",
    muted: "#6B7280",
    defaultAccent: "#14213D",
  },
  "cream-editorial": {
    label: "Éditorial crème",
    canvas: "#FAF7F2",
    surface: "#FFFFFF",
    ink: "#1C1A17",
    muted: "#6B6459",
    defaultAccent: "#BB4F2E",
  },
  "pop-energique": {
    label: "Coloré énergique",
    canvas: "#FFFFFF",
    surface: "#F9FAFB",
    ink: "#14142B",
    muted: "#8F8FA3",
    defaultAccent: "#FF3D71",
  },
};

function hexToRgbTriplet(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r} ${g} ${b}`;
}

function contrastTriplet(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "26 28 31" : "255 255 255";
}

/** Applique dynamiquement un thème (utilisé sur la page produit publique). */
export function applyTheme(themeKey, accentColor) {
  const preset = THEME_PRESETS[themeKey] || THEME_PRESETS["dark-premium"];
  const accent = accentColor || preset.defaultAccent;
  const root = document.documentElement.style;
  root.setProperty("--canvas", hexToRgbTriplet(preset.canvas));
  root.setProperty("--surface", hexToRgbTriplet(preset.surface));
  root.setProperty("--ink", hexToRgbTriplet(preset.ink));
  root.setProperty("--muted", hexToRgbTriplet(preset.muted));
  root.setProperty("--accent", hexToRgbTriplet(accent));
  root.setProperty("--accent-ink", contrastTriplet(accent));
}

/** Remet le thème sombre par défaut (utilisé dans le back-office, qui reste
 * toujours neutre quel que soit le thème choisi pour la boutique). */
export function resetToAdminTheme() {
  applyTheme("dark-premium", THEME_PRESETS["dark-premium"].defaultAccent);
}
