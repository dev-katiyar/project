export type FundamentalData = {
  outstandingShares: {
    annual: OutstandingShares[];
    quarterly: OutstandingShares[];
  };
};

export type OutstandingShares = {
    date: string;
    shares: number;
}