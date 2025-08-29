# Basketball (Phaser 3 + TypeScript)

Singleplayer 2D basketball game that runs on mobile and desktop. Drag from the ball to aim; release to shoot. Score when the ball passes cleanly through the hoop.

## Dev

- Run locally:
  - `npm start` (serves on http://localhost:8080)
- Build:
  - `npm run build` (outputs `public/game.js`)

## Deploy (on droplet)

Use the helper deploy script documented in the platform README:

- `deploy_static /root/Projects/apps/basketball/public basketball`

Then access via:

- Platform path: `http://<droplet-ip>/apps/basketball/`
- Domain (if configured): `https://basketball.mertgulsun.com/`

## Controls

- Touch/Mouse: Drag from the ball to set aim and power (longer drag → more power). Release to shoot.
- The hoop is on the right; shots reset when out of bounds or at rest.

## Notes

- Uses generated textures (no external assets) for easy deployment.
- Physics: Arcade Physics with backboard and rim-edge colliders; net sensors detect clean makes.
