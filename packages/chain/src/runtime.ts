import { Balance } from "@proto-kit/library";
import { Balances } from "./balances";
import { ModulesConfig } from "@proto-kit/common";
import { Nfts } from "./nfts"

export const modules = {
  Balances,
  Nfts,
};

export const config: ModulesConfig<typeof modules> = {
  Balances: {
    totalSupply: Balance.from(10_000),
  },
  Nfts: {
    pricePerMint: Balance.from(100),
  },
};

export default {
  modules,
  config,
};
