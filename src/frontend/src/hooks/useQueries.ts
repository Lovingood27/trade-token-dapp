import { createActor } from "@/backend";
import type {
  AttachedDocument,
  BalanceView,
  FundedTokenView,
  InvoiceCategory,
  InvoiceLineItem,
  InvoiceView,
  IssuedTokenView,
  LedgerSummary,
  PublicEventView,
  TokenEvent,
  TokenEventKind,
  TokenId,
  TokenSort,
  TokenStatus,
  TokenSummary,
  TradeToken,
} from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const queryKeys = {
  marketplace: (status: TokenStatus | null, sort: TokenSort) =>
    ["marketplace", status ?? "all", sort] as const,
  token: (tokenId: TokenId) => ["token", tokenId.toString()] as const,
  tokenDocuments: (tokenId: TokenId) =>
    ["tokenDocuments", tokenId.toString()] as const,
  issuedTokens: ["issuedTokens"] as const,
  fundedTokens: ["fundedTokens"] as const,
  myBalance: ["myBalance"] as const,
  myEvents: (kind: TokenEventKind | null) =>
    ["myEvents", kind ?? "all"] as const,
  ledgerSummary: ["ledgerSummary"] as const,
  recentEvents: (limit: bigint) => ["recentEvents", limit.toString()] as const,
  myInvoices: ["myInvoices"] as const,
};

/** Public marketplace listing. Anyone may read. */
export function useMarketplace(
  statusFilter: TokenStatus | null,
  sortBy: TokenSort,
) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<TokenSummary[]>({
    queryKey: queryKeys.marketplace(statusFilter, sortBy),
    queryFn: async () => {
      if (!actor) return [];
      return actor.listMarketplace(statusFilter, sortBy);
    },
    enabled: !!actor && !isFetching,
  });
}

/** Public token detail. Anyone may read. */
export function useToken(tokenId: TokenId | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<TradeToken | null>({
    queryKey: queryKeys.token(tokenId ?? 0n),
    queryFn: async () => {
      if (!actor || tokenId === null) return null;
      return actor.getToken(tokenId);
    },
    enabled: !!actor && !isFetching && tokenId !== null,
  });
}

/** Public list of documents attached to a token. Anyone may read. */
export function useTokenDocuments(tokenId: TokenId | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<AttachedDocument[]>({
    queryKey: queryKeys.tokenDocuments(tokenId ?? 0n),
    queryFn: async () => {
      if (!actor || tokenId === null) return [];
      return actor.listTokenDocuments(tokenId);
    },
    enabled: !!actor && !isFetching && tokenId !== null,
  });
}

/** Tokens the caller issued. Private to the caller. */
export function useIssuedTokens() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<IssuedTokenView[]>({
    queryKey: queryKeys.issuedTokens,
    queryFn: async () => {
      if (!actor) return [];
      return actor.listIssuedTokens();
    },
    enabled: !!actor && !isFetching,
  });
}

/** Tokens the caller funded. Private to the caller. */
export function useFundedTokens() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<FundedTokenView[]>({
    queryKey: queryKeys.fundedTokens,
    queryFn: async () => {
      if (!actor) return [];
      return actor.listFundedTokens();
    },
    enabled: !!actor && !isFetching,
  });
}

/** Invalidate every query affected by a token mutation. */
function useInvalidateTokenData() {
  const queryClient = useQueryClient();
  return (tokenId?: TokenId) => {
    void queryClient.invalidateQueries({ queryKey: ["marketplace"] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.issuedTokens });
    void queryClient.invalidateQueries({ queryKey: queryKeys.fundedTokens });
    if (tokenId !== undefined) {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.token(tokenId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.tokenDocuments(tokenId),
      });
    }
  };
}

export interface CreateTokenInput {
  kind: import("@/backend").TokenKind;
  faceValue: bigint;
  currency: string;
  debtorName: string;
  issueDate: bigint;
  maturityDate: bigint;
  fundingTarget: bigint;
  returnTerms: string;
}

/** Create a tokenized invoice or purchase order. */
export function useCreateToken() {
  const { actor } = useActor(createActor);
  const invalidate = useInvalidateTokenData();
  return useMutation({
    mutationFn: async (input: CreateTokenInput) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.createToken(
        input.kind,
        input.faceValue,
        input.currency,
        input.debtorName,
        input.issueDate,
        input.maturityDate,
        input.fundingTarget,
        input.returnTerms,
      );
    },
    onSuccess: () => {
      invalidate();
    },
  });
}

export interface UpdateTokenInput extends CreateTokenInput {
  tokenId: TokenId;
}

/** Update an open token the caller issued. */
export function useUpdateToken() {
  const { actor } = useActor(createActor);
  const invalidate = useInvalidateTokenData();
  return useMutation({
    mutationFn: async (input: UpdateTokenInput) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.updateToken(
        input.tokenId,
        input.faceValue,
        input.currency,
        input.debtorName,
        input.issueDate,
        input.maturityDate,
        input.fundingTarget,
        input.returnTerms,
      );
    },
    onSuccess: (_result, input) => {
      invalidate(input.tokenId);
    },
  });
}

