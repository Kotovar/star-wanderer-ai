# Settlement expedition sprite

## Goal

Replace the settlement cell's canvas-only fallback with a matching atlas sprite.

## Asset

- Add one tenth, 560 x 561 transparent frame to `public/assets/expedition_locations.webp`.
- The frame shows a neutral pre-spacefaring settlement: several compact stone-and-wood homes, a path, and a warm central fire.
- It uses the atlas's pixel-art rendering, dark outline, cool cyan accents, and amber light.
- It contains no antennae, spacecraft, orbit imagery, or technology-level marker, so discovery does not reveal civilization progress before contact.

## Integration

- Map `settlement` to atlas frame 9 and set the frame count to 10.
- Keep the existing canvas settlement icon as the image-load fallback.
- No gameplay, contact, base, localization, or save-data behavior changes.

## Verification

- Confirm the final atlas dimensions are 5600 x 561 with alpha.
- Run `npm run type-check`, `npm run lint`, and `git diff --check`.
