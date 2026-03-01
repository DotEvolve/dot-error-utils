const Sentry = require("@sentry/node");
console.log(Object.keys(Sentry).filter((k) => k.includes("setup")));