/** Cancel an open token the caller issued. */
export function useCancelToken() {
  const { actor } = useActor(createActor);
  const invalidate = useInvalidateTokenData();
  return useMutation({
    mutationFn: async (tokenId: TokenId) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.cancelToken(tokenId);
    },
    onSuccess: (_result, tokenId) => {
      invalidate(tokenId);
    },
  });
}

/** Commit funds to an open token. */
export function useFundToken() {
  const { actor } = useActor(createActor);
  const invalidate = useInvalidateTokenData();
  return useMutation({
    mutationFn: async ({
      tokenId,
      amount,
    }: {
      tokenId: TokenId;
      amount: bigint;
    }) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.fundToken(tokenId, amount);
    },
    onSuccess: (_result, input) => {
      invalidate(input.tokenId);
    },
  });
}

/** Attach a document to a token the caller issued. */
export function useAttachDocument() {
  const { actor } = useActor(createActor);
  const invalidate = useInvalidateTokenData();
  return useMutation({
    mutationFn: async ({
      tokenId,
      file,
      fileName,
      contentType,
    }: {
      tokenId: TokenId;
      file: Uint8Array;
      fileName: string;
      contentType: string;
    }) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.attachDocument(tokenId, file, fileName, contentType);
    },
    onSuccess: (_result, input) => {
      invalidate(input.tokenId);
    },
  });
}

/** Settle a token to funded once its funding target is reached. */
export function useSettleFunding() {
  const { actor } = useActor(createActor);
  const invalidate = useInvalidateTokenData();
  return useMutation({
    mutationFn: async (tokenId: TokenId) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.settleFunding(tokenId);
    },
    onSuccess: (_result, tokenId) => {
      invalidate(tokenId);
    },
  });
}

/** Settle a matured token and distribute returns. */
export function useSettleMaturity() {
  const { actor } = useActor(createActor);
  const invalidate = useInvalidateTokenData();
  return useMutation({
    mutationFn: async (tokenId: TokenId) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.settleMaturity(tokenId);
    },
    onSuccess: (_result, tokenId) => {
      invalidate(tokenId);
    },
  });
}

/** The caller's balance and lifetime totals. Private to the caller. */
export function useMyBalance() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<BalanceView>({
    queryKey: queryKeys.myBalance,
    queryFn: async () => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.getMyBalance();
    },
    enabled: !!actor && !isFetching,
  });
}

/** The caller's own ledger events, newest first, optionally filtered by kind. */
export function useMyEvents(kindFilter: TokenEventKind | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<TokenEvent[]>({
    queryKey: queryKeys.myEvents(kindFilter),
    queryFn: async () => {
      if (!actor) return [];
      return actor.listMyEvents(kindFilter);
    },
    enabled: !!actor && !isFetching,
  });
}

/** Public aggregate network totals. Anyone may read. */
export function useLedgerSummary() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<LedgerSummary>({
    queryKey: queryKeys.ledgerSummary,
    queryFn: async () => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.getLedgerSummary();
    },
    enabled: !!actor && !isFetching,
  });
}

/** Public feed of recent token events. Anyone may read. */
export function useRecentEvents(limit: bigint) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<PublicEventView[]>({
    queryKey: queryKeys.recentEvents(limit),
    queryFn: async () => {
      if (!actor) return [];
      return actor.listRecentEvents(limit);
    },
    enabled: !!actor && !isFetching,
  });
}

/** The caller's own submitted invoices, newest first. Private to the caller. */
export function useMyInvoices() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<InvoiceView[]>({
    queryKey: queryKeys.myInvoices,
    queryFn: async () => {
      if (!actor) return [];
      return actor.listMyInvoices();
    },
    enabled: !!actor && !isFetching,
  });
}

export interface SubmitInvoiceInput {
  category: InvoiceCategory;
  retailerName: string;
  vendorReference: string;
  invoiceDate: bigint;
  totalAmount: bigint;
  currency: string;
  lineItems: InvoiceLineItem[];
  file: Uint8Array;
}

/** Submit a reviewed invoice: store it as accepted and mint tokens for the owner. */
export function useSubmitInvoice() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SubmitInvoiceInput) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.submitInvoice(
        input.category,
        input.retailerName,
        input.vendorReference,
        input.invoiceDate,
        input.totalAmount,
        input.currency,
        input.lineItems,
        input.file,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.myInvoices });
      void queryClient.invalidateQueries({ queryKey: queryKeys.myBalance });
      void queryClient.invalidateQueries({ queryKey: ["myEvents"] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.ledgerSummary });
      void queryClient.invalidateQueries({ queryKey: ["recentEvents"] });
    },
  });
}
