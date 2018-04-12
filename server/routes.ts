import * as express from 'express';

//For map
import MapCtrl from './controllers/map';


export default function setRoutes(app) {

  const router = express.Router();

  const mapCtrl = new MapCtrl();
  
  // Map
  router.route('/getvertices').post(mapCtrl.getAllVertices);
  router.route('/getedges').post(mapCtrl.getAllEdges);
  router.route('/getmapimages').post(mapCtrl.getAllMapImages);

  router.route('/getpath').get(mapCtrl.getPath);

  // Apply the routes to our application with the prefix /api
  app.use('/api', router);

}
