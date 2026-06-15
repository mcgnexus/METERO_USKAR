import { describe, it, expect, beforeEach } from "vitest";
import { cacheGet, cacheSet, cacheDelete, cacheKeys, cacheClear } from "@/lib/inMemoryCache";

describe("inMemoryCache", () => {
  beforeEach(() => {
    cacheClear();
  });

  it("retorna null para clave inexistente", () => {
    expect(cacheGet("no-existe")).toBeNull();
  });

  it("guarda y recupera un valor", () => {
    cacheSet("foo", { bar: 42 }, 60_000);
    expect(cacheGet("foo")).toEqual({ bar: 42 });
  });

  it("expira tras el TTL", async () => {
    cacheSet("soon", "value", 10); // 10 ms
    expect(cacheGet("soon")).toBe("value");
    await new Promise((r) => setTimeout(r, 20));
    expect(cacheGet("soon")).toBeNull();
  });

  it("elimina una clave", () => {
    cacheSet("del", "data", 60_000);
    expect(cacheGet("del")).toBe("data");
    cacheDelete("del");
    expect(cacheGet("del")).toBeNull();
  });

  it("listKeys retorna las claves activas", () => {
    cacheSet("a", 1, 60_000);
    cacheSet("b", 2, 60_000);
    const keys = cacheKeys();
    expect(keys).toContain("a");
    expect(keys).toContain("b");
  });

  it("clear elimina todo", () => {
    cacheSet("x", 1, 60_000);
    cacheClear();
    expect(cacheKeys()).toHaveLength(0);
  });
});
