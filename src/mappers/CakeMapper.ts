import { CakeBuilder } from '../builders/CakeBuilder';
import { Cake } from '../models/Cake';
import { RecordMapper } from './Mapper';
import { RecordReader, setIfPresent } from './RecordReader';

/** Maps a raw cake record (e.g. a row of `cake orders.csv`) to a {@link Cake}. */
export class CakeMapper extends RecordMapper<Cake> {
  protected readonly modelName = 'Cake';

  protected buildFrom(r: RecordReader): Cake {
    const b = CakeBuilder.newBuilder();
    setIfPresent(r.readText('id', 'Order ID'), (v) => b.setId(v));
    setIfPresent(r.readText('Type'), (v) => b.setType(v));
    setIfPresent(r.readText('Flavor'), (v) => b.setFlavor(v));
    setIfPresent(r.readText('Filling'), (v) => b.setFilling(v));
    setIfPresent(r.readNumber('Size'), (v) => b.setSize(v));
    setIfPresent(r.readNumber('Layers'), (v) => b.setLayers(v));
    setIfPresent(r.readText('Frosting Type'), (v) => b.setFrostingType(v));
    setIfPresent(r.readText('Frosting Flavor'), (v) => b.setFrostingFlavor(v));
    setIfPresent(r.readText('Decoration Type'), (v) => b.setDecorationType(v));
    setIfPresent(r.readText('Decoration Color'), (v) => b.setDecorationColor(v));
    setIfPresent(r.readText('Custom Message'), (v) => b.setCustomMessage(v));
    setIfPresent(r.readText('Shape'), (v) => b.setShape(v));
    setIfPresent(r.readOptionalText('Allergies'), (v) => b.setAllergies(v));
    setIfPresent(r.readOptionalText('Special Ingredients'), (v) => b.setSpecialIngredients(v));
    setIfPresent(r.readText('Packaging Type'), (v) => b.setPackagingType(v));
    setIfPresent(r.readNumber('Price'), (v) => b.setPrice(v));
    setIfPresent(r.readNumber('Quantity'), (v) => b.setQuantity(v));
    return b.build();
  }
}
