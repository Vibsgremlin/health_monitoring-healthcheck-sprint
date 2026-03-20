const request = require("supertest");
const { app } = require("../src/app");

describe("GET /health (starting snapshot)", () => {
  test("returns 200 and status ok", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "ok");
    expect(res.body).toHaveProperty("services");
  });
});

