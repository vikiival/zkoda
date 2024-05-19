import "reflect-metadata";
import { TestingAppChain } from "@proto-kit/sdk";
import { Bool, MerkleMap, Nullifier, Poseidon, PrivateKey } from "o1js";
import { Nfts } from "../src/nfts";
import { log } from "@proto-kit/common";
import { BalancesKey, TokenId, UInt64 } from "@proto-kit/library";
import { Collection, CollectionId, InstanceId, ItemId } from "../src/nfts/lib"
import { HolderProof, HolderPublicOutput, isHolder, message } from "../src/nfts/holder"
import { Pickles } from "o1js/dist/node/snarky"
import { dummyBase64Proof } from "o1js/dist/node/lib/proof_system"

log.setLevel("ERROR");

describe("verify", () => {
  it("should demonstrate how nfts verify work", async () => {
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

    const alicePrivateKey = PrivateKey.fromBigInt(BigInt(1));
    const alice = alicePrivateKey.toPublicKey();
    // console.log(alice);
    const collection = CollectionId.from(0);
    const instance = InstanceId.from(0);
    const tokenId = ItemId.from(collection, instance);
    const map = new MerkleMap();
    const key = Poseidon.hash(alice.toFields());
    map.set(key, Bool(true).toField());

    const witness = map.getWitness(key);

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
  
    // console.log(tokenId);

    appChain.setSigner(alicePrivateKey);

    const nfts = appChain.runtime.resolve("Nfts");

    const tx1 = await appChain.transaction(alice, () => {
      nfts.setCommitment(map.getRoot());
    });

    await tx1.sign();
    await tx1.send();

    const block = await appChain.produceBlock();

    const commitment = await appChain.query.runtime.Nfts.commitment.get();

    expect(commitment?.toBigInt()).toBe(map.getRoot().toBigInt());

    const nullifier = Nullifier.fromJSON(
      Nullifier.createTestNullifier(message, alicePrivateKey)
    );

    const holderProof = await mockProof(isHolder(witness, nullifier));

    const tx2 = await appChain.transaction(alice, () => {
      nfts.verifyHolder(holderProof);
    });

    await tx2.sign();
    await tx2.send();

    const block2 = await appChain.produceBlock();

    const storedNullifier = await appChain.query.runtime.Nfts.nullifiers.get(
      holderProof.publicOutput.nullifier
    );

    expect(storedNullifier?.toBoolean()).toBe(true);
    // console.log(item);
  }, 1_000_000);
});
