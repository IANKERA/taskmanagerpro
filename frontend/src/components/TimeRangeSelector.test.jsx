import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import TimeRangeSelector, {
    SUPPORTED_TIME_RANGES,
    TIME_RANGE_OPTIONS,
} from "./TimeRangeSelector";

describe("TimeRangeSelector", () => {
    it("renders with default label, accessible attributes, and 30 days selected", () => {
        render(<TimeRangeSelector value={30} onChange={vi.fn()} />);

        const select = screen.getByRole("combobox", { name: /time range/i });
        expect(select).toBeInTheDocument();
        expect(select).toHaveValue("30");

        const label = screen.getByText("Time range:");
        expect(label).toHaveAttribute("for", "cfd-time-range-select");
    });

    it("only exposes options supported by the backend: 7, 14, 30, 60, and 90 days", () => {
        render(<TimeRangeSelector value={30} onChange={vi.fn()} />);

        const options = screen.getAllByRole("option");
        expect(options).toHaveLength(5);

        const renderedValues = options.map((opt) => Number(opt.value));
        expect(renderedValues).toEqual(SUPPORTED_TIME_RANGES);
        expect(renderedValues).toEqual([7, 14, 30, 60, 90]);

        const renderedLabels = options.map((opt) => opt.textContent);
        expect(renderedLabels).toEqual([
            "7 days",
            "14 days",
            "30 days",
            "60 days",
            "90 days",
        ]);
    });

    it("triggers onChange with numeric value when selection changes", () => {
        const handleChange = vi.fn();
        render(<TimeRangeSelector value={30} onChange={handleChange} />);

        const select = screen.getByRole("combobox", { name: /time range/i });
        fireEvent.change(select, { target: { value: "14" } });

        expect(handleChange).toHaveBeenCalledTimes(1);
        expect(handleChange).toHaveBeenCalledWith(14);
    });

    it("respects custom id and disabled state", () => {
        render(
            <TimeRangeSelector
                id="custom-range"
                label="Custom Range:"
                value={60}
                disabled={true}
                onChange={vi.fn()}
            />
        );

        const select = screen.getByRole("combobox", { name: /time range/i });
        expect(select).toBeDisabled();
        expect(select).toHaveAttribute("id", "custom-range");
        expect(screen.getByText("Custom Range:")).toHaveAttribute("for", "custom-range");
    });
});
