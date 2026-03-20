// AXTO AutoPost Cron Worker
// Triggers: every 6 hours
// Config: wrangler-autopost.toml

export default {
  async scheduled(event, env, ctx) {
    const appUrl = env.APP_URL || "https://axto.io";
    const secret = env.CRON_SECRET;

    try {
      const res = await fetch(`${appUrl}/api/cron/autopost?secret=${secret}`);
      const data = await res.json();
      console.log("[AutoPost Cron]", data);
    } catch (err) {
      console.error("[AutoPost Cron] Error:", err.message);
    }
  },

  async fetch(request, env) {
    return new Response("AutoPost cron worker is running.", { status: 200 });
  },
};
