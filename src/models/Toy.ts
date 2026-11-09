import { Item, ItemCategory } from './Item';

/** A toy order, as described by a `<row>` of `toy orders.xml`. */
export class Toy implements Item {
  constructor(
    private readonly id: string,
    private readonly type: string,
    private readonly ageGroup: string,
    private readonly brand: string,
    private readonly material: string,
    private readonly batteryRequired: boolean,
    private readonly educational: boolean,
    private readonly price: number,
    private readonly quantity: number,
  ) {}

  getCategory(): ItemCategory {
    return ItemCategory.TOY;
  }

  getId(): string {
    return this.id;
  }

  getType(): string {
    return this.type;
  }

  getAgeGroup(): string {
    return this.ageGroup;
  }

  getBrand(): string {
    return this.brand;
  }

  getMaterial(): string {
    return this.material;
  }

  isBatteryRequired(): boolean {
    return this.batteryRequired;
  }

  isEducational(): boolean {
    return this.educational;
  }

  getPrice(): number {
    return this.price;
  }

  getQuantity(): number {
    return this.quantity;
  }
}
