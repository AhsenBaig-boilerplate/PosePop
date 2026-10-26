# Test photos

The end-to-end tests run person detection on these photos. All four come from NASA's image library
(https://images.nasa.gov). NASA imagery is generally not subject to copyright in the United States; see
https://www.nasa.gov/nasa-brand-center/images-and-media/. The photos are used here only to test the software.
Using them doesn't imply NASA endorsement, and they are not shipped in `dist/`.

Each one was re-encoded in a browser (long side at most 1,280 or 1,600 px, JPEG quality 0.85, no metadata) to keep the repository small.

| File | What it tests | NASA ID and title | Downloaded from | SHA-256 of the download |
|---|---|---|---|---|
| `single.jpg` | one person at a desk in a busy office, with photos of people pinned on the wall that must not count | S85-40176, "CREW TRAINING - STS-33/51L - JSC" (1985) | `https://images-assets.nasa.gov/image/S85-40176/S85-40176~large.jpg` | `cc6498091724bab5f24e4bb9d08a770f7a958f29e0d5a9231f35e91f2c200e89` |
| `seated.jpg` | one person in a suit, seated in a car | KSC-20201115-PH-BDG01_0138, "SpaceX Crew-1 Astronaut Walkout" (2020) | `https://images-assets.nasa.gov/image/KSC-20201115-PH-BDG01_0138/KSC-20201115-PH-BDG01_0138~large.jpg` | `484c76f8d810f2618fcec0acc120d7ea13ab5d332635de5463934dbeae9ad3e4` |
| `group7.jpg` | a group of seven | iss075-s-002, "The official portrait of the seven-member Expedition 75 crew" (2024) | `https://images-assets.nasa.gov/image/iss075-s-002/iss075-s-002~orig.jpg` | `0d4467a419fa0641e982762712d6ca4c9b9b9b29195f8a214f2e68da410d02b3` |
| `greenscreen.jpg` | the green or blue screen key | GRC-2007-C-02823 (2005) | `https://images-assets.nasa.gov/image/GRC-2007-C-02823/GRC-2007-C-02823~large.jpg` | `85e9672d3e29f7ab11a16ced883ca7ad1d59b9e7e90643d8edd0a740a90971b2` |

Guests' photos never go in this folder, or anywhere in the repository.
