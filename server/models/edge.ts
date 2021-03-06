import * as mongoose from 'mongoose';

const edgeSchema = new mongoose.Schema({
  node1: Number,
  node2: Number,
  traveltype: String
});

const Edge = mongoose.model('Edge', edgeSchema);

export default Edge;