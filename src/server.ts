import { buildApp } from "./app.js";

const port = Number(process.env.PORT || 3000);

buildApp()
  .then((app) => {
    app.listen({ port, host: "0.0.0.0" }).catch((err) => {
      app.log.error(err);
      process.exit(1);
    });
  })
  .catch((err) => {
    console.error("Error starting app:", err);
    process.exit(1);
  });
