import { Balance, TokenId } from '@proto-kit/library'
import { runtimeMethod, runtimeModule, state } from '@proto-kit/module'
import { State, StateMap, assert } from '@proto-kit/protocol'
import { Bool, Field, Poseidon, PublicKey, UInt32 } from 'o1js'
import { inject } from 'tsyringe'
import { Balances } from '../balances'
import { CollectionId, InstanceId, ItemId, NonFungibles } from './lib'
import { run } from 'node:test'
import { HolderProof } from './holder'
// import { UInt32 } from "@proto-kit/library"

interface NftsConfig {
  pricePerMint: Balance
}

@runtimeModule()
export class Nfts extends NonFungibles<NftsConfig> {
  @state()
  public circulatingSupply = State.from<Balance>(Balance)

  @state() public commitment = State.from<Field>(Field);
  @state() public nullifiers = StateMap.from<Field, Bool>(Field, Bool);

  // @state()
  // public listings = StateMap.from<ItemId, Balance>(ItemId, Balance)

  public constructor(@inject("Balances") private balances: Balances) {
    super()
  }

  @runtimeMethod()
  public addPass(
    instance: InstanceId,
    to: PublicKey,
    salt: UInt32
  ): void {
    const collectionId = CollectionId.from(0)
    // const nonce = this.transaction.nonce.value
    
    assert(this.transaction.sender.isSome, 'No sender')

    const sender = this.transaction.sender.value
    
    const tokenId = ItemId.from(collectionId, instance)
    const balance = this.balances.getBalance(TokenId.from(0), sender)
    assert(balance.greaterThanOrEqual(this.config.pricePerMint), 'Insufficient balance')
    // this.balances.setBalance(TokenId.from(0), this.transaction.sender.value, this.config.pricePerMint)
    this.mint(tokenId, sender, to)
    const hash = Poseidon.hash(salt.toFields())
    this.setMetadata(tokenId, hash)
  }

  // @runtimeMethod()
  // public listSigned(
  //   tokenId: ItemId,
  //   price: Balance
  // ): void {
  //   const item = this.getItem(tokenId)
  //   assert(item.owner.equals(this.transaction.sender.value), 'Not owner')
  //   this.listings.set(tokenId, price)
  // }

  // @runtimeMethod()
  // public buySigned(
  //   tokenId: ItemId,
  //   price: Balance
  // ): void {
  //   const sender = this.transaction.sender.value
  //   const item = this.getItem(tokenId)
  //   const listing = this.listings.get(tokenId)
  //   assert(listing.isSome, 'No listing')
  //   assert(price.equals(listing.value), 'Incorrect price')
  //   const balance = this.balances.getBalance(TokenId.from(0), sender)
  //   assert(balance.greaterThanOrEqual(listing.value), 'Insufficient balance')
  //   this.balances.transfer(TokenId.from(0), sender, item.owner, listing.value)
  //   this.listings.set(tokenId, Balance.zero)
  // }

  @runtimeMethod()
  public verifyHolder(
    holderProof: HolderProof,
  ) {
    holderProof.verify();
    const commitment = this.commitment.get();
    // const commitment = UInt32.from(0);

    assert(
      holderProof.publicOutput.root.equals(commitment.value),
      "Cannot verify holder proof"
    );

    const isNullifierUsed = this.nullifiers.get(
      holderProof.publicOutput.nullifier
    );

    assert(isNullifierUsed.value.not(), "Nullifier is used");

    this.nullifiers.set(holderProof.publicOutput.nullifier, Bool(true));

  }

  // @runtimeMethod()
  // public lockSigned(
  //   tokenId: ItemId,
  //   to: PublicKey,
  //   hash: Poseidon,
  // ): void {
  //   const item = this.getItem(tokenId)

  //   // assert(item.owner.equals(this.transaction.sender.value), 'Not owner')
  //   // this.lock(tokenId, to, hash)
  // }
  
}
