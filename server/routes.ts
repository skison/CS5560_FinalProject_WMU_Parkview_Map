import * as express from 'express';

import CatCtrl from './controllers/cat';
import UserCtrl from './controllers/user';

//For credentials
import CredentialsCtrl from './controllers/credentials';

//For map
import MapCtrl from './controllers/map';

//For domains
import DomainCtrl from './controllers/domain';

import Cat from './models/cat';
import User from './models/user';

export default function setRoutes(app) {

  const router = express.Router();

  const catCtrl = new CatCtrl();
  const userCtrl = new UserCtrl();
  const credentialsCtrl = new CredentialsCtrl();
  const mapCtrl = new MapCtrl();
  const domainCtrl = new DomainCtrl();

  // Cats -- Unused
  router.route('/cats').post(catCtrl.getAll);
  router.route('/cats/count').post(catCtrl.count);
  router.route('/cat').post(catCtrl.insert);
  router.route('/cat/:id').get(catCtrl.get);
  router.route('/cat/:id').put(catCtrl.update);
  router.route('/cat/:id').delete(catCtrl.delete);

  // Users
  router.route('/login').post(userCtrl.login);
  router.route('/users').get(userCtrl.getAll);
  router.route('/users/count').get(userCtrl.count);
  router.route('/user').post(userCtrl.insert);
  router.route('/user/:id').get(userCtrl.get);
  router.route('/user/:id').put(userCtrl.update);
  router.route('/user/:id').delete(userCtrl.delete);
  
  // Credentials
  router.route('/credentials').post(credentialsCtrl.getAll);
  router.route('/credentials/count').post(credentialsCtrl.count);
  router.route('/credentials/insert').post(credentialsCtrl.insert);
  router.route('/credentials/get/:id').get(credentialsCtrl.get);
  router.route('/credentials/update/:id').put(credentialsCtrl.update);
  router.route('/credentials/delete/:id').delete(credentialsCtrl.delete);
  
  // Domains
  router.route('/domains').post(domainCtrl.getAll);
  router.route('/domains/count').post(domainCtrl.count);
  router.route('/domains/insert').post(domainCtrl.insert);
  router.route('/domains/get/:id').get(domainCtrl.get);
  router.route('/domains/delete/:id').delete(domainCtrl.delete);
  
  // Map
  router.route('/getvertices').post(mapCtrl.getAllVertices);
  router.route('/getedges').post(mapCtrl.getAllEdges);
  router.route('/getpath').get(mapCtrl.getPath);

  // Apply the routes to our application with the prefix /api
  app.use('/api', router);

}
