import Cat from '../models/cat';
import BaseCtrl from './base';

export default class CatCtrl extends BaseCtrl {
  model = Cat;
  
  // Get all, specify username
  getAll = (req, res) => {
	  console.log("returning cats from user:");
	  console.log(req.body.user);
    this.model.find({"user": req.body.user}, (err, docs) => {
      if (err) { return console.error(err); }
      res.status(200).json(docs);
    });
  }
}
