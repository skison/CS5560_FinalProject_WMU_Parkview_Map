import * as mongoose from 'mongoose';

const credentialsSchema = new mongoose.Schema({
  creddomain: String,
  credusername: String,
  credpassword: String,
  owner: String
});

const Credentials = mongoose.model('Credentials', credentialsSchema);

export default Credentials;
