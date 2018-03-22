import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

/*for observable canvas*/
import { Observable } from 'rxjs/Observable';

import 'rxjs/add/observable/fromEvent';
import 'rxjs/add/operator/takeUntil';
import 'rxjs/add/operator/pairwise';
import 'rxjs/add/operator/switchMap';

//added to show current user
import { AuthService } from '../services/auth.service';

import { MapService } from '../services/map.service';

import { ToastComponent } from '../shared/toast/toast.component';
import { Vertex } from '../shared/models/vertex.model';
import { Edge } from '../shared/models/edge.model';


@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit, AfterViewInit {
	
	@ViewChild('canvas') public canvas: ElementRef;
	
	private cx: CanvasRenderingContext2D; //handle for drawing to canvas
  
	//Actual vertices array and visual vertices array. They should always be stored in the same order for consistency
	vertices: Vertex[] = [];
	canvasVertices: CanvasVertex[] = [];
	
	//Actual edges array and visual edges array. They should always be stored in the same order for consistency
	edges: Edge[] = [];
	canvasEdges: CanvasEdge[] = [];
	
	/*Multidimensional array used for graph calculations (specifically dijkstra's algorithm)
	The first dimension stores the id of each node in ascending order, for quick access
	The second dimension stores references to every CanvasEdge object connected to the associated node, also for quick access*/
	dijkstraNodeEdges: DijkstraNodeEdge[][] = [];
	
	//These arrays store the final path taken to get from a start point to an end point
	dijkstraPathEdges: DijkstraNodeEdge[] = [];
	dijkstraPathVertices: CanvasVertex[] = [];
	
  
	isLoading = true;
	isEditing = false;
	
	gotMapVertices = false;
	gotMapEdges = false;
	hasCreatedMap = false;
	isViewInitialized = false;
	
	/*start and end points (IDs of vertices). Will be set to >0 when in use, or <=0 when unused*/
	startPoint = -1;
	endPoint = -1;
	  
	constructor(private mapService: MapService,
				private formBuilder: FormBuilder,
				public toast: ToastComponent) { }

				
	/*Triggers when component loads*/
	ngOnInit() {
		console.log("getting map data");
		this.getMapEdges();
		this.getMapVertices();
		this.isLoading = false;
	}
	/*Triggers once view has finished loading*/
	ngAfterViewInit() {
		
		const canvasEl: HTMLCanvasElement = this.canvas.nativeElement;
		console.log(this.canvas.nativeElement);
		
		/*default canvas size; could be made responsive by dynamically changing these on screen size*/
		canvasEl.width = 800;
		canvasEl.height = 450;
		
		this.cx = canvasEl.getContext('2d');
		
		this.captureEvents(canvasEl);
		this.isViewInitialized = true;
		this.drawMap(); //redundant attempt to draw map;
		
	}
	
	
	/*For mouse events*/
	private captureEvents(canvasEl: HTMLCanvasElement) {
		//For clicking nodes
		Observable
		.fromEvent(canvasEl, 'click')
		.subscribe((res: MouseEvent) => {
			const rect = canvasEl.getBoundingClientRect();
	  
			const newPos = {
				x: res.clientX - rect.left,
				y: res.clientY - rect.top
			};
			//console.log("MouseEvent at " + newPos.x + ", " + newPos.y + ";");
			
			//Look through vertices; check if any are clicked, and if so, render an acknowledgment
			this.checkForClick(newPos.x, newPos.y);
		});
		
		//For hovering over nodes
		Observable
		.fromEvent(canvasEl, 'mouseenter')
		.switchMap((e) => {
			return Observable
			.fromEvent(canvasEl, 'mousemove')
			.takeUntil(Observable.fromEvent(canvasEl, 'mouseleave'))
		})
		.subscribe((res: MouseEvent) => {
			const rect = canvasEl.getBoundingClientRect();
	  
			const newPos = {
				x: res.clientX - rect.left,
				y: res.clientY - rect.top
			};
			//console.log("MouseEvent at " + newPos.x + ", " + newPos.y + ";");
			
			//Look through vertices; check if any are hovered over, and if so, render an acknowledgment
			this.checkForHover(newPos.x, newPos.y);
		});
	}
	/*Check map points for click*/
	checkForClick(newX: number, newY: number)
	{
		var parent = this; //store reference to variables from this object
		
		this.canvasVertices.forEach(function (canvasVertex) {
			//console.log("Checking for click!");
			if(canvasVertex.isPointOver(newX, newY))//clicked on this node
			{
				if(!canvasVertex.getIsSelected())//not yet selected; so select
				{
					if(parent.startPoint < 1 && typeof canvasVertex.vertex.id === "number")
					{
						parent.startPoint = canvasVertex.vertex.id;//set this as start point
						
						//draw connecting edges as selectEdge
						/*parent.dijkstraNodeEdges[parent.startPoint].forEach(function (edge) {
							edge.selectEdge();
						});*/
						
						canvasVertex.drawSelectedStart();
						canvasVertex.setIsSelected(true);
						
						parent.toast.setMessage('Point ' + parent.startPoint + ' selected as starting point!', 'success');
						
						if(parent.endPoint > 0) //only run if possible
						{
							//finally run dijkstra's algorithm
							parent.dijkstra(canvasVertex, parent.canvasVertices[parent.canvasVertices.map(elem => elem.vertex.id).indexOf(parent.endPoint)]);
						}
					}
					else if(parent.endPoint < 1 && typeof canvasVertex.vertex.id === "number")
					{
						parent.endPoint = canvasVertex.vertex.id;//set this as end point
						
						//draw connecting edges as selectEdge
						/*parent.dijkstraNodeEdges[parent.endPoint].forEach(function (edge) {
							edge.selectEdge();
						});*/
						canvasVertex.drawSelectedEnd();
						canvasVertex.setIsSelected(true);
						parent.toast.setMessage('Point ' + parent.endPoint + ' selected as ending point- BEGINNING PATHFINDING!', 'success');
						
						if(parent.startPoint > 0) //only run if possible
						{
							//finally run dijkstra's algorithm
							parent.dijkstra(parent.canvasVertices[parent.canvasVertices.map(elem => elem.vertex.id).indexOf(parent.startPoint)], canvasVertex);
						}
					}
					else{}
				}
				else //already selected
				{
					if(parent.endPoint == canvasVertex.vertex.id)
					{
						//draw connecting edges as deselectEdge
						/*parent.dijkstraNodeEdges[parent.endPoint].forEach(function (edge) {
							edge.deselectEdge();
						});*/
						
						canvasVertex.drawNormal();
						canvasVertex.drawHovered();
						canvasVertex.setIsSelected(false);;
						parent.endPoint = -1;
						parent.toast.setMessage('Point ' + canvasVertex.vertex.id + ' deselected as ending point!', 'danger');
						
						if(parent.startPoint > 0){parent.undoDijkstra();}//only reset if necessary
						
					}
					else if(parent.startPoint == canvasVertex.vertex.id)
					{
						//draw connecting edges as deselectEdge
						/*parent.dijkstraNodeEdges[parent.startPoint].forEach(function (edge) {
							edge.deselectEdge();
						});*/
						
						canvasVertex.drawNormal();
						canvasVertex.drawHovered();
						canvasVertex.setIsSelected(false);
						parent.startPoint = -1;
						parent.toast.setMessage('Point ' + canvasVertex.vertex.id + ' deselected as starting point!', 'danger');
						
						if(parent.endPoint > 0){parent.undoDijkstra();}//only reset if necessary
					}
					else{}
				}
			}
		});
	}
	/*Check map points for hover*/
	checkForHover(newX: number, newY: number)
	{
		this.canvasVertices.forEach(function (canvasVertex) {
			//console.log("Checking for hover!");
			if(!canvasVertex.isSelected)//not yet selected
			{
				if(canvasVertex.isPointOver(newX, newY))
				{
					//console.log("Hovering!");
					//console.log(this.vertex.id);
					canvasVertex.drawHovered();
				}
				else
				{
					canvasVertex.drawNormal();
				}
			}
		});
	}
	
	
	//Redraw normal paths; remove the highlighted paths made by dijkstra's algorithm
	private undoDijkstra()
	{
		this.dijkstraPathEdges.forEach(function (dEdge) {
			dEdge.deselectEdge();
		});
	}
	//Run dijkstra's algorithm for pathfinding; this function initializes stuff before the actual algorithm runs in dijkstraLoop()
	dijkstra(newStartPoint: CanvasVertex, newEndPoint: CanvasVertex)
	{
		console.log("Starting pathfinding from " + newStartPoint.vertex.id + " to " + newEndPoint.vertex.id + ".");
		
		//start by initializing the node/edge data
		this.canvasVertices.forEach(function (canvasVertex) {
			//console.log("drawing vertex");
			canvasVertex.resetTotalDistance(); //reset all total distances to infinity
			canvasVertex.resetParentID(); //reset all parent Id's to non-valid numbers
			canvasVertex.resetMinDistanceFound(); //reset all total distances to infinity
		}); 
		/*empty path arrays*/
		this.dijkstraPathEdges = [];
		this.dijkstraPathVertices = [];
		/*this.dijkstraNodeEdges.forEach(function (dEdgeArray) {
			dEdgeArray.forEach(function (dEdge) {
				dEdge.resetMinDistanceFound(); //reset all total distances to infinity
			}); 
		}); */
		
		//set start point's total distance to 0
		newStartPoint.totalDistance = 0;
		
		//set "found path" boolean to false
		var foundPath = false;
		
		//start recursive dijkstra loop with start point's id as well as startpoint & endpoint
		this.dijkstraLoop(newStartPoint.vertex.id, newStartPoint, newEndPoint);
		
	}
	//Recursive loop that goes through all the edges associated with this vertex
	private dijkstraLoop(curID: number, startPoint: CanvasVertex, endPoint: CanvasVertex)
	{
		//var parent = this; //store reference to variables from this object
		//console.log("Dijkstra loop for " + curID);
		
		this.dijkstraNodeEdges[curID].forEach(function (dEdge){
			//console.log(curID + " => " + dEdge.getOtherVertexID(curID));
			//console.log(dEdge.getOtherVertexFromID(curID));
			
			var thisVertex = dEdge.getVertexFromID(curID);
			var otherVertex = dEdge.getOtherVertexFromID(curID);
			
			//console.log("Distances: " + thisVertex.getTotalDistance() + " + " + dEdge.getDistance() + " ? " + otherVertex.getTotalDistance());
			if((thisVertex.getTotalDistance() + dEdge.getDistance()) < otherVertex.getTotalDistance())//new, smaller value for node
			{
				otherVertex.setTotalDistance(thisVertex.getTotalDistance() + dEdge.getDistance()); //set new, smaller distance
				otherVertex.setParentID(curID); //set parent node
				//console.log("Smaller! New distance: " + otherVertex.getTotalDistance() + " from parent " + otherVertex.getParentID());
			}
		});
		
		//Now find the node with the lowest total distance that doesn't already have minDistanceFound set!
		var nextID = -1;
		var lowestVal = Infinity;
		this.canvasVertices.forEach(function (canvasVertex) {
			//canvasVertex.resetTotalDistance(); //reset all total distances to infinity
			if(!canvasVertex.getMinDistanceFound() && canvasVertex.getTotalDistance() < lowestVal) //validity check
			{
				nextID = canvasVertex.vertex.id;
				lowestVal = canvasVertex.getTotalDistance();
			}
		}); 
		
		/*The end of the path has been found!*/
		if(endPoint.getMinDistanceFound() || nextID <= 0)
		{
			//Check if the fastest path to the end was already discovered
			if(endPoint.getMinDistanceFound() || nextID <= 0)
			{
				console.log("Final Path found!");
				var parent = this; //store reference to variables from this object
				/*dijkstraPathEdges = [];
				dijkstraPathVertices = [];*/
				/*push vertices and edges to path arrays*/
				var curNode = endPoint;
				var newCurNode = null;
				while(curNode.vertex.id != startPoint.vertex.id)
				{
					//console.log("final loop, curID: " + curNode.vertex.id + ", startID: " + startPoint.vertex.id);
					this.dijkstraPathVertices.push(curNode);
					//curNode = this.canvasVertices[this.canvasVertices.map(elem => elem.vertex.id).indexOf(curNode.getParentID())];
					//console.log("dEdges for " + curNode.vertex.id + ", w/parent " + curNode.getParentID() + ": ");
					//console.log(curNode);
					this.dijkstraNodeEdges[curNode.vertex.id].forEach(function (dEdge) {
						//console.log(dEdge);
						if(dEdge.canvasEdge.node1.vertex.id == curNode.getParentID()){newCurNode = dEdge.canvasEdge.node1; parent.dijkstraPathEdges.push(dEdge);}
						else if(dEdge.canvasEdge.node2.vertex.id == curNode.getParentID()){newCurNode = dEdge.canvasEdge.node2; parent.dijkstraPathEdges.push(dEdge);}
					});
					//console.log(newCurNode);
					curNode = newCurNode;
				}
				//Push the final node to the path
				this.dijkstraPathVertices.push(curNode);
				
				console.log("Final path:");
				console.log(this.dijkstraPathVertices);
				console.log(this.dijkstraPathEdges);
				
				this.dijkstraPathEdges.forEach(function (dEdge) {
					dEdge.selectEdge();
				});
			}
			
		}
		else //not found yet, so continue
		{
			var nextNode = this.canvasVertices[this.canvasVertices.map(elem => elem.vertex.id).indexOf(nextID)];
			nextNode.setMinDistanceFound();//This node no longer needs to be traveled to
			
			//start the cycle again
			this.dijkstraLoop(nextID, startPoint, endPoint);
		}
		
	}
	
	
	/*Return array of indexes of the edges array whose node1's equal the input node's id*/
	getEdgeIndexesForVertex(nodeID) {
		var indexes = [], i;
		for(i = 0; i < this.edges.length; i++)
		{
			//console.log(this.edges[i].node1 + ", " + nodeID);
			if (this.edges[i].node1 === nodeID) {indexes.push(i);}
		}
			
		return indexes;
	}
	
	/*Return array of edges where the first node equals this node ID*/
	getEdgesForVertex(nodeID) {
		var newEdges = [], i;
		for(i = 0; i < this.edges.length; i++)
		{
			//console.log(this.edges[i].node1 + ", " + nodeID);
			if (this.edges[i].node1 === nodeID) {newEdges.push(this.edges[i]);}
		}
			
		return newEdges;
	}
	
	
	/*Get all vertices from the server*/
	getMapVertices(){
		this.mapService.getMapVertices().subscribe(
			data => this.vertices = data,
			error => console.log(error),
			() => {this.gotMapVertices = true; this.createMap();}//console.log("got vertices")
		);
	}
	/*Get all edges from the server*/
	getMapEdges(){
		this.mapService.getMapEdges().subscribe(
			data => this.edges = data,
			error => console.log(error),
			() => {this.gotMapEdges = true; this.createMap();}//console.log("got edges")
		);
	}
	/*Create the visual map model. Requires the map's vertices and edges to both be loaded*/
	createMap(){
		if(this.gotMapVertices && this.gotMapEdges)
		{
			console.log("creating map");
			var parent = this; //store reference to variables from this object
			
			//First, sort the edges array so that node1 only increases; allows for easier pathfinding
			this.edges.sort((a, b) => a.node1 < b.node1 ? -1 : a.node1 > b.node1 ? 1 : 0)
			//Also sort the vertices by id just in case (should already be sorted)
			this.vertices.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
			
			
			//create canvasVertices
			this.vertices.forEach(function (vertex) {
				//console.log(vertex);
				//canvasVertices
				if(typeof vertex.xPos === 'number' && typeof vertex.yPos === 'number')
				{
					//console.log("pushing vertex");
					parent.canvasVertices.push(new CanvasVertex(parent.cx, vertex));
				}
			}); 
			
			
			//create canvasEdges and dijkstraNodeEdges
			this.edges.forEach(function (edge) {
				//canvasEdges
				//var firstNode = parent.vertices[parent.vertices.map(elem => elem.id).indexOf(edge.node1)];
				//var secondNode = parent.vertices[parent.vertices.map(elem => elem.id).indexOf(edge.node2)];
				var firstNode = parent.canvasVertices[parent.canvasVertices.map(elem => elem.vertex.id).indexOf(edge.node1)];
				var secondNode = parent.canvasVertices[parent.canvasVertices.map(elem => elem.vertex.id).indexOf(edge.node2)];
				var thisCanvasEdge = new CanvasEdge(parent.cx, firstNode, secondNode);
				//var thisCanvasEdge = new CanvasEdge(parent.cx, canvasVertices.  firstNode, secondNode);
				parent.canvasEdges.push(thisCanvasEdge);
				
				//console.log("Node ids: " + firstNode.vertex.id + ", " + secondNode.vertex.id + ";");
				
				//dijkstraNodeEdges
				//initialize subarrays if they don't already exist
				if(parent.dijkstraNodeEdges[firstNode.vertex.id] == null){parent.dijkstraNodeEdges[firstNode.vertex.id] = [];}
				if(parent.dijkstraNodeEdges[secondNode.vertex.id] == null){parent.dijkstraNodeEdges[secondNode.vertex.id] = [];}
				
				//create the new edge
				var dEdge = new DijkstraNodeEdge(thisCanvasEdge);
				
				//push the edge to the arrays
				parent.dijkstraNodeEdges[firstNode.vertex.id].push(dEdge);
				parent.dijkstraNodeEdges[secondNode.vertex.id].push(dEdge);
			}); 
			
			
			//For debugging, print out dijkstraNodeEdges array
			console.log(this.dijkstraNodeEdges);
			
			this.hasCreatedMap = true;
			this.drawMap(); //redundant attempt to draw map;
		}
	}
	
	
	/*draw the map to the screen. Requires the map model to have been constructed and the view initialized*/
	drawMap(){
		if(this.isViewInitialized && this.hasCreatedMap)
		{
			console.log("drawing map");
			var parent = this; //store reference to variables from this object
			
			this.canvasEdges.forEach(function (canvasEdge) {
				//console.log(edge);
				//console.log(edge.node1);
				
				canvasEdge.drawNormal();
			}); 
			
			this.canvasVertices.forEach(function (canvasVertex) {
				//console.log("drawing vertex");
				canvasVertex.drawNormal();
			}); 
			
		}
	}
}


