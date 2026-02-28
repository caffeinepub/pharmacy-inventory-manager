import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Doctor,
  FirmSettings,
  Invoice,
  Medicine,
  ProfitLossStats,
  ProfitLossTimeFilter,
} from "../backend.d";
import { useActor } from "./useActor";

// Medicine Queries
export function useGetAllMedicines() {
  const { actor, isFetching } = useActor();
  return useQuery<Medicine[]>({
    queryKey: ["medicines"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllMedicines();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddMedicine() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      name: string;
      openingStock: bigint;
      sampling: bigint;
      batchNumber: string;
      hsnCode: string;
      expiryDate: string;
      purchaseRate: bigint;
      sellingRate: bigint;
      mrp: bigint;
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.addOrUpdateMedicine(
        params.name,
        params.openingStock,
        params.sampling,
        params.batchNumber,
        params.hsnCode,
        params.expiryDate,
        params.purchaseRate,
        params.sellingRate,
        params.mrp,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
    },
  });
}

export function useUpdateMedicine() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      name: string;
      openingStock: bigint;
      sampling: bigint;
      batchNumber: string;
      hsnCode: string;
      expiryDate: string;
      purchaseRate: bigint;
      sellingRate: bigint;
      mrp: bigint;
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.addOrUpdateMedicine(
        params.name,
        params.openingStock,
        params.sampling,
        params.batchNumber,
        params.hsnCode,
        params.expiryDate,
        params.purchaseRate,
        params.sellingRate,
        params.mrp,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
    },
  });
}

export function useDeleteMedicine() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.deleteMedicine(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
    },
  });
}

// Doctor Queries
export function useGetAllDoctors() {
  const { actor, isFetching } = useActor();
  return useQuery<Doctor[]>({
    queryKey: ["doctors"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllDoctors();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddDoctor() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      name: string;
      shippingAddress: string;
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.addDoctor(params.name, params.shippingAddress);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
    },
  });
}

export function useUpdateDoctor() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      name: string;
      shippingAddress: string;
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.updateDoctor(params.name, params.shippingAddress);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
    },
  });
}

export function useDeleteDoctor() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.deleteDoctor(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
    },
  });
}

// Doctor Pricing Queries
export function useGetAllDoctorPrices() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (doctorName: string) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.getAllDoctorPrices(doctorName);
    },
  });
}

export function useGetDoctorMedicinePrice() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (params: {
      doctorName: string;
      medicineName: string;
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.getDoctorMedicinePrice(
        params.doctorName,
        params.medicineName,
      );
    },
  });
}

export function useSetDoctorMedicinePrice() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      doctorName: string;
      medicineName: string;
      price: bigint;
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.setDoctorMedicinePrice(
        params.doctorName,
        params.medicineName,
        params.price,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
    },
  });
}

export function useRemoveDoctorMedicinePrice() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      doctorName: string;
      medicineName: string;
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.removeDoctorMedicinePrice(
        params.doctorName,
        params.medicineName,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
    },
  });
}

// Invoice Queries
export function useGetAllInvoices() {
  const { actor, isFetching } = useActor();
  return useQuery<Invoice[]>({
    queryKey: ["invoices"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllInvoices();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetInvoice() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (invoiceNumber: bigint) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.getInvoice(invoiceNumber);
    },
  });
}

export function useGetProfitLossStats() {
  const { actor, isFetching } = useActor();
  return useQuery<ProfitLossStats, Error, ProfitLossStats, [string, string]>({
    queryKey: ["profitLossStats", "all"],
    queryFn: async ({ queryKey }) => {
      if (!actor) throw new Error("Actor not initialized");
      const filter = queryKey[1] as ProfitLossTimeFilter;
      return actor.getProfitLossStats(filter);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateInvoice() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      doctorName: string;
      itemNames: string[];
      quantities: bigint[];
      paymentType?: string;
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      // Convert to array of tuples as expected by backend
      const items: Array<[string, bigint]> = params.itemNames.map(
        (name, index) => [name, params.quantities[index]],
      );
      return actor.createInvoice(
        params.doctorName,
        items,
        params.paymentType ?? "cash",
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      queryClient.invalidateQueries({ queryKey: ["ledgerSummary"] });
    },
  });
}

// PIN Queries
export function useGetAppPin() {
  const { actor, isFetching } = useActor();
  return useQuery<string | null>({
    queryKey: ["appPin"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getAppPin();
    },
    enabled: !!actor && !isFetching,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useSetAppPin() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (pin: string) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.setAppPin(pin);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appPin"] });
    },
  });
}

export function useDeleteInvoice() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invoiceNumber: bigint) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.deleteInvoice(invoiceNumber);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

// Backup Queries
export function useBackup() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.backup();
    },
  });
}

// Firm Settings Queries
export function useGetFirmSettings() {
  const { actor, isFetching } = useActor();
  return useQuery<FirmSettings>({
    queryKey: ["firmSettings"],
    queryFn: async () => {
      if (!actor)
        return {
          name: "",
          address: "",
          gstin: "",
          contact: "",
          email: "",
          defaultShippingAddress: "",
          dilNumber: "",
        };
      return actor.getFirmSettings();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useUpdateFirmSettings() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      name: string;
      address: string;
      gstin: string;
      contact: string;
      email: string;
      shippingAddress: string;
      dilNumber: string;
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.updateFirmSettings(
        params.name,
        params.address,
        params.gstin,
        params.contact,
        params.email,
        params.shippingAddress,
        params.dilNumber,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["firmSettings"] });
    },
  });
}

// Opening Stock & Sampling Queries
export function useUpdateOpeningStock() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { name: string; openingStock: bigint }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.updateOpeningStock(params.name, params.openingStock);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
    },
  });
}

export function useUpdateSampling() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { name: string; sampling: bigint }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.updateSampling(params.name, params.sampling);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
    },
  });
}

export function useGetTotalBilledQuantity() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.getTotalBilledQuantity(name);
    },
  });
}
