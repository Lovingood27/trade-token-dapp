import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface AttachedDocument {
    id: DocumentId;
    tokenId: TokenId;
    contentType: string;
    file: FileRef;
    fileName: string;
    uploadedAt: Timestamp;
}
export interface BalanceView {
    balance: bigint;
    used: bigint;
    earned: bigint;
    burned: bigint;
}
export interface Cell {
    value: Value;
    name: string;
}
export type CommitmentId = bigint;
export type DocumentId = bigint;
export type Error_ = {
    __kind__: "FrontendOriginsNotConfigured";
    FrontendOriginsNotConfigured: null;
} | {
    __kind__: "MixedSsoSources";
    MixedSsoSources: {
        otherKeys: Array<string>;
        ssoKeys: Array<string>;
    };
} | {
    __kind__: "Stale";
    Stale: {
        ageNs: bigint;
    };
} | {
    __kind__: "MalformedCandid";
    MalformedCandid: null;
} | {
    __kind__: "AmbiguousAttribute";
    AmbiguousAttribute: {
        field: string;
        sources: Array<string>;
    };
} | {
    __kind__: "NoAttributes";
    NoAttributes: null;
} | {
    __kind__: "UnknownNonce";
    UnknownNonce: null;
} | {
    __kind__: "UntrustedSsoSource";
    UntrustedSsoSource: {
        domain: string;
    };
} | {
    __kind__: "MissingField";
    MissingField: string;
} | {
    __kind__: "FrontendOriginMismatch";
    FrontendOriginMismatch: {
        got: string;
        expected: Array<string>;
    };
};
export type EventId = bigint;
export type FileRef = Uint8Array;
export interface FundedTokenView {
    token: TradeToken;
    commitment: FundingCommitment;
}
export interface FundingCommitment {
    id: CommitmentId;
    tokenId: TokenId;
    expectedReturn: bigint;
    amount: bigint;
    committedAt: Timestamp;
    investor: Principal;
}
export interface Invoice {
    id: InvoiceId;
    status: InvoiceStatus;
    lineItems: Array<InvoiceLineItem>;
    owner: Principal;
    file: FileRef;
    createdAt: Timestamp;
    retailerName: string;
    invoiceDate: Timestamp;
    totalAmount: bigint;
    currency: string;
    vendorReference: string;
    category: InvoiceCategory;
    mintedAmount: bigint;
}
export type InvoiceError = {
    __kind__: "invalidInvoice";
    invalidInvoice: string;
} | {
    __kind__: "invoiceNotFound";
    invoiceNotFound: InvoiceId;
} | {
    __kind__: "notOwner";
    notOwner: null;
} | {
    __kind__: "alreadyReviewed";
    alreadyReviewed: InvoiceStatus;
};
export type InvoiceId = bigint;
export interface InvoiceLineItem {
    description: string;
    quantity: bigint;
    amount: bigint;
}
export type InvoiceResult = {
    __kind__: "ok";
    ok: InvoiceId;
} | {
    __kind__: "err";
    err: InvoiceError;
};
export interface InvoiceView {
    invoice: Invoice;
}
export interface IssuedTokenView {
    token: TradeToken;
    commitmentCount: bigint;
}
export interface LedgerSummary {
    totalMinted: bigint;
    invoiceCount: bigint;
    totalUsed: bigint;
    totalBurned: bigint;
    participantCount: bigint;
}
export interface PublicEventView {
    id: EventId;
    ownerShort: string;
    kind: TokenEventKind;
    createdAt: Timestamp;
    reference?: string;
    amount: bigint;
    reason: string;
}
export interface Result {
    hasMore: boolean;
    rows: Array<Array<Cell>>;
}
export type Result__1 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: Error_;
};
export type Timestamp = bigint;
export interface TokenEvent {
    id: EventId;
    owner: Principal;
    kind: TokenEventKind;
    createdAt: Timestamp;
    reference?: string;
    amount: bigint;
    reason: string;
}
export type TokenId = bigint;
export interface TokenSummary {
    id: TokenId;
    status: TokenStatus;
    returnTerms: string;
    maturityDate: Timestamp;
    kind: TokenKind;
    issuer: Principal;
    currency: string;
    amountFunded: bigint;
    fundingProgress: number;
    fundingTarget: bigint;
    faceValue: bigint;
}
export type TradeError = {
    __kind__: "tokenCancelled";
    tokenCancelled: null;
} | {
    __kind__: "tokenMatured";
    tokenMatured: null;
} | {
    __kind__: "unauthorizedIssuer";
    unauthorizedIssuer: null;
} | {
    __kind__: "invalidTerms";
    invalidTerms: string;
} | {
    __kind__: "tokenNotOpen";
    tokenNotOpen: null;
} | {
    __kind__: "tokenNotFound";
    tokenNotFound: TokenId;
} | {
    __kind__: "exceedsFundingTarget";
    exceedsFundingTarget: {
        remaining: bigint;
    };
} | {
    __kind__: "notIssuer";
    notIssuer: null;
};
export type TradeResult = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: TradeError;
};
export type TradeResult_1 = {
    __kind__: "ok";
    ok: CommitmentId;
} | {
    __kind__: "err";
    err: TradeError;
};
export type TradeResult_2 = {
    __kind__: "ok";
    ok: TokenId;
} | {
    __kind__: "err";
    err: TradeError;
};
export type TradeResult_3 = {
    __kind__: "ok";
    ok: DocumentId;
} | {
    __kind__: "err";
    err: TradeError;
};
export interface TradeToken {
    id: TokenId;
    issueDate: Timestamp;
    status: TokenStatus;
    returnTerms: string;
    maturityDate: Timestamp;
    kind: TokenKind;
    createdAt: Timestamp;
    debtorName: string;
    issuer: Principal;
    currency: string;
    amountFunded: bigint;
    fundingTarget: bigint;
    faceValue: bigint;
}
export type Value = {
    __kind__: "int";
    int: bigint;
} | {
    __kind__: "nat";
    nat: bigint;
} | {
    __kind__: "float";
    float: number;
} | {
    __kind__: "bool";
    bool: boolean;
} | {
    __kind__: "null";
    null: null;
} | {
    __kind__: "text";
    text: string;
};
export enum InvoiceCategory {
    heavyEquipmentRental = "heavyEquipmentRental",
    handAndPowerTools = "handAndPowerTools",
    materialOrder = "materialOrder"
}
export enum InvoiceStatus {
    pendingReview = "pendingReview",
    rejected = "rejected",
    accepted = "accepted"
}
export enum TokenEventKind {
    use = "use",
    burn = "burn",
    mint = "mint"
}
export enum TokenKind {
    invoice = "invoice",
    purchaseOrder = "purchaseOrder"
}
export enum TokenSort {
    maturityDate = "maturityDate",
    fundingProgress = "fundingProgress",
    faceValue = "faceValue"
}
export enum TokenStatus {
    cancelled = "cancelled",
    open = "open",
    funded = "funded",
    matured = "matured"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    /**
     * / Attach a document to a token the caller issued. Signed-in callers only.
     */
    attachDocument(tokenId: TokenId, file: FileRef, fileName: string, contentType: string): Promise<TradeResult_3>;
    /**
     * / Cancel an open token the caller issued. Signed-in callers only.
     */
    cancelToken(tokenId: TokenId): Promise<TradeResult>;
    /**
     * / Create a tokenized invoice or purchase order. Signed-in callers only.
     */
    createToken(kind: TokenKind, faceValue: bigint, currency: string, debtorName: string, issueDate: Timestamp, maturityDate: Timestamp, fundingTarget: bigint, returnTerms: string): Promise<TradeResult_2>;
    execute(qJson: string): Promise<Result>;
    /**
     * / Commit funds to an open token. Signed-in callers only.
     * / Rejects a token that is not open, a cancelled or matured token, and an
     * / amount that exceeds the remaining funding target. Funding progress is
     * / updated automatically and the token moves to funded the moment
     * / commitments reach its funding target, locking further commitments.
     */
    fundToken(tokenId: TokenId, amount: bigint): Promise<TradeResult_1>;
    getApiDoc(): Promise<string>;
    getCallerUserRole(): Promise<UserRole>;
    /**
     * / Public aggregate network totals. Anyone may read.
     */
    getLedgerSummary(): Promise<LedgerSummary>;
    /**
     * / The caller's balance and lifetime totals. Signed-in callers only.
     */
    getMyBalance(): Promise<BalanceView>;
    /**
     * / Public token detail. Anyone may read.
     */
    getToken(tokenId: TokenId): Promise<TradeToken | null>;
    isCallerAdmin(): Promise<boolean>;
    /**
     * / Tokens the caller funded, with the caller's commitment, current status and
     * / expected return. Private to the caller.
     */
    listFundedTokens(): Promise<Array<FundedTokenView>>;
    /**
     * / Tokens the caller issued. Private to the caller.
     */
    listIssuedTokens(): Promise<Array<IssuedTokenView>>;
    /**
     * / Public marketplace listing. Anyone may read.
     */
    listMarketplace(statusFilter: TokenStatus | null, sortBy: TokenSort): Promise<Array<TokenSummary>>;
    /**
     * / The caller's own events, newest first, optionally filtered by kind.
     * / Signed-in callers only.
     */
    listMyEvents(kindFilter: TokenEventKind | null): Promise<Array<TokenEvent>>;
    /**
     * / The caller's own invoices, newest first. Private to the caller.
     */
    listMyInvoices(): Promise<Array<InvoiceView>>;
    /**
     * / Public feed of recent token events with the owner principal shortened.
     * / Anyone may read.
     */
    listRecentEvents(limit: bigint): Promise<Array<PublicEventView>>;
    /**
     * / Public list of documents attached to a token. Anyone may read.
     */
    listTokenDocuments(tokenId: TokenId): Promise<Array<AttachedDocument>>;
    schema(): Promise<string>;
    /**
     * / Move an open token to funded once its funding target is reached.
     * / Signed-in callers only.
     */
    settleFunding(tokenId: TokenId): Promise<TradeResult>;
    /**
     * / Move a funded token that has reached its maturity date to matured and
     * / distribute returns to its funders per the token's return terms. The
     * / distribution is recorded per commitment on each commitment's expected
     * / return. Signed-in callers only.
     */
    settleMaturity(tokenId: TokenId): Promise<TradeResult>;
    /**
     * / Submit a reviewed invoice: store it as accepted and mint tokens for the
     * / owner. Signed-in callers only.
     */
    submitInvoice(category: InvoiceCategory, retailerName: string, vendorReference: string, invoiceDate: Timestamp, totalAmount: bigint, currency: string, lineItems: Array<InvoiceLineItem>, file: FileRef): Promise<InvoiceResult>;
    /**
     * / Update an open token the caller issued. Signed-in callers only.
     */
    updateToken(tokenId: TokenId, faceValue: bigint, currency: string, debtorName: string, issueDate: Timestamp, maturityDate: Timestamp, fundingTarget: bigint, returnTerms: string): Promise<TradeResult>;
}
