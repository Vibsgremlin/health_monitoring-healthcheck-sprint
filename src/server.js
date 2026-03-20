const { app } = require("./app");

const port = process.env.PORT ? Number(process.env.PORT) : 3000;

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Health sprint service listening on port ${port}`);
});

