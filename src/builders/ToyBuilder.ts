import { Toy } from '../models/Toy';
import {
  assertRequiredFields,
  requireBoolean,
  requireNonEmptyString,
  requirePositiveInteger,
  requirePositiveNumber,
} from './validation';

/**
 * Step-by-step builder for {@link Toy}.
 *
 * Every setter validates its value immediately and returns the builder so calls can be chained.
 * `build()` fails if any required field was never set. All fields are required.
 */
export class ToyBuilder {
  private id?: string;
  private type?: string;
  private ageGroup?: string;
  private brand?: string;
  private material?: string;
  private batteryRequired?: boolean;
  private educational?: boolean;
  private price?: number;
  private quantity?: number;

  static newBuilder(): ToyBuilder {
    return new ToyBuilder();
  }

  setId(id: string): this {
    this.id = requireNonEmptyString('id', id);
    return this;
  }

  setType(type: string): this {
    this.type = requireNonEmptyString('type', type);
    return this;
  }

  /** e.g. '0-3', '4-7', '8-12', '13+'. */
  setAgeGroup(ageGroup: string): this {
    this.ageGroup = requireNonEmptyString('ageGroup', ageGroup);
    return this;
  }

  setBrand(brand: string): this {
    this.brand = requireNonEmptyString('brand', brand);
    return this;
  }

  setMaterial(material: string): this {
    this.material = requireNonEmptyString('material', material);
    return this;
  }

  /** Whether the toy needs batteries to work. */
  setBatteryRequired(batteryRequired: boolean): this {
    this.batteryRequired = requireBoolean('batteryRequired', batteryRequired);
    return this;
  }

  /** Whether the toy is educational. */
  setEducational(educational: boolean): this {
    this.educational = requireBoolean('educational', educational);
    return this;
  }

  /** Must be greater than 0. */
  setPrice(price: number): this {
    this.price = requirePositiveNumber('price', price);
    return this;
  }

  /** Must be a whole number greater than 0. */
  setQuantity(quantity: number): this {
    this.quantity = requirePositiveInteger('quantity', quantity);
    return this;
  }

  build(): Toy {
    assertRequiredFields('Toy', {
      id: this.id,
      type: this.type,
      ageGroup: this.ageGroup,
      brand: this.brand,
      material: this.material,
      batteryRequired: this.batteryRequired,
      educational: this.educational,
      price: this.price,
      quantity: this.quantity,
    });
    return new Toy(
      this.id!,
      this.type!,
      this.ageGroup!,
      this.brand!,
      this.material!,
      this.batteryRequired!,
      this.educational!,
      this.price!,
      this.quantity!,
    );
  }
}