/*Edges used for graph calculations of Dijkstra's algorithm; a wrapper for CanvasEdges
 Stores a canvasEdge object reference, as well as other important pieces of data.*/
class DijkstraNodeEdge{
	
	canvasEdge: CanvasEdge;
	newID: number;
	distance: number;
	
	constructor(_canvasEdge: CanvasEdge)
	{
		this.newID = Math.random()
		this.canvasEdge = _canvasEdge;
		
		this.distance = this.canvasEdge.getDistance();
		//console.log(this.distance);
	}
	
	public getDistance(){return this.distance;}
	
	/*Return a reference to the other vertex, given a vertex*/
	public getOtherVertex(_testNode: Vertex)
	{
		return this.canvasEdge.getOtherVertex(_testNode);
	}
	
	/*Return the other vertex's id, given a vertex id*/
	public getOtherVertexID(_testNodeID: number)
	{
		return this.canvasEdge.getOtherVertexID(_testNodeID);
	}
	
	/*Return the other vertex, given a vertex id*/
	public getOtherVertexFromID(_testNodeID: number)
	{
		return this.canvasEdge.getOtherVertexFromID(_testNodeID);
	}
	
	/*Return the requested vertex given a vertex id*/
	public getVertexFromID(_testNodeID: number)
	{
		return this.canvasEdge.getVertexFromID(_testNodeID);
	}
	
