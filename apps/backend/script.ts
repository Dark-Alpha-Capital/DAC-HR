import { googleGenAI } from "lib/ai/models";

async function listStores() {
  const fileSearchStores = await googleGenAI.fileSearchStores.list();
  for await (const store of fileSearchStores) {
    console.log(store);
  }
}

async function deleteStore(storeName: string) {
  await googleGenAI.fileSearchStores.delete({
    name: storeName,
  });
}

async function createStore() {
  const store = await googleGenAI.fileSearchStores.create({
    config: { displayName: "candidate-documents-search-store-123" },
  });
  console.log(`Store Name: ${store.name}`);
  // **Save this store name to your .env file** (e.g., GEMINI_FILE_SEARCH_STORE)
}

async function getStore() {
  const myFileSearchStore = await googleGenAI.fileSearchStores.get({
    name: "fileSearchStores/candidatedocumentssearchsto-ihh3ywli34wi",
  });
  console.log(myFileSearchStore);
}

// await listStores();

// await deleteStore("fileSearchStores/globalcandidatedocsstore-pxzcv1zqbqwx");
// await deleteStore("fileSearchStores/globalcandidatedocsstore-ozjjh3qej05n");

// await deleteStore("fileSearchStores/globalcandidatedocsstore-g1u9bmqy0cj4");

// await createStore();
await getStore();

// fileSearchStores/globalcandidatedocsstore-pxzcv1zqbqwx
