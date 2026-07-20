/** Прогревает кэш браузера в фоне, не конкурируя с критичными ресурсами при старте */
export function preloadGameImages() {
  const load = () => {
    for (const src of GAME_IMAGE_PRELOADS) {
      const image = new Image();
      image.src = src;
    }
  };

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(load, { timeout: 5000 });
  } else {
    setTimeout(load, 2000);
  }
}

export const GAME_IMAGE_PRELOADS = [
  "/assets/ship.webp",
  "/assets/races.webp",
  "/assets/professions/human.webp",
  "/assets/professions/synthetic.webp",
  "/assets/professions/xenosymbiont.webp",
  "/assets/professions/krylorian.webp",
  "/assets/professions/voidborn.webp",
  "/assets/professions/crystalline.webp",
  "/assets/plantes/planets.webp",
  "/assets/plantes/gas-planets.webp",
  "/assets/stations.webp",
  "/assets/stars.webp",
  "/assets/icons.webp",
  "/assets/icons-add.webp",
  "/assets/icons-crew.webp",
  "/assets/expedition_locations.webp",
  "/assets/tech.webp",
];