	public getNewID()
	{
		return this.newID;
	}
	
	/*This edge has been selected, so render the 'selected' version*/
	public selectEdge()
	{
		this.canvasEdge.drawSelected();
	}
	
	/*This edge has been deselected, so render the 'normal' version*/
	public deselectEdge()
	{
		this.canvasEdge.drawNormal();
	}
}


/*Visual representation of vertices--- ALSO used in dijkstra's algorithm by storing a 'totalDistance' variable*/
class CanvasVertex{
	
	ctx: CanvasRenderingContext2D;
	vertex: Vertex;
	zoom: number;
	color: string;
	selectStartColor: string;
	selectEndColor: string;
	hoverColor: string;
	backColor: string;
	circleSize: number;
	textColor: string;
	totalDistance: number;
	private minDistanceFound: boolean; //set to true when this edge no longer needs to be traveled
	private parentID: number;//id of the vertex that came before (used to trace path throughout algorithm)
	
	isSelected: boolean;
	
	constructor(_ctx: CanvasRenderingContext2D, _vertex: Vertex)
	{
		this.ctx = _ctx;
		this.vertex = _vertex;
		
		this.zoom = 10; //multiplier for zooming in
		this.color = '#1158ff'; //default color
		this.hoverColor = '#1a27ba'; //color when hovering over
		this.selectStartColor = '#29f24d'; //color when selected as starting point
		this.selectEndColor = '#ff1414'; //color when selected as ending point
		this.backColor = '#000000'; //background color (outline)
		this.textColor = '#ffffff'; //color of the text
		this.circleSize = 15; //size of the circle in px
		
		this.isSelected = false;
		this.resetTotalDistance();
		this.resetParentID();//initialize parent ID
		this.resetMinDistanceFound();
		
		//just for fun testing. TODO: remove!
		//this.vertex.xPos = Math.random()*80;
		//this.vertex.yPos = Math.random()*45;
	}
	
