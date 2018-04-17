import * as mongoose from 'mongoose';

const mapImageSchema = new mongoose.Schema({
	name: String,
	topLeftX: Number,
	topLeftY: Number,
	topRightX: Number,
	topRightY: Number,
	bottomRightX: Number,
	bottomRightY: Number,
	floor: Number
}, { collection: 'mapImages' });

const MapImage = mongoose.model('MapImage', mapImageSchema);

export default MapImage;
