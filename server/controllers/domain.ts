import Domain from '../models/domain';
import BaseCtrl from './base';

import Credentials from '../models/credentials';

export default class DomainCtrl extends BaseCtrl {
  model = Domain;
  
  credModel = Credentials;
  
 // Get all domains for a user
  getAll = (req, res) => {
	  console.log("returning domains from owner:");
	  console.log(req.body.owner);
    this.model.find({"owner": req.body.owner}, (err, docs) => {
      if (err) { return console.error(err); }
      res.status(200).json(docs);
    });
  }

  // Count all domains for a user
  count = (req, res) => {
	  console.log("counting domains from owner:");
	  console.log(req.body.owner);
    this.model.count({"owner": req.body.owner}, (err, count) => {
      if (err) { return console.error(err); }
      res.status(200).json(count);
    });
  }

  // Insert domain from a user
  insert = (req, res) => {
	console.log("inserting domain:");
	console.log(req.body);
	
	//Check to see if this domain/owner combo already exists
	this.model.find({"owner": req.body.owner, "domaininput": req.body.domaininput}, (err, docs) => {
      if (err) { return console.error(err); }
	  if(docs.length > 0){res.sendStatus(400); return console.error(new Error("Domain Already Exists!"));}
	  
      else{
		  const obj = new this.model(req.body);
		obj.save((err, item) => {
		  // 11000 is the code for duplicate key error
		  if (err && err.code === 11000) {
			res.sendStatus(400);
		  }
		  if (err) {
			return console.error(err);
		  }
		  res.status(200).json(item);
		});
	  }
	  
    });
	  
    
  }
  
  // Get by id
  get = (req, res) => {
	console.log("retrieving domain:");
	console.log(req.body);
    this.model.findOne({ _id: req.params.id }, (err, item) => {
      if (err) { return console.error(err); }
      res.status(200).json(item);
    });
  }

  // Delete by id
  delete = (req, res) => {
	console.log("deleting domain:");
	console.log(req.query);
    this.model.findOneAndRemove({ _id: req.params.id }, (err) => {
      if (err) { return console.error(err); }
	  
	  //Also remove all credentials with the same owner and creddomain
	  this.credModel.remove({owner: req.query.owner, creddomain: req.query.creddomain}, (err) => {
		    if (err) { return console.error(err); }
			res.sendStatus(200);
	  });
	  
    });
  }

}