import handler from "@tanstack/react-start/server-entry";

export { DocumentIndexingWorkflow } from "./workflows/document-indexing";

export default {
  fetch: handler.fetch,
};
