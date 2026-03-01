const Sentry = require("@sentry/node");
console.log(
  Object.keys(Sentry).filter(
    (k) => k.toLowerCase().includes("span") || k.toLowerCase().includes("hub"),
  ),
);
