import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import Markdown from "./Markdown";
import { renderWithProviders } from "../test/helpers";

describe("Markdown", () => {
    it("renders plain text", () => {
        renderWithProviders(<Markdown>Hello world</Markdown>);
        expect(screen.getByText("Hello world")).toBeInTheDocument();
    });

    it("renders bold text", () => {
        renderWithProviders(<Markdown>**bold text**</Markdown>);
        expect(screen.getByText("bold text")).toBeInTheDocument();
        expect(screen.getByText("bold text").tagName).toBe("STRONG");
    });

    it("renders headings", () => {
        renderWithProviders(<Markdown># Heading</Markdown>);
        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Heading");
    });

    it("renders links with target blank", () => {
        renderWithProviders(<Markdown>[Click](https://example.com)</Markdown>);
        const link = screen.getByText("Click");
        expect(link.tagName).toBe("A");
        expect(link).toHaveAttribute("href", "https://example.com");
        expect(link).toHaveAttribute("target", "_blank");
    });

    it("renders code blocks", () => {
        renderWithProviders(<Markdown>{"```\nconst x = 1;\n```"}</Markdown>);
        expect(screen.getByText("const x = 1;")).toBeInTheDocument();
    });
});
