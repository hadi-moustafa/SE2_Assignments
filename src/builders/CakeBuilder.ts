import { Cake } from '../models/Cake';
import {
  assertRequiredFields,
  requireNonEmptyString,
  requirePositiveInteger,
  requirePositiveNumber,
  requireString,
} from './validation';

/**
 * Step-by-step builder for {@link Cake}.
 *
 * Every setter validates its value immediately and returns the builder so calls can be chained.
 * `build()` fails if any required field was never set.
 * Optional fields: customMessage (default ''), allergies (default 'None'),
 * specialIngredients (default 'None').
 */
export class CakeBuilder {
  private id?: string;
  private type?: string;
  private flavor?: string;
  private filling?: string;
  private size?: number;
  private layers?: number;
  private frostingType?: string;
  private frostingFlavor?: string;
  private decorationType?: string;
  private decorationColor?: string;
  private customMessage = '';
  private shape?: string;
  private allergies = 'None';
  private specialIngredients = 'None';
  private packagingType?: string;
  private price?: number;
  private quantity?: number;

  static newBuilder(): CakeBuilder {
    return new CakeBuilder();
  }

  setId(id: string): this {
    this.id = requireNonEmptyString('id', id);
    return this;
  }

  setType(type: string): this {
    this.type = requireNonEmptyString('type', type);
    return this;
  }

  setFlavor(flavor: string): this {
    this.flavor = requireNonEmptyString('flavor', flavor);
    return this;
  }

  setFilling(filling: string): this {
    this.filling = requireNonEmptyString('filling', filling);
    return this;
  }

  /** Size in centimetres; must be greater than 0. */
  setSize(size: number): this {
    this.size = requirePositiveNumber('size', size);
    return this;
  }

  /** Number of layers; must be a whole number greater than 0. */
  setLayers(layers: number): this {
    this.layers = requirePositiveInteger('layers', layers);
    return this;
  }

  setFrostingType(frostingType: string): this {
    this.frostingType = requireNonEmptyString('frostingType', frostingType);
    return this;
  }

  setFrostingFlavor(frostingFlavor: string): this {
    this.frostingFlavor = requireNonEmptyString('frostingFlavor', frostingFlavor);
    return this;
  }

  setDecorationType(decorationType: string): this {
    this.decorationType = requireNonEmptyString('decorationType', decorationType);
    return this;
  }

  setDecorationColor(decorationColor: string): this {
    this.decorationColor = requireNonEmptyString('decorationColor', decorationColor);
    return this;
  }

  /** Optional. An empty string means no message. */
  setCustomMessage(customMessage: string): this {
    this.customMessage = requireString('customMessage', customMessage);
    return this;
  }

  setShape(shape: string): this {
    this.shape = requireNonEmptyString('shape', shape);
    return this;
  }

  /** Optional. Defaults to 'None'. */
  setAllergies(allergies: string): this {
    this.allergies = requireNonEmptyString('allergies', allergies);
    return this;
  }

  /** Optional. Defaults to 'None'. */
  setSpecialIngredients(specialIngredients: string): this {
    this.specialIngredients = requireNonEmptyString('specialIngredients', specialIngredients);
    return this;
  }

  setPackagingType(packagingType: string): this {
    this.packagingType = requireNonEmptyString('packagingType', packagingType);
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

  build(): Cake {
    assertRequiredFields('Cake', {
      id: this.id,
      type: this.type,
      flavor: this.flavor,
      filling: this.filling,
      size: this.size,
      layers: this.layers,
      frostingType: this.frostingType,
      frostingFlavor: this.frostingFlavor,
      decorationType: this.decorationType,
      decorationColor: this.decorationColor,
      shape: this.shape,
      packagingType: this.packagingType,
      price: this.price,
      quantity: this.quantity,
    });
    return new Cake(
      this.id!,
      this.type!,
      this.flavor!,
      this.filling!,
      this.size!,
      this.layers!,
      this.frostingType!,
      this.frostingFlavor!,
      this.decorationType!,
      this.decorationColor!,
      this.customMessage,
      this.shape!,
      this.allergies,
      this.specialIngredients,
      this.packagingType!,
      this.price!,
      this.quantity!,
    );
  }
}