	public resetMinDistanceFound() {this.minDistanceFound = false;} //init to false
	public getMinDistanceFound() {return this.minDistanceFound;}
	public setMinDistanceFound() {this.minDistanceFound = true;}
	
	public resetParentID() {this.parentID = -1;} //initialize to a negative number so we know it's not set
	public setParentID(newParentID: number) {this.parentID = newParentID;}
	public getParentID() {return this.parentID;}
	
	/*set total distance to infinity (largest number possible); useful for dijkstra's algorithm*/
	public resetTotalDistance()
	{
		this.totalDistance = Infinity;
		//console.log("Reset total distance to " + this.totalDistance);
	}
	
	public setTotalDistance(newDistance: number) {this.totalDistance = newDistance;}
	public getTotalDistance(){return this.totalDistance;}
	
	/*Return true if point exists within this circle, or false otherwise*/
	public isPointOver(newX: number, newY: number){ 
		return (((newX - this.vertex.xPos*this.zoom)**2) + ((newY - this.vertex.yPos*this.zoom)**2) <= (this.circleSize**2)); 
	}
	
	public getIsSelected(){return this.isSelected;}
	public setIsSelected(newVal: boolean){this.isSelected = newVal;}
	
	public drawBackground()
	{
		//console.log("Drawing " + this.vertex.xPos*this.zoom + ", " + this.vertex.yPos*this.zoom + ", " + this.circleSize);
		this.ctx.beginPath();
		this.ctx.arc(this.vertex.xPos*this.zoom, this.vertex.yPos*this.zoom, this.circleSize+2, 0, Math.PI * 2, true);
		this.ctx.fillStyle = this.backColor;
		this.ctx.fill();
		this.ctx.closePath();
	}
	
