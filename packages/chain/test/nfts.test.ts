import { TestingAppChain } from "@proto-kit/sdk";
import { PrivateKey } from "o1js";
import { Nfts } from "../src/nfts";
import { log } from "@proto-kit/common";
import { BalancesKey, TokenId, UInt64 } from "@proto-kit/library";
import { Collection, CollectionId, InstanceId, ItemId } from "../src/nfts/lib"

log.setLevel("ERROR");

describe("nfts", () => {
  it("should demonstrate how nfts work", async () => {
    const appChain = TestingAppChain.fromRuntime({
      Nfts,
    });

    appChain.configurePartial({
      Runtime: {
        Balances: {
          totalSupply: UInt64.from(10000),
        },
        Nfts: {
          pricePerMint: UInt64.from(100),
        },
      },
    });

    await appChain.start();

    const alicePrivateKey = PrivateKey.random();
    const alice = alicePrivateKey.toPublicKey();
    // console.log(alice);
    const collection = CollectionId.from(0);
    const instance = InstanceId.from(0);
    const tokenId = ItemId.from(collection, instance);
    // console.log(tokenId);

    appChain.setSigner(alicePrivateKey);

    const nfts = appChain.runtime.resolve("Nfts");

    const tx1 = await appChain.transaction(alice, () => {
      // balances.addBalance(tokenId, alice, UInt64.from(1000));
      nfts.mintSigned(tokenId, alice);
    });

    await tx1.sign();
    await tx1.send();

    const block = await appChain.produceBlock();

    const item = await appChain.query.runtime.Nfts.items.get(tokenId);

    expect(block?.transactions[0].status.toBoolean()).toBe(true);
    // console.log(item);
    expect(item?.owner.toBase58()).toBe(alice.toBase58());
  }, 1_000_000);
});
