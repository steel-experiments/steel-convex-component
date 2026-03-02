import { defineApp } from "convex/server";
import steel from "../../src/component/convex.config.js";

const app = defineApp();
app.use(steel);

export default app;