	public drawID()
	{
		var textHeightOffset = this.circleSize/2; //px to offset id height
		var textSize = this.circleSize*1.5; //size of the text
		
		this.ctx.fillStyle = this.textColor;
		this.ctx.font = textSize + "px Arial";
		
		this.ctx.fillText(String(this.vertex.id),(this.vertex.xPos*this.zoom)-(this.ctx.measureText(String(this.vertex.id)).width/2),(this.vertex.yPos*this.zoom)+textHeightOffset);
	}
	
	public drawNormal()
	{
		this.drawBackground();
		
		this.ctx.beginPath();
		this.ctx.arc(this.vertex.xPos*this.zoom, this.vertex.yPos*this.zoom, this.circleSize, 0, Math.PI * 2, true);
		this.ctx.fillStyle = this.color;
		this.ctx.fill();
		this.ctx.closePath();
		
		this.drawID();
	}
	
	public drawSelectedStart()
	{
		this.ctx.beginPath();
		this.ctx.arc(this.vertex.xPos*this.zoom, this.vertex.yPos*this.zoom, this.circleSize, 0, Math.PI * 2, true);
		this.ctx.fillStyle = this.selectStartColor;
		this.ctx.fill();
		this.ctx.closePath();
		
		this.drawID();
	}
	
	public drawSelectedEnd()
	{
		this.ctx.beginPath();
		this.ctx.arc(this.vertex.xPos*this.zoom, this.vertex.yPos*this.zoom, this.circleSize, 0, Math.PI * 2, true);
		this.ctx.fillStyle = this.selectEndColor;
		this.ctx.fill();
		this.ctx.closePath();
		
		this.drawID();
	}
	
