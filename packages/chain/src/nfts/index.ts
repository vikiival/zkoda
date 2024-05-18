import { Balance, TokenId } from '@proto-kit/library'
import { runtimeMethod, runtimeModule, state } from '@proto-kit/module'
import { State, StateMap, assert } from '@proto-kit/protocol'
import { Poseidon, PublicKey, UInt32 } from 'o1js'
import { inject } from 'tsyringe'
import { Balances } from '../balances'
import { CollectionId, InstanceId, ItemId, NonFungibles } from './lib'
import { run } from 'node:test'
// import { UInt32 } from "@proto-kit/library"

interface NftsConfig {
  pricePerMint: Balance
}

@runtimeModule()
export class Nfts extends NonFungibles<NftsConfig> {
  @state()
  public circulatingSupply = State.from<Balance>(Balance)

  @state()
  public listings = StateMap.from<ItemId, Balance>(ItemId, Balance)

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

  @runtimeMethod()
  public listSigned(
    tokenId: ItemId,
    price: Balance
  ): void {
    const item = this.getItem(tokenId)
    assert(item.owner.equals(this.transaction.sender.value), 'Not owner')
    this.listings.set(tokenId, price)
  }

  @runtimeMethod()
  public buySigned(
    tokenId: ItemId,
    price: Balance
  ): void {
    const sender = this.transaction.sender.value
    const item = this.getItem(tokenId)
    const listing = this.listings.get(tokenId)
    assert(listing.isSome, 'No listing')
    assert(price.equals(listing.value), 'Incorrect price')
    const balance = this.balances.getBalance(TokenId.from(0), sender)
    assert(balance.greaterThanOrEqual(listing.value), 'Insufficient balance')
    this.balances.transfer(TokenId.from(0), sender, item.owner, listing.value)
    this.listings.set(tokenId, Balance.zero)
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
  

  // @runtimeMethod()
  // public addBalance(
  //   tokenId: TokenId,
  //   address: PublicKey,
  //   amount: Balance,
  // ): void {
  //   const circulatingSupply = this.circulatingSupply.get()
  //   const newCirculatingSupply = Balance.from(circulatingSupply.value).add(
  //     amount,
  //   )
  //   // assert(
  //   //   newCirculatingSupply.lessThanOrEqual(this.config.totalSupply),
  //   //   'Circulating supply would be higher than total supply',
  //   // )
  //   this.circulatingSupply.set(newCirculatingSupply)
  //   this.mint(tokenId, address, amount)
  // }
}
