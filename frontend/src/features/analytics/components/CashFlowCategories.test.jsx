import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CashFlowCategories from "./CashFlowCategories";
import { cashFlowFixture } from "../testFixtures";

describe("cash-flow category ranking", () => {
  it("uses unique accessible headings and keeps a zero spending denominator honest", () => {
    const data = cashFlowFixture("2026-08", { spentMinor: "0" });
    data.categories = [{ category: "food", amountMinor: "1" }];

    render(<><CashFlowCategories data={data} /><CashFlowCategories data={data} /></>);

    const regions = screen.getAllByRole("region", { name: "Where it went" });
    expect(regions).toHaveLength(2);
    expect(regions[0]).not.toHaveAttribute("aria-labelledby", regions[1].getAttribute("aria-labelledby"));
    regions.forEach((region) => {
      const heading = within(region).getByRole("heading", { level: 2, name: "Where it went" });
      expect(region).toHaveAttribute("aria-labelledby", heading.id);
      expect(within(region).getByRole("listitem")).toHaveTextContent("Food$0.01 · Not applicable");
      expect(region.querySelector(".analytics-bar > span")).toHaveStyle({ width: "0%" });
    });
  });
});