	public drawHovered()
	{
		this.ctx.beginPath();
		this.ctx.arc(this.vertex.xPos*this.zoom, this.vertex.yPos*this.zoom, this.circleSize-1, 0, Math.PI * 2, true);
		this.ctx.fillStyle = this.hoverColor;
		this.ctx.fill();
		this.ctx.closePath();
		
		this.drawID();
	}
};


/*Visual representation of edges--- ALSO acts as a wrapper to connect any 2 vertices!*/
class CanvasEdge{
	
	ctx: CanvasRenderingContext2D;
	node1: CanvasVertex;
	node2: CanvasVertex;
	zoom: number;
	color: string;
	selectColor: string;
	textColor: string;
	textBackColor: string;
	
	isSelected: boolean;
	
	constructor(_ctx: CanvasRenderingContext2D, _node1: CanvasVertex, _node2: CanvasVertex)
	{
		this.ctx = _ctx;
		this.node1 = _node1;
		this.node2 = _node2;
		
		this.zoom = 10; //multiplier for zooming in
		this.color = '#000000'; //default color
		this.selectColor = '#ff1414'; //color when selected
		this.textColor = '#ffffff';//'#f50'; //color of the text
		this.textBackColor = '#000000'; //color of text background
		
		this.isSelected = false;
	}
	
