const mediasoup = require("mediasoup");

let worker;
let router;

async function initMediasoup() {
  worker = await mediasoup.createWorker({
    rtcMinPort: 40000,
    rtcMaxPort: 40100
  });

  worker.on("died", () => {
    console.error("❌ mediasoup worker died");
    process.exit(1);
  });

  router = await worker.createRouter({
    mediaCodecs: [
      {
        kind: "video",
        mimeType: "video/VP8",
        clockRate: 90000
      },
      {
        kind: "audio",
        mimeType: "audio/opus",
        clockRate: 48000,
        channels: 2
      }
    ]
  });

  console.log("✅ Mediasoup ready");
}

module.exports = {
  initMediasoup,
  getRouter: () => router
};
