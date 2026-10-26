import { describe, expect, it } from "vitest";
import { prepareMeasurement } from "./analytics-privacy";

const origin = "https://tr-story.vercel.app";

describe("measurement privacy", () => {
  it("removes search terms, filter values and fragments without changing the event", () => {
    const event = { type: "pageview", url: `${origin}/?q=private&status=bookmark#record` };
    expect(prepareMeasurement(event, origin)).toEqual({ type: "pageview", url: `${origin}/` });
    expect(event.url).toContain("q=private");
  });

  it.each(["/me", "/me/", "/me/records/?secret=1"])("excludes the personal page %s", (path) => {
    expect(prepareMeasurement({ url: origin + path }, origin)).toBeNull();
  });

  it.each(["http://localhost:3000/", "https://preview.vercel.app/", "https://tales-runner.github.io/TR-STORY/", "invalid"])("excludes non-production URLs: %s", (url) => {
    expect(prepareMeasurement({ url }, origin)).toBeNull();
  });

  it("retains the episode route and vital event type", () => {
    expect(prepareMeasurement({ type: "vital", route: "/stories/[id]", url: `${origin}/stories/260/?start=1` }, origin))
      .toEqual({ type: "vital", route: "/stories/[id]", url: `${origin}/stories/260/` });
  });
});
