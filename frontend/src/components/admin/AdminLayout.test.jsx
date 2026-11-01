import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import AdminLayout from "./AdminLayout";

describe("AdminLayout", () => {
    it("renders administration header and navigation tabs", () => {
        render(
            <MemoryRouter initialEntries={["/admin"]}>
                <Routes>
                    <Route path="/admin" element={<AdminLayout />}>
                        <Route index element={<div>Admin overview child</div>} />
                    </Route>
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByRole("heading", { name: "Administration" })).toBeInTheDocument();
        expect(screen.getByText("Admin Area")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Overview" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Users" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Projects" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Audit Log" })).toBeInTheDocument();
        expect(screen.getByText("Admin overview child")).toBeInTheDocument();
    });
});

