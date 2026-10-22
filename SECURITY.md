# Security

## Reporting

Please report vulnerabilities privately through GitHub's "Report a vulnerability" (Security → Advisories) on this repository rather than in a public issue.

## Data handling

PosePop processes photos entirely in the browser. Images, cut-outs and stickers are never uploaded; the site makes no requests except for its own static files.

## Accepted risks

| Item | Status | Reason |
|---|---|---|
| `sprintf-js` ≤ 1.1.3 (GHSA-hp3w-g68c-fv3c, moderate) via `@tensorflow/tfjs` → `argparse` | Accepted | Pulled in only by TensorFlow.js's Node.js command-line tooling. The site ships the prebuilt browser bundle `dist/tf.min.js`, which doesn't include it. No patched version exists. CI gates on high and critical findings. |
| TensorFlow.js probes WebAssembly support at load | Expected | The CSP doesn't allow `wasm-unsafe-eval`, so the browser blocks the probe and logs one CSP report. TF.js catches the error and uses its JavaScript path. |
| TensorFlow.js `regeneratorRuntime` eval fallback | Mitigated | The page declares the global before loading TF.js, so the fallback is never reached and no `unsafe-eval` is needed. |
