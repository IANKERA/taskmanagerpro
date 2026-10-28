import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, useTheme } from "./ThemeContext";

function TestConsumer() {
    const { dark, toggle } = useTheme();
    return (
        <div>
            <span data-testid="mode">{dark ? "dark" : "light"}</span>
            <button onClick={toggle}>Toggle</button>
        </div>
    );
}

describe("ThemeContext", () => {
    let store;

    beforeEach(() => {
        store = {};
        const mockStorage = {
            getItem: vi.fn((key) => store[key] ?? null),
            setItem: vi.fn((key, val) => { store[key] = String(val); }),
            removeItem: vi.fn((key) => { delete store[key]; }),
            clear: vi.fn(() => { store = {}; }),
            get length() { return Object.keys(store).length; },
            key: vi.fn((i) => Object.keys(store)[i] ?? null),
        };
        vi.stubGlobal("localStorage", mockStorage);
        document.documentElement.classList.remove("dark");
    });

    it("defaults to light when no saved preference", () => {
        window.matchMedia = () => ({ matches: false });
        render(
            <ThemeProvider><TestConsumer /></ThemeProvider>
        );
        expect(screen.getByTestId("mode")).toHaveTextContent("light");
    });

    it("reads saved preference from localStorage", () => {
        store.theme = "dark";
        render(
            <ThemeProvider><TestConsumer /></ThemeProvider>
        );
        expect(screen.getByTestId("mode")).toHaveTextContent("dark");
    });

    it("toggles dark mode and saves to localStorage", async () => {
        window.matchMedia = () => ({ matches: false });
        const user = userEvent.setup();
        render(
            <ThemeProvider><TestConsumer /></ThemeProvider>
        );
        expect(screen.getByTestId("mode")).toHaveTextContent("light");
        await user.click(screen.getByText("Toggle"));
        expect(screen.getByTestId("mode")).toHaveTextContent("dark");
        expect(store.theme).toBe("dark");
        expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
});
