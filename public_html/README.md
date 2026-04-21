# Standalone Mobile Ghost Meter

This directory contains a standalone mobile-first version of the ghost meter extracted from the app and rewritten to run as a plain server-hosted webpage.

## Files

- `index.html` - standalone page shell
- `styles.css` - mobile-first styling and layout
- `app.js` - browser sensor logic, canvas rendering, and camera/audio handling

## Deployment

Serve this directory from a normal web server so that `public_html/index.html` is reachable over **HTTPS**.

Example layout:

- `https://example.com/index.html`
- `https://example.com/styles.css`
- `https://example.com/app.js`

## Notes

For best results on phones:

- use HTTPS for microphone, camera, motion, and geolocation access
- expect iPhone motion permissions to require a user tap
- expect battery, vibration, and touch pressure support to vary by browser/device
- the page is designed to degrade gracefully when a browser does not expose a given sensor API
