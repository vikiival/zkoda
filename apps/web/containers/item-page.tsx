"use client";
import { Item } from "@/components/item";
import { useFaucet, useNftsStore } from "@/lib/stores/nfts";
import { useWalletStore } from "@/lib/stores/wallet";

export default function Home() {
  const wallet = useWalletStore();
  const drip = useFaucet();
  const nfts = useNftsStore();

  return (
    <div className="mx-auto -mt-32 h-full pt-16">
      <div className="flex h-full w-full items-center justify-center pt-16">
        <div className="flex basis-4/12 flex-col items-center justify-center 2xl:basis-3/12">
          <Item
            wallet={wallet.wallet}
            onConnectWallet={wallet.connectWallet}
            onDrip={drip}
            nft={nfts.items['0']}
            loading={false}
          />
        </div>
      </div>
    </div>
  );
}
