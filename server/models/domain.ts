import * as mongoose from 'mongoose';

const domainSchema = new mongoose.Schema({
  domaininput: String,
  owner: String
});

const Domain = mongoose.model('Domain', domainSchema);

export default Domain;
