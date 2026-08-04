import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export interface UploadedDoc {
  url: string;
  fileName: string;
}

// the data need to collect for business signup
export interface BusinessSignupState {
  businessName: string;
  businessAddress: string;
  city: string;
  state: string;
  zipCode: string;
  registrationDoc: UploadedDoc | null;
  governmentId: UploadedDoc | null;
  ein: string;
}

export type BusinessStatus = "pending" | "verified";

// A business submitted for review. Kept in memory until the
// create-business API exists to persist and list them.
export interface PendingBusiness {
  id: number;
  name: string;
  /** Distinct category names of the selected services (e.g. "Automotive"). */
  categories: string[];
  status: BusinessStatus;
  address: string;
  country: string;
  state: string;
  city: string;
  zipCode: string;
  about: string;
}

// the contract the provider exposes to the consumers
interface BusinessSignupContextValue {
  data: BusinessSignupState; // read any field
  update: (partial: Partial<BusinessSignupState>) => void; // update any field(s)
  reset: () => void;
  pendingBusinesses: PendingBusiness[];
  addPendingBusiness: (
    business: Omit<PendingBusiness, "id" | "status">,
  ) => void;
  setBusinessStatus: (id: number, status: BusinessStatus) => void;
}

const INITIAL_STATE: BusinessSignupState = {
  businessName: "",
  businessAddress: "",
  city: "",
  state: "",
  zipCode: "",
  registrationDoc: null,
  governmentId: null,
  ein: "",
};

const BusinessSignupContext = createContext<BusinessSignupContextValue | null>(
  null,
);

export function BusinessSignupProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [data, setData] = useState<BusinessSignupState>(INITIAL_STATE);
  const [pendingBusinesses, setPendingBusinesses] = useState<
    PendingBusiness[]
  >([]);

  const update = useCallback((partial: Partial<BusinessSignupState>) => {
    setData((prev) => ({ ...prev, ...partial }));
  }, []);

  const reset = useCallback(() => {
    setData(INITIAL_STATE);
  }, []);

  const addPendingBusiness = useCallback(
    (business: Omit<PendingBusiness, "id" | "status">) => {
      setPendingBusinesses((prev) => [
        ...prev,
        { ...business, id: prev.length + 1, status: "pending" },
      ]);
    },
    [],
  );

  const setBusinessStatus = useCallback(
    (id: number, status: BusinessStatus) => {
      setPendingBusinesses((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status } : b)),
      );
    },
    [],
  );

  // only re-create the context value if data, update, or reset changes (which they won't, except for data when fields are updated)
  const value = useMemo(
    () => ({
      data,
      update,
      reset,
      pendingBusinesses,
      addPendingBusiness,
      setBusinessStatus,
    }),
    [data, update, reset, pendingBusinesses, addPendingBusiness, setBusinessStatus],
  );

  return (
    <BusinessSignupContext.Provider value={value}>
      {children}
    </BusinessSignupContext.Provider>
  );
}

export function useBusinessSignup() {
  const ctx = useContext(BusinessSignupContext);
  if (!ctx) {
    throw new Error(
      "useBusinessSignup must be used within a BusinessSignupProvider",
    );
  }
  return ctx;
}
