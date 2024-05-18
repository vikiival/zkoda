import Header from "@/components/header";
import { Toaster } from "@/components/ui/toaster";
import { useBalancesStore, useObserveBalance } from "@/lib/stores/balances";
import { useChainStore, usePollBlockHeight } from "@/lib/stores/chain";
import { useClientStore } from "@/lib/stores/client";
import { useNftBalance, useNftsStore } from "@/lib/stores/nfts"
import { useNotifyTransactions, useWalletStore } from "@/lib/stores/wallet";
import { ReactNode, use, useEffect, useMemo } from "react";

export default function AsyncLayout({ children }: { children: ReactNode }) {
  const wallet = useWalletStore();
  const client = useClientStore();
  const chain = useChainStore();
  const balances = useBalancesStore();
  const nfts = useNftsStore();

  usePollBlockHeight();
  useObserveBalance();
  useNotifyTransactions();
  useNftBalance();

  useEffect(() => {
    client.start();
  }, []);

  useEffect(() => {
    wallet.initializeWallet();
    wallet.observeWalletChange();
  }, []);

  const loading = useMemo(
    () => client.loading || balances.loading || nfts.loading,
    [client.loading, balances.loading],
  );

  

  return (
    <>
      <Header
        loading={client.loading}
        balance={balances.balances[wallet.wallet ?? ""]}
        balanceLoading={loading}
        nft={nfts.items['0']}
        wallet={wallet.wallet}
        onConnectWallet={wallet.connectWallet}
        blockHeight={chain.block?.height ?? "-"}
      />
      {children}
      <Toaster />
    </>
  );
}
