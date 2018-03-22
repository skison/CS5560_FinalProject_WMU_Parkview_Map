import * as mongoose from 'mongoose';

const vertexSchema = new mongoose.Schema({
	id: { type: Number, unique: true, dropDups: true },
	xPos: Number,
	yPos: Number,
	floor: Number
}, { collection: 'vertices' });

const Vertex = mongoose.model('Vertex', vertexSchema);

export default Vertex;
