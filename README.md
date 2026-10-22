# PosePop

Strike a pose, pop into a world. PosePop finds the people in a photo, rebuilds them in blocks, drops them into a 3D block world, and sizes the result as stickers or a 4 × 6 photo for the Cricut StickerPix Print + Cut. It works on phones, tablets and PCs, and is built for events and home use.

**Live:** https://ahsenbaig-boilerplate.github.io/PosePop/

## Run it
It's a static site with no build step. Host this folder on any static web host, for example GitHub Pages: push the folder to a repo, then go to Settings → Pages and deploy from the branch.

It has to be served over **https** (or localhost) so phones will open the camera. Opening `index.html` straight from disk won't work, because the browser blocks loading the model files from `file://`. To try it locally, run `python3 -m http.server` in this folder and open http://localhost:8000.

## Files
- `index.html`: the app
- `selfie.json`, `selfie-weights.txt`: MediaPipe Selfie Segmentation (Apache-2.0), weights base64-encoded
- `people.json`, `people-weights.txt`: MoveNet MultiPose (Apache-2.0), weights base64-encoded

## Licences
three.js (MIT) and TensorFlow.js (Apache-2.0) load from public CDNs. The two models above are Apache-2.0. The Pixelify Sans and IBM Plex fonts are SIL OFL. The block textures are drawn in code.

Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.
