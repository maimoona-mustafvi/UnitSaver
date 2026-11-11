import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import { DEFAULT_SETTINGS, type Appliance, type Reading, type UserData } from "@/types";
import { getFirebase } from "@/lib/firebase";

export type Profile = Partial<Pick<UserData, "settings" | "history" | "lastBill">>;
export type NewAppliance = Omit<Appliance, "id"> & { id?: string };

export interface Store {
  mode: "firebase" | "local";
  load(): Promise<UserData>;
  saveProfile(p: Profile): Promise<void>;
  addReading(r: Omit<Reading, "id">): Promise<Reading>;
  saveAppliance(a: NewAppliance): Promise<Appliance>;
  deleteAppliance(id: string): Promise<void>;
  /** Replace everything (demo data) or wipe it (null). */
  replaceAll(d: UserData | null): Promise<void>;
}

export const emptyData = (): UserData => ({
  settings: { ...DEFAULT_SETTINGS },
  history: [],
  lastBill: null,
  readings: [],
  appliances: [],
});

const withDefaults = (d: Partial<UserData>): UserData => ({
  ...emptyData(),
  ...d,
  settings: { ...DEFAULT_SETTINGS, ...d.settings },
});

/* ---------- Firestore: users/{uid} + readings/appliances subcollections ---------- */

export function firestoreStore(uid: string): Store {
  const { db } = getFirebase();
  const userRef = doc(db, "users", uid);
  const readingsRef = collection(userRef, "readings");
  const appliancesRef = collection(userRef, "appliances");
  const strip = <T extends { id?: string }>({ id: _id, ...rest }: T) => rest;

  async function deleteAll(fs: Firestore) {
    const batch = writeBatch(fs);
    for (const ref of [readingsRef, appliancesRef]) (await getDocs(ref)).forEach((d) => batch.delete(d.ref));
    batch.delete(userRef);
    await batch.commit();
  }

  return {
    mode: "firebase",
    async load() {
      const [user, readings, appliances] = await Promise.all([getDoc(userRef), getDocs(readingsRef), getDocs(appliancesRef)]);
      return withDefaults({
        ...(user.data() as Partial<UserData> | undefined),
        readings: readings.docs.map((d) => ({ ...(d.data() as Omit<Reading, "id">), id: d.id })),
        appliances: appliances.docs.map((d) => ({ ...(d.data() as Omit<Appliance, "id">), id: d.id })),
      });
    },
    saveProfile: (p) => setDoc(userRef, p, { merge: true }),
    async addReading(r) {
      const ref = await addDoc(readingsRef, r);
      return { ...r, id: ref.id };
    },
    async saveAppliance(a) {
      const ref = a.id ? doc(appliancesRef, a.id) : doc(appliancesRef);
      await setDoc(ref, strip(a));
      return { ...strip(a), id: ref.id };
    },
    deleteAppliance: (id) => deleteDoc(doc(appliancesRef, id)),
    async replaceAll(d) {
      await deleteAll(db);
      if (!d) return;
      const batch = writeBatch(db);
      batch.set(userRef, { settings: d.settings, history: d.history, lastBill: d.lastBill });
      d.readings.forEach((r) => batch.set(doc(readingsRef, r.id), strip(r)));
      d.appliances.forEach((a) => batch.set(doc(appliancesRef, a.id), strip(a)));
      await batch.commit();
    },
  };
}

/* ---------- localStorage: used when Firebase is not configured or unreachable ---------- */

const KEY = "unitsaver:data";

export function localStore(): Store {
  const read = (): UserData => {
    try {
      return withDefaults(JSON.parse(localStorage.getItem(KEY) ?? "{}"));
    } catch {
      return emptyData();
    }
  };
  const write = (d: UserData) => localStorage.setItem(KEY, JSON.stringify(d));
  const id = () => crypto.randomUUID();
  return {
    mode: "local",
    load: async () => read(),
    saveProfile: async (p) => write({ ...read(), ...p }),
    async addReading(r) {
      const reading = { ...r, id: id() };
      const d = read();
      write({ ...d, readings: [...d.readings, reading] });
      return reading;
    },
    async saveAppliance(a) {
      const appliance = { ...a, id: a.id ?? id() };
      const d = read();
      write({ ...d, appliances: [...d.appliances.filter((x) => x.id !== appliance.id), appliance] });
      return appliance;
    },
    async deleteAppliance(applianceId) {
      const d = read();
      write({ ...d, appliances: d.appliances.filter((x) => x.id !== applianceId) });
    },
    replaceAll: async (d) => (d ? write(d) : localStorage.removeItem(KEY)),
  };
}

