/** Categories of products sold by the store. */
export enum ItemCategory {
  CAKE = 'CAKE',
  BOOK = 'BOOK',
  TOY = 'TOY',
}

/** Common contract shared by every product model. */
export interface Item {
  getCategory(): ItemCategory;
  getId(): string;
  getPrice(): number;
  getQuantity(): number;
}
