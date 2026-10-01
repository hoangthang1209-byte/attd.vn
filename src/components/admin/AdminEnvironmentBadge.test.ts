import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getNonProductionBadgeLabel,
  getNonProductionEnvLabel,
} from "./AdminEnvironmentBadge";

describe("AdminEnvironmentBadge", () => {
  it("adds the normalized short commit SHA in development and test", () => {
    assert.equal(
      getNonProductionBadgeLabel(
        "development",
        undefined,
        " A1B2C3D4E5F60718293A4B5C6D7E8F9012345678 ",
      ),
      "DEV · a1b2c3d",
    );
    assert.equal(
      getNonProductionBadgeLabel(
        "test",
        undefined,
        "1234567890abcdef1234567890abcdef12345678",
      ),
      "TEST · 1234567",
    );
  });

  it("identifies Vercel previews even though their NODE_ENV is production", () => {
    assert.equal(
      getNonProductionBadgeLabel(
        "production",
        "preview",
        "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678",
      ),
      "TEST · a1b2c3d",
    );
  });

  it("preserves the existing badge when the SHA is absent or invalid", () => {
    assert.equal(getNonProductionBadgeLabel("development", undefined, undefined), "DEV");
    assert.equal(getNonProductionBadgeLabel("test", undefined, ""), "TEST");
    assert.equal(getNonProductionBadgeLabel("development", undefined, "not-a-sha"), "DEV");
  });

  it("renders no badge label in production even when a SHA is available", () => {
    assert.equal(
      getNonProductionBadgeLabel(
        "production",
        "production",
        "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678",
      ),
      null,
    );
    assert.equal(getNonProductionBadgeLabel("production", undefined, undefined), null);
  });

  it("preserves fallback environment label behavior", () => {
    assert.equal(getNonProductionEnvLabel(undefined), "NON-PROD");
    assert.equal(getNonProductionEnvLabel("staging"), "STAGING");
  });
});
