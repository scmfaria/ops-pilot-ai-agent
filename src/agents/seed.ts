import { createSeedStore } from "./store.js";

const store = createSeedStore();
console.log(JSON.stringify({
  services: store.listServices(),
  alerts: store.listAlerts("all"),
}, null, 2));
