import { describe, expect } from "bun:test"
import { ConfigProvider, Effect, Layer } from "effect"
import { HttpRouter } from "effect/unstable/http"
import type { CorsOptions } from "@opencode-ai/server/cors"
import { InstancePaths } from "../../src/server/routes/instance/httpapi/groups/instance"
import { HttpApiApp } from "../../src/server/routes/instance/httpapi/server"
import { testEffect } from "../lib/effect"

const it = testEffect(Layer.empty)

function handler(opts?: CorsOptions) {
  return HttpRouter.toWebHandler(
    HttpApiApp.createRoutes(opts).pipe(
      Layer.provide(ConfigProvider.layer(ConfigProvider.fromUnknown({ OPENCODE_SERVER_PASSWORD: "secret" }))),
    ),
    { disableLogger: true },
  ).handler
}

function request(input: Request, opts?: CorsOptions) {
  const handle = handler(opts)
  return Effect.promise(() => handle(input, HttpApiApp.context))
}

describe("HttpApi CORS", () => {
  it.effect("allows browser preflight requests without credentials", () =>
    Effect.gen(function* () {
      const response = yield* request(
        new Request(new URL(InstancePaths.path, "http://localhost"), {
          method: "OPTIONS",
          headers: {
            origin: "http://localhost:3000",
            "access-control-request-method": "GET",
            "access-control-request-headers": "authorization",
          },
        }),
      )

      expect(response.status).toBe(204)
      expect(response.headers.get("access-control-allow-origin")).toBe("http://localhost:3000")
      expect(response.headers.get("access-control-allow-headers")).toBe("authorization")
    }),
  )

  it.effect("adds CORS headers to unauthorized responses", () =>
    Effect.gen(function* () {
      const response = yield* request(
        new Request(new URL("/global/config", "http://localhost"), {
          headers: { origin: "https://app.opencode.ai" },
        }),
      )

      expect(response.status).toBe(401)
      expect(response.headers.get("access-control-allow-origin")).toBe("https://app.opencode.ai")
    }),
  )

  it.effect("allows FangCode browser origins", () =>
    Effect.gen(function* () {
      const response = yield* request(
        new Request(new URL("/global/config", "http://localhost"), {
          headers: { origin: "https://app.fangcode.ai" },
        }),
      )

      expect(response.status).toBe(401)
      expect(response.headers.get("access-control-allow-origin")).toBe("https://app.fangcode.ai")
    }),
  )

  it.effect("uses custom CORS origins passed to the server", () =>
    Effect.gen(function* () {
      const response = yield* request(
        new Request(new URL(InstancePaths.path, "http://localhost"), {
          method: "OPTIONS",
          headers: {
            origin: "https://custom.example",
            "access-control-request-method": "GET",
            "access-control-request-headers": "authorization",
          },
        }),
        { cors: ["https://custom.example"] },
      )

      expect(response.status).toBe(204)
      expect(response.headers.get("access-control-allow-origin")).toBe("https://custom.example")
      expect(response.headers.get("access-control-allow-headers")).toBe("authorization")

      const rejected = yield* request(
        new Request(new URL(InstancePaths.path, "http://localhost"), {
          method: "OPTIONS",
          headers: {
            origin: "https://evil.example",
            "access-control-request-method": "GET",
            "access-control-request-headers": "authorization",
          },
        }),
        { cors: ["https://custom.example"] },
      )

      expect(rejected.status).toBe(204)
      expect(rejected.headers.get("access-control-allow-origin")).not.toBe("https://evil.example")
    }),
  )
})
