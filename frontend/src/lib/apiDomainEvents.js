export function dispatchApiDomainEvents(response, client) {
  if (response.headers["x-activity-notification"] === "created") {
    window.dispatchEvent(new Event("lifeai:notifications-updated"));
  }

  const path = (response.config?.url || "").split("?")[0];
  if (
    response.data?.success !== false &&
    ["post", "put", "patch"].includes(response.config?.method) &&
    /^\/(?:planner\/imprevistos|unexpected-events)(?:\/\d+)?\/?$/.test(path)
  ) {
    const data = response.data.data;
    const record = data?.unexpectedEvent || data?.event || data;
    if (record?.id && record.date) {
      window.dispatchEvent(
        new CustomEvent("lifeai:unexpected-saved", { detail: record }),
      );
    }
  }

  if (
    response.data?.success !== false &&
    /^\/ai\/setup\/\d+\/apply$/.test(path) &&
    response.data.data?.created?.some((row) => row.kind === "imprevistos")
  ) {
    const ids = new Set(
      response.data.data.created
        .filter((row) => row.kind === "imprevistos")
        .map((row) => row.id),
    );
    client
      .get("/planner/imprevistos")
      .then((result) => {
        for (const record of result.data.filter((row) => ids.has(row.id))) {
          window.dispatchEvent(
            new CustomEvent("lifeai:unexpected-saved", { detail: record }),
          );
        }
      })
      .catch(() => {});
  }
}
