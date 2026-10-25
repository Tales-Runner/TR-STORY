import { describe, expect, it } from "vitest";
import { homeQuery, localListPath, parseHomeFilters } from "./list-navigation";
import { formatISODate, relativeDays } from "./format";
import { validPosition } from "./reading-position";

describe("reading navigation", () => {
  it("round trips a filtered episode list through a shared URL", () => {
    const filters = { q: "0화 & 다음", year: "2025년", series: "테일즈 아틀리에",
      status: "bookmark", sort: "desc", view: "episode" } as const;
    expect(parseHomeFilters(homeQuery(filters))).toEqual(filters);
    expect(parseHomeFilters("?series=테일즈%20아틀리에")).toMatchObject({ sort: "asc", view: "episode" });
    expect(parseHomeFilters("?status=bad&view=bad")).toMatchObject({ status: "all", view: "series" });
  });
  it("only accepts local home and library return destinations", () => {
    expect(localListPath("/TR-STORY/?series=a", "/TR-STORY")).toBe("/?series=a");
    expect(localListPath("/TR-STORY/me/", "/TR-STORY")).toBe("/me/");
    for (const href of ["//evil.test/", "/\\evil.test/", "https://evil.test/", "/TR-STORY/stories/1/", "/other/"]) {
      expect(localListPath(href, "/TR-STORY")).toBeNull();
    }
  });
  it("formats the Korean calendar date consistently around midnight", () => {
    expect(formatISODate("2026-10-23T15:18:04.658Z")).toBe("2026-10-24");
    expect(formatISODate("2026-12-31T15:00:00Z")).toBe("2027-01-01");
    expect(formatISODate("invalid")).toBe("invalid");
    expect(relativeDays("2026-10-23T15:00:00Z", Date.parse("2026-10-25T15:00:00Z"))).toBe("2일 전");
  });
  it("rejects corrupt and out-of-range stored panel positions", () => {
    expect(validPosition({ panel: 2, offset: 0.85 }, 3)).toBe(true);
    for (const position of [undefined, { panel: 3, offset: 0 }, { panel: -1, offset: 0 }, { panel: 0, offset: NaN }, { panel: 0, offset: 2 }]) {
      expect(validPosition(position, 3)).toBe(false);
    }
  });
});
