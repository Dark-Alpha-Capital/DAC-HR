import { createClient } from "@prismicio/client";
import {
  getPrismicAccessToken,
  getPrismicRepositoryName,
} from "~/lib/prismic/config";

export function createPrismicClient() {
  const repositoryName = getPrismicRepositoryName();
  const accessToken = getPrismicAccessToken();

  return createClient(repositoryName, {
    accessToken,
    fetch: globalThis.fetch.bind(globalThis),
  });
}
