import Credentials from '../models/credentials';
import BaseCtrl from './base';

export default class CredentialsCtrl extends BaseCtrl {
  model = Credentials;
  
 // Get all credentials for a user
  getAll = (req, res) => {
	  console.log("returning credentials from owner:");
	  console.log(req.body.owner);
    this.model.find({"owner": req.body.owner}, (err, docs) => {
      if (err) { return console.error(err); }
      res.status(200).json(docs);
    });
  }

  // Count all credentials for a user
  count = (req, res) => {
	  console.log("counting credentials from owner:");
	  console.log(req.body.owner);
    this.model.count({"owner": req.body.owner}, (err, count) => {
      if (err) { return console.error(err); }
      res.status(200).json(count);
    });
  }

  // Insert credentials from a user
  insert = (req, res) => {
	console.log("inserting credentials:");
	console.log(req.body);
	  
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

}