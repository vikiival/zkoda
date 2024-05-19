import { PendingTransaction, UnsignedTransaction } from "@proto-kit/sequencer"
import { CollectionId, InstanceId, Item, ItemId } from "chain/dist/nfts/lib"
import { HolderPublicOutput, HolderProof, message, isHolder } from "chain/dist/nfts/holder"
import { Bool, MerkleMap, Nullifier, Poseidon, PrivateKey, Proof, PublicKey, UInt32, UInt64, Experimental } from "o1js"
import { useCallback, useEffect } from "react"o
import { create } from "zustand"
import { immer } from "zustand/middleware/immer"
import { useChainStore } from "./chain"
import { Client, useClientStore } from "./client"
import { useWalletStore } from "./wallet"
import { sha256 } from "ohash";
// import { Pickles } from "snarkyjs";
import { Pickles } from "o1js/dist/node/snarky";
import { dummyBase64Proof } from "o1js/dist/node/lib/proof_system";
// type Pickles = Experimental.Callback;

export interface ReadableItem {
  owner: string;
  metadata: string;
  locked: boolean;
}

export interface NftsState {
  loading: boolean;
  items: {
    // tokenId - state
    [key: string]: ReadableItem | undefined;
  };
  loadBalance: (client: Client, address: string) => Promise<void>;
  faucet: (client: Client, address: string) => Promise<PendingTransaction>;
  transfer: (client: Client, address: string, destination: string) => Promise<PendingTransaction>;
  verify: (client: Client, address: string) => Promise<PendingTransaction>;
}

function isPendingTransaction(
  transaction: PendingTransaction | UnsignedTransaction | undefined,
): asserts transaction is PendingTransaction {
  if (!(transaction instanceof PendingTransaction))
    throw new Error("Transaction is not a PendingTransaction");
}

export const collectionId = CollectionId.from(0);
export const instanceId = InstanceId.from(0);
// export const tokenId = TokenId.from(0);

export const useNftsStore = create<
  NftsState,
  [["zustand/immer", never]]
>(
  immer((set) => ({
    loading: Boolean(false),
    items: {},
    balances: {},
    async loadBalance(client: Client, address: string) {
      set((state) => {
        state.loading = true;
      });

      PublicKey.fromBase58(address);
      const onlyInstance = InstanceId.from(0);
      const key = ItemId.from(collectionId, onlyInstance);

      const item = await client.query.runtime.Nfts.items.get(key);
      console.log(item?.metadata.toString());
      console.log(item?.locked.toBoolean());
      const owner = item?.owner ? PublicKey.toBase58(item.owner) : "";
      const metadata = item?.metadata ? '0x' + sha256(item?.metadata.toString()) : "";

      set((state) => {
        state.loading = false;
        state.items[onlyInstance.toString()] = {
          owner,
          metadata,
          locked: item?.locked ? item?.locked.toBoolean() : false,
        }
      });
    },
    async faucet(client: Client, address: string) {
      const nfts = client.runtime.resolve("Nfts");
      const sender = PublicKey.fromBase58(address);
      const secondsSinceEpoch = Math.floor(Date.now() / 1000);
      const uint32Time = secondsSinceEpoch >>> 0; 

      const tx = await client.transaction(sender, () => {
        const salt = UInt32.from(uint32Time);
        nfts.addPass(instanceId, sender, salt);
      });

      await tx.sign();
      await tx.send();

      isPendingTransaction(tx.transaction);
      instanceId.add(1);
      return tx.transaction;
    },
    async transfer(client: Client, address: string, destination: string) {
      const nfts = client.runtime.resolve("Nfts");
      const sender = PublicKey.fromBase58(address);
      const to = PublicKey.fromBase58(destination);

      const tx = await client.transaction(sender, () => {
        nfts.transferSigned(instanceId, sender, to);
      });

      await tx.sign();
      await tx.send();

      isPendingTransaction(tx.transaction);
      return tx.transaction;
    },
    async verify(client: Client, address: string) {
      const nfts = client.runtime.resolve("Nfts");
      const sender = PublicKey.fromBase58(address);
      const map = new MerkleMap();
      const key = Poseidon.hash(sender.toFields());
      map.set(key, Bool(true).toField());
    
      const witness = map.getWitness(key);
      const pk = PrivateKey.fromBase58('5FFG7GHAR2F2xCb5bqaLQrdgNGdtEL64tYgZimRBHDjuxVuA')

      const nullifier = Nullifier.fromJSON(
        Nullifier.createTestNullifier(message, pk)
      );

      const canHold = isHolder(witness, nullifier);

      const proof = await mockProof(canHold);

      const tx = await client.transaction(sender, () => {
        nfts.verifyHolder(proof);
      });

      await tx.sign();
      await tx.send();

      isPendingTransaction(tx.transaction);
      return tx.transaction;
    }
  })),
);

export const useNftBalance = () => {
  const client = useClientStore();
  const chain = useChainStore();
  const wallet = useWalletStore();
  const nfts = useNftsStore();

  useEffect(() => {
    if (!client.client || !wallet.wallet) return;

    nfts.loadBalance(client.client, wallet.wallet);
  }, [client.client, chain.block?.height, wallet.wallet]);
};

export const useFaucet = () => {
  const client = useClientStore();
  const nfts = useNftsStore();
  const wallet = useWalletStore();

  return useCallback(async () => {
    if (!client.client || !wallet.wallet) return;

    const pendingTransaction = await nfts.faucet(
      client.client,
      wallet.wallet,
    );

    wallet.addPendingTransaction(pendingTransaction);
  }, [client.client, wallet.wallet]);
};

export const useTransfer = () => {
  const client = useClientStore();
  const nfts = useNftsStore();
  const wallet = useWalletStore();

  return useCallback(async (destination: string) => {
    if (!client.client || !wallet.wallet) return;

    const pendingTransaction = await nfts.transfer(
      client.client,
      wallet.wallet,
      destination
    );

    wallet.addPendingTransaction(pendingTransaction);
  }, [client.client, wallet.wallet]);
};

async function mockProof(
  publicOutput: HolderPublicOutput
): Promise<HolderProof> {
  const [, proof] = Pickles.proofOfBase64(await dummyBase64Proof(), 2);
  return new HolderProof({
    proof: proof,
    maxProofsVerified: 2,
    publicInput: undefined,
    publicOutput,
  });
}

export const useProof = () => {
  const client = useClientStore();
  const nfts = useNftsStore();
  const wallet = useWalletStore();

  return useCallback(async () => {
    if (!client.client || !wallet.wallet) return;

    const pendingTransaction = await nfts.verify(
      client.client,
      wallet.wallet,
    );

    wallet.addPendingTransaction(pendingTransaction);
  }, [client.client, wallet.wallet]);
};

export const useValidate = () => {
  const client = useClientStore();
  const nfts = useNftsStore();
  const wallet = useWalletStore();

  return useCallback(async () => {
    if (!client.client || !wallet.wallet) return;

    const pendingTransaction = await nfts.verify(
      client.client,
      wallet.wallet,
    );

    wallet.addPendingTransaction(pendingTransaction);
  }, [client.client, wallet.wallet]);
};