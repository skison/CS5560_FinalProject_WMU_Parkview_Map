import Vertex from '../models/vertex';
import Edge from '../models/edge';

import BaseCtrl from './base';

export default class MapCtrl extends BaseCtrl {
	model = null; //this ctrl actually has 2 models
	
	vertexModel = Vertex;
	edgeModel = Edge;
  
  
	getAllEdges = (req, res) => {
		console.log("returning all edges");
		this.edgeModel.find({}, (err, docs) => {
			if (err) { return console.error(err); }
			//console.log(docs);
			res.status(200).json(docs);
		});
	}
  
	getAllVertices = (req, res) => {
		console.log("returning all vertices");
		this.vertexModel.find({}, (err, docs) => {
			if (err) { return console.error(err); }
			//console.log(docs);
			res.status(200).json(docs);
		});
	}
  
  
  
  
  /*Override default functions to do nothing*/
 // Get all
	getAll = (req, res) => {
	}
	// Count all
	count = (req, res) => {
	}
	// Insert
	insert = (req, res) => {
	}
	// Get by id
	get = (req, res) => {
	}
	// Update by id
	update = (req, res) => {
	}
	// Delete by id
	delete = (req, res) => {
	}

}