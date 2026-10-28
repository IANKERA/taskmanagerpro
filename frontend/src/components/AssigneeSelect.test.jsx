import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { listAssignableUsers } from "../api/projects";
import AssigneeSelect from "./AssigneeSelect";
import { renderWithProviders } from "../test/helpers";

vi.mock("../api/projects", () => ({
    listAssignableUsers: vi.fn(),
}));

describe("AssigneeSelect", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        listAssignableUsers.mockResolvedValue([
            { id: 1, username: "alice" },
            { id: 2, username: "bob" },
        ]);
    });

    it("loads project-eligible users and returns the selected username", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderWithProviders(
            <AssigneeSelect projectKey="DEMO" value="" onChange={onChange} />
        );

        const select = await screen.findByRole("combobox", { name: "Assignee" });
        await screen.findByRole("option", { name: "bob" });
        await user.selectOptions(select, "bob");

        expect(listAssignableUsers).toHaveBeenCalledWith("DEMO");
        expect(onChange).toHaveBeenCalledWith("bob");
    });
});
