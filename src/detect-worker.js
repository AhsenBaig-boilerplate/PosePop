// Runs person detection off the main thread, so the page stays responsive while people are found.
// The page sends the hashed URLs of tf.js, detect.js and the models; this file must stay next to
// index.html (at the site root) so those relative URLs resolve the same way here as on the page.
//   page → worker: {type:"init", tf, detect, models, opts} once, then {type:"segment", id, image: ImageBitmap}
//   worker → page: {type:"mark"} for ?debug=1, "ready" / "failed" after init, then per photo
//                  "progress" (busy label), "result" (alpha: ImageBitmap) or "error"
"use strict";
let latest = 0;
const send = (m, transfer) => self.postMessage(m, transfer || []);
const report = (sec, key, val) => send({ type: "mark", sec, key, val: String(val) });

self.onmessage = async (e) => {
  const m = e.data;
  if (m.type === "init") {
    try {
      // see index.html: declaring this keeps tf.js's bundled regenerator-runtime off its eval fallback
      self.regeneratorRuntime = undefined;
      if (typeof OffscreenCanvas === "undefined" || !new OffscreenCanvas(1, 1).getContext("2d")) throw new Error("no OffscreenCanvas 2D here");
      importScripts(m.detect);
      PosePopDetect.start(m.models, report, m.opts); // model download starts before tf.js loads
      const t = performance.now();
      importScripts(m.tf);
      report("Detection", "tf.js script", Math.round(performance.now() - t) + " ms (in worker)");
      send({ type: "ready", ...(await PosePopDetect.load()) });
    } catch (err) { send({ type: "failed", error: String((err && err.message) || err) }); }
    return;
  }
  if (m.type === "segment") {
    latest = m.id;
    try {
      // a newer photo cancels this one at its next step
      const r = await PosePopDetect.segment(m.image, { progress: (text) => send({ type: "progress", id: m.id, text }), cancelled: () => m.id !== latest });
      if (m.image.close) m.image.close();
      const alpha = r.alpha.transferToImageBitmap();
      send({ type: "result", id: m.id, people: r.people, focus: r.focus, boxes: r.boxes, alpha }, [alpha]);
    } catch (err) { send({ type: "error", id: m.id, error: String((err && err.message) || err) }); }
  }
};
