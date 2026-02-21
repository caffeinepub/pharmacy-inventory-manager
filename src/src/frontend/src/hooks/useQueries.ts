import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActor } from "./useActor";
import type {
  Medicine,
  Doctor,
  Invoice,
  FirmSettings,
} from "../backend.d";

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
      quantity: bigint;
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
        params.quantity,
        params.batchNumber,
        params.hsnCode,
        params.expiryDate,
        params.purchaseRate,
        params.sellingRate,
        params.mrp
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
      quantity: bigint;
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
        params.quantity,
        params.batchNumber,
        params.hsnCode,
        params.expiryDate,
        params.purchaseRate,
        params.sellingRate,
        params.mrp
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
    mutationFn: async (params: { name: string; marginPercentage: bigint }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.addOrUpdateDoctor(params.name, params.marginPercentage);
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
    mutationFn: async (params: { name: string; marginPercentage: bigint }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.addOrUpdateDoctor(params.name, params.marginPercentage);
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

export function useCreateInvoice() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      doctorName: string;
      itemNames: string[];
      quantities: bigint[];
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      // Convert to array of tuples as expected by backend
      const items: Array<[string, bigint]> = params.itemNames.map(
        (name, index) => [name, params.quantities[index]]
      );
      return actor.createInvoice(params.doctorName, items);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
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
          shippingAddress: "",
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
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.updateFirmSettings(
        params.name,
        params.address,
        params.gstin,
        params.contact,
        params.email,
        params.shippingAddress
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["firmSettings"] });
    },
  });
}
