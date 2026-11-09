import { ToyBuilder } from '../builders/ToyBuilder';
import { Toy } from '../models/Toy';
import { RecordMapper } from './Mapper';
import { RecordReader, setIfPresent } from './RecordReader';

/** Maps a raw toy record (e.g. a `<row>` of `toy orders.xml`) to a {@link Toy}. */
export class ToyMapper extends RecordMapper<Toy> {
  protected readonly modelName = 'Toy';

  protected buildFrom(r: RecordReader): Toy {
    const b = ToyBuilder.newBuilder();
    setIfPresent(r.readText('Order ID', 'id'), (v) => b.setId(v));
    setIfPresent(r.readText('Type'), (v) => b.setType(v));
    setIfPresent(r.readText('Age Group'), (v) => b.setAgeGroup(v));
    setIfPresent(r.readText('Brand'), (v) => b.setBrand(v));
    setIfPresent(r.readText('Material'), (v) => b.setMaterial(v));
    setIfPresent(r.readBoolean('Battery Required'), (v) => b.setBatteryRequired(v));
    setIfPresent(r.readBoolean('Educational'), (v) => b.setEducational(v));
    setIfPresent(r.readNumber('Price'), (v) => b.setPrice(v));
    setIfPresent(r.readNumber('Quantity'), (v) => b.setQuantity(v));
    return b.build();
  }
}
