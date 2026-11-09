import { Item, ItemCategory } from './Item';

/** A cake order, as described by a row of `cake orders.csv`. */
export class Cake implements Item {
  constructor(
    private readonly id: string,
    private readonly type: string,
    private readonly flavor: string,
    private readonly filling: string,
    private readonly size: number,
    private readonly layers: number,
    private readonly frostingType: string,
    private readonly frostingFlavor: string,
    private readonly decorationType: string,
    private readonly decorationColor: string,
    private readonly customMessage: string,
    private readonly shape: string,
    private readonly allergies: string,
    private readonly specialIngredients: string,
    private readonly packagingType: string,
    private readonly price: number,
    private readonly quantity: number,
  ) {}

  getCategory(): ItemCategory {
    return ItemCategory.CAKE;
  }

  getId(): string {
    return this.id;
  }

  getType(): string {
    return this.type;
  }

  getFlavor(): string {
    return this.flavor;
  }

  getFilling(): string {
    return this.filling;
  }

  getSize(): number {
    return this.size;
  }

  getLayers(): number {
    return this.layers;
  }

  getFrostingType(): string {
    return this.frostingType;
  }

  getFrostingFlavor(): string {
    return this.frostingFlavor;
  }

  getDecorationType(): string {
    return this.decorationType;
  }

  getDecorationColor(): string {
    return this.decorationColor;
  }

  getCustomMessage(): string {
    return this.customMessage;
  }

  getShape(): string {
    return this.shape;
  }

  getAllergies(): string {
    return this.allergies;
  }

  getSpecialIngredients(): string {
    return this.specialIngredients;
  }

  getPackagingType(): string {
    return this.packagingType;
  }

  getPrice(): number {
    return this.price;
  }

  getQuantity(): number {
    return this.quantity;
  }
}
