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

// the contract the provider exposes to the consumers
interface BusinessSignupContextValue {
  data: BusinessSignupState; // read any field
  update: (partial: Partial<BusinessSignupState>) => void; // update any field(s)
  reset: () => void;
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

  const update = useCallback((partial: Partial<BusinessSignupState>) => {
    setData((prev) => ({ ...prev, ...partial }));
  }, []);

  const reset = useCallback(() => {
    setData(INITIAL_STATE);
  }, []);

  // only re-create the context value if data, update, or reset changes (which they won't, except for data when fields are updated)
  const value = useMemo(
    () => ({ data, update, reset }),
    [data, update, reset],
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
