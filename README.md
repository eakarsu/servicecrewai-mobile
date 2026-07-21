# ServiceCrew AI Mobile

This repository now has a real bundled Capacitor web target. It does not use a
hardcoded LAN development server.

## Local build

```sh
npm run check
npm run build
npm run sync
```

`npm run build` copies the reviewed static assets from `src/` into Capacitor's
configured `dist/` directory. The app starts offline and accepts only an HTTPS
service URL (or localhost during development). It stores the URL—not
credentials—in device local storage.

The actual field-service API contract, authentication, offline job data,
camera/location consent flows, push registration, and production signing remain
product work. Do not point the shell at customer data until those controls and
tests exist.