	/*Return a reference to the other vertex, given a vertex*/
	public getOtherVertex(_testNode: Vertex)
	{
		if(_testNode.id == this.node1.vertex.id){return this.node2;}
		else if(_testNode.id == this.node2.vertex.id){return this.node1;}
		else{return null;}
	}
	
	/*Return the other vertex's id, given a vertex id*/
	public getOtherVertexID(_testNodeID: number)
	{
		if(_testNodeID == this.node1.vertex.id){return this.node2.vertex.id;}
		else if(_testNodeID == this.node2.vertex.id){return this.node1.vertex.id;}
		else{return null;}
	}
	
	/*Return the other vertex, given a vertex id*/
	public getOtherVertexFromID(_testNodeID: number)
	{
		if(_testNodeID == this.node1.vertex.id){return this.node2;}
		else if(_testNodeID == this.node2.vertex.id){return this.node1;}
		else{return null;}
	}
	
	/*Return the requested vertex given a vertex id*/
	public getVertexFromID(_testNodeID: number)
	{
		if(_testNodeID == this.node1.vertex.id){return this.node1;}
		else if(_testNodeID == this.node2.vertex.id){return this.node2;}
		else{return null;}
	}
	
	/*find the distance between the nodes*/
	public getDistance()
	{
		return Math.sqrt((this.node2.vertex.xPos - this.node1.vertex.xPos)**2 + (this.node2.vertex.yPos - this.node1.vertex.yPos)**2);
	}
	
	public drawDistance()
	{
		//this.node1.id = 5;

		var textHeightOffset = 4; //px to offset text height
		
		this.ctx.font = "12px Arial";
		
		var distance = String(this.getDistance()).substring(0, 6)//distance to show under edge; truncated to 6 chars
			
		var backWidth = this.ctx.measureText(distance).width;
		
		//console.log("X positions: " + this.node1.xPos + ", " + this.node2.xPos + ".");
		var midX = ((this.node1.vertex.xPos + this.node2.vertex.xPos)/2)*this.zoom;
		var midY = ((this.node1.vertex.yPos + this.node2.vertex.yPos)/2)*this.zoom;
		
		//console.log("Midpoint: " + midX + ", " + midY);
		
		this.ctx.fillStyle = this.textBackColor;
		this.ctx.fillRect(midX-(backWidth/2), midY-7, backWidth, 14);
		
		this.ctx.fillStyle = this.textColor;
		this.ctx.fillText(distance,midX-(backWidth/2),midY+5);
	}
	
	public drawNormal()
	{
		this.ctx.beginPath();
		this.ctx.lineWidth=8;
		this.ctx.strokeStyle = this.color;
		this.ctx.moveTo(this.node1.vertex.xPos*this.zoom,this.node1.vertex.yPos*this.zoom);
		this.ctx.lineTo(this.node2.vertex.xPos*this.zoom,this.node2.vertex.yPos*this.zoom);
		this.ctx.stroke();
		this.ctx.closePath();
		
		this.drawDistance();
	}
	
	public drawSelected()
	{
		this.ctx.beginPath();
		this.ctx.lineWidth=5;
		this.ctx.strokeStyle = this.selectColor;
		this.ctx.moveTo(this.node1.vertex.xPos*this.zoom,this.node1.vertex.yPos*this.zoom);
		this.ctx.lineTo(this.node2.vertex.xPos*this.zoom,this.node2.vertex.yPos*this.zoom);
		this.ctx.stroke();
		this.ctx.closePath();
	}
};
