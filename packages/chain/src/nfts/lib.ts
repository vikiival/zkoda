import {
  RuntimeModule,
  runtimeMethod,
  runtimeModule,
  state,
} from '@proto-kit/module'
import { StateMap, assert } from '@proto-kit/protocol'
import { Bool, Field, PublicKey, Struct, UInt32, UInt64 } from 'o1js'

export const ERRORS = {
  noPermission: () => 'No permission',
  unknownCollection: () => 'Unknown collection',
  nonexistentToken: () => 'Nonexistent token',
  alreadyExists: () => 'Already exists',
  senderNotFrom: () => "Sender does not match 'from'",
  maxSupplyReached: () => 'Max supply reached',
  burned: () => 'Token has been burned',
}

export class CollectionId extends UInt32 {}
export class InstanceId extends UInt32 {
}

export class ItemId extends Struct({
  collection: CollectionId, // prob use UInt32 too
  id: InstanceId,
}) {
  public static from(collection: CollectionId, id: InstanceId): ItemId {
    return new ItemId({ collection, id })
  }
}

export class Item extends Struct({
  owner: PublicKey,
  metadata: Field, // ipfs hash
  locked: Bool,
}) {}

export class Collection extends Struct({
  creator: PublicKey,
  owner: PublicKey,
  metadata: Field,
  amount: UInt32,
}) {}

export type INonFungible = {
  items: StateMap<ItemId, Item>
  collections: StateMap<CollectionId, Collection>
  transfer: (
    ItemId: ItemId,
    from: PublicKey,
    to: PublicKey,
  ) => void
  burn: (ItemId: ItemId, address: PublicKey) => void
}

@runtimeModule()
export class NonFungibles<Config = unknown> extends RuntimeModule<Config>
  implements INonFungible {
  @state()
  public items = StateMap.from<ItemId, Item>(ItemId, Item)
  @state()
  public collections = StateMap.from<CollectionId, Collection>(
    CollectionId,
    Collection,
  )

  // public getBalance(ItemId: ItemId, address: PublicKey): Item {
  //   const key = new BalancesKey({ ItemId, address });
  //   const balanceOption = this.items.get(key);
  //   const balance = Balance.from(balanceOption.value.value);
  //   return balance;
  // }

  public getCollection(collectionId: CollectionId): Collection {
    const maybeCollection = this.collections.get(collectionId)
    assert(maybeCollection.isSome, ERRORS.unknownCollection())

    return maybeCollection.value
  }

  public getItem(ItemId: ItemId): Item {
    const maybeItem = this.items.get(ItemId)
    assert(maybeItem.isSome, ERRORS.nonexistentToken())
    return maybeItem.value
  }

  public getItemByCollectionAndId(collectionId: CollectionId, itemId: InstanceId): Item {
    const key = ItemId.from(collectionId, itemId);
    return this.getItem(key);
  }

  public ownerOf(ItemId: ItemId): PublicKey {
    const item = this.getItem(ItemId)
    // assert(item.owner.isEmpty().equals(false), ERRORS.burned())
    return item.owner
  }

  public createCollection(
    origin: PublicKey,
    admin: PublicKey,
    id: CollectionId,
  ) {
    // const minter = this.transaction.sender.value;

    this.collections.set(
      id,
      new Collection({
        creator: origin,
        owner: admin,
        metadata: Field.from(''),
        amount: UInt32.from(0),
      }),
    )
  }

  public transfer(
    ItemId: ItemId,
    from: PublicKey,
    to: PublicKey,
  ) {
    const item = this.getItem(ItemId);
    assert(item.owner.equals(from), ERRORS.noPermission())
    assert((to.equals(from)).equals(Bool(false)), ERRORS.noPermission())
    
    this.items.set(
      ItemId,
      new Item({ ...item, owner: to }),
    )
  }

  public mint(ItemId: ItemId, from: PublicKey, to: PublicKey) {
    // const balance = this.getBalance(ItemId, address);
    // const newBalance = balance.add(amount);
    // this.setBalance(ItemId, address, newBalance);
    this.items.set(
      ItemId,
      new Item({ owner: to, metadata: Field.from(''), locked: Bool(false) }),
    )
  }

  public setMetadata(ItemId: ItemId, metadata: Field) {
    const item = this.getItem(ItemId)
    this.items.set(ItemId, new Item({ ...item, metadata }))
  }

  public lock(ItemId: ItemId) {
    const item = this.getItem(ItemId)
    this.items.set(ItemId, new Item({ ...item, locked: Bool(true) }))
  }

  public burn(ItemId: ItemId) {
    this.getItem(ItemId);

    this.items.set(
      ItemId,
      new Item({
        owner: PublicKey.empty(),
        metadata: Field.from(''),
        locked: Bool(false),
      }),
    )
  }

  // public requireExis
  @runtimeMethod()
  public mintSigned(
    ItemId: ItemId,
    to: PublicKey,
  ) {
    const minter = this.transaction.sender.value
    this.mint(ItemId, minter, to)
  }

  @runtimeMethod()
  public transferSigned(
    ItemId: ItemId,
    from: PublicKey,
    to: PublicKey,
  ) {
    assert(this.transaction.sender.value.equals(from), ERRORS.senderNotFrom())

    this.transfer(ItemId, from, to)
  }

  @runtimeMethod()
  public createCollectionSigned(
    admin: PublicKey,
    id: CollectionId,
  ) {
    const minter = this.transaction.sender.value
    this.createCollection(minter, admin, id)
  }
}
