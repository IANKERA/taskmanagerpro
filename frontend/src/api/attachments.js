import api from "./client";

export const listAttachments = (issueKey) =>
    api.get(`/api/issues/${issueKey}/attachments`).then((r) => r.data);

export const uploadAttachment = (issueKey, file) => {
    const form = new FormData();
    form.append("file", file);
    return api.post(`/api/issues/${issueKey}/attachments`, form, {
        headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
};

export const downloadAttachment = async (id, filename) => {
    const res = await api.get(`/api/attachments/${id}/download`, {
        responseType: "blob",
    });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
};

export const deleteAttachment = (id) =>
    api.delete(`/api/attachments/${id}`).then(() => true);
