import { IDBPDatabase, openDB } from "idb";

const DB_VERSION = 1;
const DB_NAME = "past-roms";
const STORE_NAME = "roms";

let db: IDBPDatabase<unknown>;

const setupDB = async () => {
  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade: (database) => {
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, {
          autoIncrement: true,
        });
      }
    },
  });
};

export const saveROM = async (romFile: File) => {
  if (!db) {
    await setupDB();
  }
  await db.add(STORE_NAME, romFile);
};

export const getPastROMs = async (): Promise<
  { key: IDBValidKey; file: File }[]
> => {
  if (!db) {
    await setupDB();
  }
  const keys = await db.getAllKeys(STORE_NAME);

  return (
    await Promise.all(
      keys.map(async (key) => {
        const file = await db.get(STORE_NAME, key);

        return { file, key };
      })
    )
  ).filter(({ file }) => file instanceof File);
};

export const deleteROM = async (key: IDBValidKey) => {
  if (!db) {
    await setupDB();
  }
  await db.delete(STORE_NAME, key);
};
