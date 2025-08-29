# Free Throw (HTML5 Canvas)

Ultra-simple, static free-throw shooting game implemented in plain JavaScript on HTML5 Canvas. No frameworks, no build step.

## Play

- Desktop: Click and drag from the ball to set angle/power, release to shoot.
- Mobile: Touch and drag, release to shoot.
- Scoring: A clean pass through the rim (top sensor → bottom sensor) counts as 2 points.
- Reset: The ball resets after a make, going out-of-bounds, or settling.

## Local Run

Just open `public/index.html` in a browser.

Optional: serve the folder to avoid file:// restrictions while developing.

```
cd public
python3 -m http.server 8080
# open http://localhost:8080
```

## Deploy (on droplet)

Sync the static folder to the nginx apps root:

```
deploy_static /root/Projects/apps/basketball/public basketball
```

Access via:

- Platform path: `http://<droplet-ip>/apps/basketball/`
- Domain: `https://basketball.mertgulsun.com/`

## Tech

- No dependencies, no bundler.
- Canvas-based rendering and simple hand-rolled physics.
