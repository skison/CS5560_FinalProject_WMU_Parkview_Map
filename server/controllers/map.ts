import MapEdge from '../../shared/models/mapedge';
import MapVertex from '../../shared/models/mapvertex';
import DijkstraMapVertex from '../../shared/models/dijkstramapvertex';

import Vertex from '../models/vertex';
import Edge from '../models/edge';
import MapImage from '../models/mapImage';

export default class MapCtrl {
	vertexModel = Vertex;
	edgeModel = Edge;  
	mapImageModel = MapImage;
  
	/*Return all the edges in the DB*/
	getAllEdges = (req, res) => {
		console.log("returning all edges");
		this.edgeModel.find({}, (err, docs) => {
			if (err) { return console.error(err); }
			//console.log(docs);
			res.status(200).json(docs);
		});
	}
  
	/*Return all the vertices in the DB*/
	getAllVertices = (req, res) => {
		console.log("returning all vertices");
		this.vertexModel.find({}, (err, docs) => {
			if (err) { return console.error(err); }
			//console.log(docs);
			res.status(200).json(docs);
		});
	}

	/*Return all the mapImages in the DB*/
	getAllMapImages = (req, res) => {
		console.log("returning all mapImages");
		this.mapImageModel.find({}, (err, docs) => {
			if (err) { return console.error(err); }
			res.status(200).json(docs);
		});
	}
	
