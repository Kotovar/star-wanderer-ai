import type { GameStore, Location } from "@/game/types";

type LocationPatch = Partial<Location> | ((loc: Location) => Partial<Location>);

type LocationState = Pick<
    GameStore,
    "currentSector" | "currentLocation" | "galaxy"
>;

/**
 * Однотипное обновление локации по id сразу во всех трёх местах состояния:
 * currentSector, currentLocation (если это она) и galaxy.sectors.
 *
 * Синхронизация с galaxy обязательна: при входе в сектор currentSector
 * пересобирается из galaxy.sectors, и изменения без синка теряются.
 *
 * Использование внутри set():
 *   set((s) => ({ turn: s.turn + 1, ...patchLocation(s, planetId, { explored: true }) }))
 *
 * patch может быть функцией от локации — для обновлений, зависящих от
 * текущих полей (например, дописать запись в surfaceLog).
 */
export function patchLocation(
    s: LocationState,
    locationId: string,
    patch: LocationPatch,
): LocationState {
    const apply = (loc: Location): Location => ({
        ...loc,
        ...(typeof patch === "function" ? patch(loc) : patch),
    });

    const updatedSector = s.currentSector
        ? {
              ...s.currentSector,
              locations: s.currentSector.locations.map((loc) =>
                  loc.id === locationId ? apply(loc) : loc,
              ),
          }
        : null;

    return {
        currentSector: updatedSector,
        currentLocation:
            s.currentLocation?.id === locationId
                ? apply(s.currentLocation)
                : s.currentLocation,
        galaxy: updatedSector
            ? {
                  ...s.galaxy,
                  sectors: s.galaxy.sectors.map((sec) =>
                      sec.id === updatedSector.id ? updatedSector : sec,
                  ),
              }
            : s.galaxy,
    };
}
