import {
  Bool,
  Experimental,
  Field,
  MerkleMapWitness,
  Nullifier,
  Poseidon,
  Struct
} from "o1js"

export class HolderPublicOutput extends Struct({
  root: Field,
  nullifier: Field,
}) {}

export const message: Field[] = [Field(0)];

export function isHolder(
  witness: MerkleMapWitness,
  nullifier: Nullifier
): HolderPublicOutput {
  const key = Poseidon.hash(nullifier.getPublicKey().toFields());
  const [computedRoot, computedKey] = witness.computeRootAndKey(
    Bool(true).toField()
  );
  computedKey.assertEquals(key);

  nullifier.verify(message);

  return new HolderPublicOutput({
    root: computedRoot,
    nullifier: nullifier.key(),
  });
}

export const holder = Experimental.ZkProgram({
  publicOutput: HolderPublicOutput,
  methods: {
    canClaim: {
      privateInputs: [MerkleMapWitness, Nullifier],
      method: isHolder,
    },
  },
});

export class HolderProof extends Experimental.ZkProgram.Proof(holder) {}