	/*return the path from start point to end point. NOTE: mongodb constraints must prevent incorrect edges(where a nodeid doesn't exist)!*/
	getPath = (req, res) => {
		console.log("calculating path");
		
		//grab the start & end ID
		var startID = req.query.startID;
		var endID = req.query.endID;
		//console.log(startID);
		//console.log(endID);
		
		//make sure request syntax is valid
		if(startID == null || endID == null || startID == '' || endID == '')
		{
			console.log("invalid request from client!");
			res.status(400).send('<p>Invalid request! Pathfinding requests should follow this syntax:</p><p>/getpath?startID=1&endID=2</p>');//send status 400 (invalid request)
			return; //exit without continuing
		}
		
		//initialize vertices and edges arrays
		var newVertices: MapVertex[] = []; //store all random vertices from the DB
		var newEdges: MapEdge[] = []; //store all random edges from the DB
		
		//initialize empty edge/vertex arrays for quick reference to sorted MapVertices and Edges
		var mapVertices: DijkstraMapVertex[] = []; //store DijkstraMapVertex versions of all vertices; indexed by vertex id
		var DijkstraMapVertexEdges: MapEdge[][] = []; //store references to all edges for each associated vertex w/first dimension indexed by vertex id
		
		//initialize empty array to keep track of the final path calculated by dijkstra's algorithm
		var dijkstraPathVertices: DijkstraMapVertex[] = [];
		
		//initialize 2 DijkstraMapVertex objects to keep track of the start point and end point
		var startVertex: DijkstraMapVertex;
		var endVertex: DijkstraMapVertex;
		
		//initialize counter to 0; will increment when the vertices have been found and when the edges have been found
		var finishedCount = 0;
		
		
		
		//get all vertices of the map
		this.vertexModel.find({}, (err, docs) => {
			if (err) { return console.error(err); }
			//console.log(docs);
			newVertices = <MapVertex[]>docs;
			finishedCount++;
			if(finishedCount == 2){setupDijkstra();}
		});
		
		
		
		//get all edges of the map
		this.edgeModel.find({}, (err, docs) => {
			if (err) { return console.error(err); }
			//console.log(docs);
			newEdges = <MapEdge[]>docs;
			finishedCount++;
			if(finishedCount == 2){setupDijkstra();}
		});
		
		
		
		//Function that returns the calculated distance for an edge using X and Y positions
		function getEdgeDistance(newEdge: MapEdge){
			var firstNode = mapVertices[newEdge.node1];
			var secondNode = mapVertices[newEdge.node2];
			return Math.sqrt((secondNode.getXPos() - firstNode.getXPos())**2 + (secondNode.getYPos() - firstNode.getYPos())**2);
		}
		
		
		
		//build the mapVertices and DijkstraMapVertexEdges arrays, and initialize anything needed for dijkstra's algorithm. Then, start it.
		function setupDijkstra(){
			var foundStartID: boolean = false; //set to true if/when the startID is found in the array
			var foundEndID: boolean = false; //set to true if/when the endID is found in the array
			
			//push new MapVertices to sorted array (index = vertex id). Also used to make sure start & end IDs actually exist, to prevent erros
			newVertices.forEach(function(vertex){ 
				//console.log("newVertices loop");
				var newDijkstraMapVertex: DijkstraMapVertex = new DijkstraMapVertex(vertex);
				mapVertices[vertex.id] = newDijkstraMapVertex;
				if(vertex.id == startID){foundStartID = true; startVertex = newDijkstraMapVertex;}
				else if(vertex.id == endID){foundEndID = true; endVertex = newDijkstraMapVertex;} //this 'else if' also prevents duplicate start & end IDs.
			});
			
			//if either of the IDs weren't found
			if(!foundStartID || !foundEndID)
			{
				console.log("invalid request from client!");
				res.status(400).send('<p>Invalid request! startID and endID must both exist in the database and must not be identical!</p>');//send status 400 (invalid request)
				return; //exit without continuing
			}
		
			//push edges to the DijkstraMapVertexEdges 2d array for quick reference
			newEdges.forEach(function(edge){ 
				//console.log("newEdges loop");
				//initialize subarrays if they don't already exist
				if(DijkstraMapVertexEdges[edge.node1] == null){DijkstraMapVertexEdges[edge.node1] = [];}
				if(DijkstraMapVertexEdges[edge.node2] == null){DijkstraMapVertexEdges[edge.node2] = [];}
				
				DijkstraMapVertexEdges[edge.node1].push(edge); //add this edge reference to node1's pool
				DijkstraMapVertexEdges[edge.node2].push(edge); //add this edge reference to node2's pool
			});
			
			//set the startVertex's totalDistance to 0
			startVertex.setTotalDistance(0);
			
			//finally run dijkstra's algorithm
			runDijkstra();
		}
		
		
		
		/*Called after variables have been initialized. Runs a while loop that stops once the fastest path has been found, if any*/
		function runDijkstra(){
			var curVertex = startVertex; //current vertex being checked
			var newVertex: boolean = true; //boolean set to true IF there is a new vertex to explore, continuing the loop
			
			while(!endVertex.getMinDistanceFound() && newVertex)//loop until shortest distance found or all paths explored
			{
				//console.log("Exploring " + newVertex);
				//console.log(DijkstraMapVertexEdges[curVertex.getID()]);
				curVertex.setMinDistanceFound(true);//since we are exploring this node, we will not need to consider it in future checks
				//First, explore all this vertex's edges
				DijkstraMapVertexEdges[curVertex.getID()].forEach((edge) =>{ //go through all this vertex's edges
					//console.log("exploring edge")
					var curTotalDistance = curVertex.getTotalDistance() + getEdgeDistance(edge); //total distance to the end of this edge
					var otherVertex: DijkstraMapVertex;//the vertex at the other end of the edge
					if(edge.node1 == curVertex.getID()){otherVertex = mapVertices[edge.node2]} //set otherVertex to node2 if curVertex is node1
					else if(edge.node2 == curVertex.getID()){otherVertex = mapVertices[edge.node1]} //set otherVertex to node1 if curVertex is node2
					
					if(curTotalDistance < otherVertex.getTotalDistance())//new, smaller value for node
					{
						otherVertex.setTotalDistance(curTotalDistance); //set new, smaller distance
						otherVertex.setParentID(curVertex.getID()); //set parent node
					}
				});
				
				//Now find the node with the lowest total distance that doesn't already have minDistanceFound set!
				newVertex = false; //reset boolean for loop
				var lowestVal = Infinity; //used to find the lowest remaining value
				mapVertices.forEach((vertex) =>{
					if(!vertex.getMinDistanceFound() && vertex.getTotalDistance() < lowestVal) //validity check
					{
						newVertex = true; //there is a new vertex to explore
						curVertex = vertex; //the next vertex that will be explored
						lowestVal = vertex.getTotalDistance(); //set the new lowest distance
					}
				}); 
			}
			
			//Now finish up
			finishDijkstra();
		}
		
		
		
		//called once dijkstra's algorithm has completed
		function finishDijkstra(){
			//console.log("Final Path found!");
			//var parent = this; //store reference to variables from this object
			/*push vertices and edges to path arrays*/
			var curNode = endVertex;
			var newCurNode = null;
			
			while(curNode.getID() != startVertex.getID())//while there are more nodes in the path
			{
				dijkstraPathVertices.push(curNode);//push current node to the path
				
				DijkstraMapVertexEdges[curNode.getID()].forEach((edge) =>{//check every edge associated with this node
					if(edge.node1 == curNode.getParentID()){ //if this edge's first node is the current node's parent
						newCurNode = mapVertices[edge.node1]; //set it as the next node to check
					}
					else if(edge.node2 == curNode.getParentID()){ //if this edge's second node is the current node's parent
						newCurNode = mapVertices[edge.node2]; //set it as the next node to check
					}
				});
				
				//console.log(newCurNode);
				curNode = newCurNode;
			}
			
			//Push the final node to the path
			dijkstraPathVertices.push(curNode);
			
			//console.log("Final path:");
			//console.log(dijkstraPathVertices);
			
			console.log("found path from " + startVertex.getID() + " to " + endVertex.getID() + ", now returning");
			//Finally, return the data to the caller!
			res.status(200).json(dijkstraPathVertices);
		}
	}
}