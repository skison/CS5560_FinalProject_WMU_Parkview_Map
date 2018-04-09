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
import MapVertex from '../../../shared/models/mapvertex';
import MapEdge from '../../../shared/models/mapedge';
import DijkstraMapVertex from '../../../shared/models/dijkstramapvertex';

import math = require('mathjs');


@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit, AfterViewInit {
	
	/*map zoom controls*/
	selectZoomForm: FormGroup;
	selectzoom = new FormControl('', [
		Validators.required
	]);
	
	/*map rotation controls*/
	selectRotationForm: FormGroup;
	selectrotation = new FormControl('', [
		Validators.required
	]);
	
	/*map transformations holder (zoom, rotation, x&y offsets, etc.)*/
	mapTransforms: MapTransforms;
	
	/*the actual rendered canvases*/
	@ViewChild('canvasVertices') public canvasVerticesLayer: ElementRef;
	@ViewChild('canvasEdges') public canvasEdgesLayer: ElementRef;
	
	private cxVertices: CanvasRenderingContext2D; //handle for drawing to canvas- vertices layer
	private cxEdges: CanvasRenderingContext2D; //handle for drawing to canvas- edges layer
	
	private canvasElVertices: HTMLCanvasElement;
	private canvasElEdges: HTMLCanvasElement;
  
	//Actual vertices array and visual vertices array. 
	vertices: MapVertex[] = []; //stored in whatever order they arrived from the DB
	canvasVertices: CanvasMapVertex[] = []; //indexed by id
	
	//Actual mapEdges array and visual mapEdges array. 
	mapEdges: MapEdge[] = []; //stored in whatever order they arrived from the DB
	canvasEdgesLinked: CanvasMapEdge[][] = []; //first dimension indexed by vertex id, second dimension contains all edges for said vertex- this leads to some intentional redundancy
	canvasEdgesUnlinked: CanvasMapEdge[] = []; //all the same nodes as above, but not indexed by vertex; no redundancy
	
	//Path received from the server after a call to getPath(); consists of DijkstraMapVertex objects
	dijkstraPath: DijkstraMapVertex[] = [];
	dijkstraPathTEMP: DijkstraMapVertex[] = []; //data-only version obtained after server call- objects have to be read to the real dijkstraPath array in order to be able to use their functions
	
	isLoading = true;
	isEditing = false;
	
	continueAnimatingExpand: boolean;//only animate expands while this is true!
	continueAnimatingContract: boolean;//only animate contracts while this is true!
	continueAnimatingHide: boolean;//only animate hides while this is true!
	totalExpands: 0; //counter to prevent redundant expand animations at once
	totalContracts: 0; //counter to prevent redundant expand animations at once
	
	isGettingPath = false; //set to true when waiting for path from server
	
	mapElementsObtained = 0; //increment either when vertices and/or edges have been obtained. Once this ==2, the map can be created
	mapReadyCounter = 0; //increment after the map has been created and after the view has been initialized. Once this ==2, the map can be drawn
	
	/*start and end points (IDs of vertices). Will be set to >0 when in use, or <=0 when unused*/
	startPoint = -1;
	endPoint = -1;
	
	/*boolean to check if rot X&Y have been initialized*/
	rotInit = false;
	  
	constructor(private mapService: MapService,
				private formBuilder: FormBuilder,
				public toast: ToastComponent) { }

				
	/*Triggers when component loads*/
	ngOnInit() {
		var parent = this; //store reference to variables from this object
		
		/*set the default transformations: zoom: 10%, rotation: 0, rotateX: 0, rotateY: 0, xOffset: 0, yOffset: 0*/
		//this.mapTransforms = new MapTransforms(10, 0, 0, 0, 0, 0);
		this.mapTransforms = new MapTransforms();
		this.mapTransforms.setZoom(10); //default to 10% zoom
		this.mapTransforms.setRotation(0);
		
		console.log("getting map data");
		this.getMapEdges();
		this.getMapVertices();
		this.isLoading = false;
		
		this.selectZoomForm = this.formBuilder.group({
			selectzoom: this.selectzoom
		});
		
		this.selectRotationForm = this.formBuilder.group({
			selectrotation: this.selectrotation
		});
		
		/*update mapTransforms zoom on selectzoom change*/
		this.selectZoomForm.valueChanges.subscribe(data => {
		  //console.log('Form changes', data.selectzoom)
			if(data.selectzoom != null)
			{
				parent.mapTransforms.setZoom(data.selectzoom);
			}
		})
		
		/*update mapTransforms rotation on selectrotation change*/
		this.selectRotationForm.valueChanges.subscribe(data => {
		  //console.log('Form changes', data.selectzoom)
			if(data.selectrotation != null && parent.cxVertices != null)
			{
				parent.mapTransforms.setRotation(data.selectrotation);
			}
		})
	}
	
	/*Triggers once view has finished loading*/
	ngAfterViewInit() {
		this.selectzoom.setValue(this.mapTransforms.getZoom());//set a default zoom level
		this.selectrotation.setValue(this.mapTransforms.getRotation());//set a default rotation level
		//console.log(this.selectzoom.value);
		//console.log("starting ngAfterViewInit");
		this.canvasElVertices = this.canvasVerticesLayer.nativeElement;
		this.canvasElEdges = this.canvasEdgesLayer.nativeElement;
		//console.log(this.canvas.nativeElement);
		
		/*default canvas size; could be made responsive by dynamically changing these on screen size*/
		this.canvasElVertices.width = 600;
		this.canvasElVertices.height = 450;
		
		this.canvasElEdges.width = 600;
		this.canvasElEdges.height = 450;
		
		this.cxVertices = this.canvasElVertices.getContext('2d');
		this.cxEdges = this.canvasElEdges.getContext('2d');
		
		//this.cxVertices.translate(0.5, 0.5); //allow for smoother lines (less unnecessary anti-aliasing)
		//this.cxEdges.translate(0.5, 0.5); //allow for smoother lines (less unnecessary anti-aliasing)
		
		this.captureEvents(this.canvasElVertices);
		//this.captureEvents()
		
		//this.isViewInitialized = true;
		this.mapReadyCounter++;
		//console.log("ngAfterViewInit complete");
		if(this.mapReadyCounter == 2){
			this.drawMap(); //redundant attempt to draw map;
		}
		
		//start animation frames
		this.animate();
		
		
	}
	
	
	
	/*Get all vertices from the server*/
	getMapVertices(){
		this.mapService.getMapVertices().subscribe(
			data => this.vertices = data,
			error => console.log(error),
			() => {this.mapElementsObtained++; if(this.mapElementsObtained == 2){this.createMap();}}
		);
	}
	/*Get all mapEdges from the server*/
	getMapEdges(){
		this.mapService.getMapEdges().subscribe(
			data => this.mapEdges = data,
			error => console.log(error),
			() => {this.mapElementsObtained++; if(this.mapElementsObtained == 2){this.createMap();}}
		);
	}
	/*Create the visual map model. Requires the map's vertices and mapEdges to both be loaded*/
	createMap(){
		//console.log("creating map");
		var parent = this; //store reference to variables from this object
		
		//console.log("sorted vertices");
		
		//create canvasVertices
		this.vertices.forEach(function (mapVertex) {
			parent.canvasVertices[mapVertex.id] = (new CanvasMapVertex(parent.cxVertices, parent.mapTransforms, mapVertex));
		}); 
		
		
		//create canvasEdges
		this.mapEdges.forEach(function (mapEdge) {
			var firstNode = parent.canvasVertices[mapEdge.node1];
			var secondNode = parent.canvasVertices[mapEdge.node2];
			var thisCanvasMapEdge = new CanvasMapEdge(parent.cxEdges, parent.mapTransforms, firstNode, secondNode);
			
			parent.canvasEdgesUnlinked.push(thisCanvasMapEdge);//push MapEdge to unlinked array
			
			//initialize linked subarrays if they don't already exist
			if(parent.canvasEdgesLinked[mapEdge.node1] == null){parent.canvasEdgesLinked[mapEdge.node1] = [];}
			if(parent.canvasEdgesLinked[mapEdge.node2] == null){parent.canvasEdgesLinked[mapEdge.node2] = [];}
			//push the MapEdge to the linked arrays
			parent.canvasEdgesLinked[mapEdge.node1].push(thisCanvasMapEdge);
			parent.canvasEdgesLinked[mapEdge.node2].push(thisCanvasMapEdge);
		}); 
		
		this.mapReadyCounter++;
		//console.log("createMap complete");
		if(this.mapReadyCounter == 2){
			this.drawMap(); //redundant attempt to draw map;
		}
		
	}
	/*draw the entire map to the screen. Requires the map model to have been constructed and the view initialized*/
	drawMap(){
		//console.log("drawing map");
		
		//clear layers first
		this.cxEdges.clearRect(0, 0, this.canvasElEdges.width, this.canvasElEdges.height);
		this.cxVertices.clearRect(0, 0, this.canvasElVertices.width, this.canvasElVertices.height);
		
		this.canvasEdgesUnlinked.forEach(function (canvasMapEdge) {
			canvasMapEdge.draw();
		}); 
		
		this.canvasVertices.forEach(function (canvasMapVertex) {
			canvasMapVertex.draw();
		}); 
		
		//window.requestAnimationFrame(this.drawMap.bind(this));
	}
	/*Just draw the edges layer*/
	drawEdgesLayer()
	{
		//clear layer first
		this.cxEdges.clearRect(0, 0, this.canvasElEdges.width, this.canvasElEdges.height);
		
		this.canvasEdgesUnlinked.forEach(function (canvasMapEdge) {
			canvasMapEdge.draw();
		}); 
	}
	/*Just draw the vertices layer*/
	drawVerticesLayer()
	{
		//clear layer first
		this.cxVertices.clearRect(0, 0, this.canvasElVertices.width, this.canvasElVertices.height);
		
		this.canvasVertices.forEach(function (canvasMapVertex) {
			canvasMapVertex.draw();
		}); 
	}
	/*perform any animations for this frame*/
	animate()
	{
		//this.mapTransforms.setRotateX(((this.cxVertices.canvas.width/2)/this.mapTransforms.getZoom())-this.mapTransforms.getXOffset()/this.mapTransforms.getZoom());
		//this.mapTransforms.setRotateY(((this.cxVertices.canvas.height/2)/this.mapTransforms.getZoom())-this.mapTransforms.getYOffset()/this.mapTransforms.getZoom());
		this.mapTransforms.setRotatePoint(
			((this.cxVertices.canvas.width/2)/this.mapTransforms.getZoom())-this.mapTransforms.getXOffset()/this.mapTransforms.getZoom(),
			((this.cxVertices.canvas.height/2)/this.mapTransforms.getZoom())-this.mapTransforms.getYOffset()/this.mapTransforms.getZoom()
		);



		var divWidth = document.getElementById("canvasHolder").clientWidth;
		//console.log(divWidth);
		/*dynamically scale canvas*/
		this.cxVertices.canvas.width  = divWidth;
		this.cxVertices.canvas.height = divWidth*.5625; //keep 16:9 aspect ratio
		this.cxEdges.canvas.width  = divWidth;
		this.cxEdges.canvas.height = divWidth*.5625; //keep 16:9 aspect ratio
		
		
		/*
		// Move registration point to the center of the canvas
		context.translate(canvasWidth/2, canvasWidth/2);
		// Rotate 1 degree
		context.rotate(Math.PI / 180);
		// Move registration point back to the top left corner of canvas
		context.translate(-canvasWidth/2, -canvasWidth/2);
		*/
		
		/*this.cxVertices.translate(this.cxVertices.canvas.width/2, this.cxVertices.canvas.height/2);
		this.cxEdges.translate(this.cxEdges.canvas.width/2, this.cxEdges.canvas.height/2);
		
		this.cxVertices.rotate((Math.PI / 180)*90);
		this.cxEdges.rotate((Math.PI / 180)*90);
		
		this.cxVertices.translate(-this.cxVertices.canvas.width/2, -this.cxVertices.canvas.height/2);
		this.cxEdges.translate(-this.cxEdges.canvas.width/2, -this.cxEdges.canvas.height/2);*/
		
  
		//Check for animations on the vertices layer
		/*if(this.continueAnimatingExpand || this.continueAnimatingContract || this.continueAnimatingHide)
		{
			//console.log("animating");
			
			this.continueAnimatingExpand = false; this.continueAnimatingContract = false; this.continueAnimatingHide = false;//reset booleans to false
			
			this.canvasVertices.forEach(function (canvasMapVertex) {
				if(canvasMapVertex.getIsHidden()) //only hide nodes that should be hidden
				{
					if(!canvasMapVertex.isFullyHidden()){ this.continueAnimatingHide = true; }//still needs to contract more
				}
				else if(!canvasMapVertex.getIsSelected() && !canvasMapVertex.getIsHovered()) //only contract non-selected and non-hovered nodes
				{
					if(!canvasMapVertex.isFullyContracted()){ this.continueAnimatingContract = true; }//still needs to contract more
				}
				else if(canvasMapVertex.getIsSelected() || canvasMapVertex.getIsHovered()) //only expand non-selected and non-hovered nodes
				{
					if(!canvasMapVertex.isFullyExpanded()){  this.continueAnimatingExpand = true; }//still needs to expand more
				}
			}.bind(this));
			
			this.drawVerticesLayer();
		}*/
		
		this.drawVerticesLayer();
		this.drawEdgesLayer();
		
		
		
		//restart animation
		window.requestAnimationFrame(this.animate.bind(this));
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
		
		//For dragging map
		Observable
		.fromEvent(canvasEl, 'mousedown')
		.switchMap((e) => {
			return Observable
			.fromEvent(canvasEl, 'mousemove')
			.takeUntil(Observable.fromEvent(canvasEl, 'mouseup'))
			.takeUntil(Observable.fromEvent(canvasEl, 'mouseleave'))
			.pairwise()
		})
		.subscribe((res: [MouseEvent, MouseEvent]) => {
			const rect = canvasEl.getBoundingClientRect();
  
			const prevPos = {
				x: res[0].clientX - rect.left,
				y: res[0].clientY - rect.top
			};
  
			const currentPos = {
				x: res[1].clientX - rect.left,
				y: res[1].clientY - rect.top
			};
  
			//this.drawOnCanvas(prevPos, currentPos);
			//drag map to new location
			this.dragMap(prevPos, currentPos);
		});
	}
	/*Check map points for click*/
	checkForClick(newX: number, newY: number)
	{
		var parent = this; //store reference to variables from this object
		
		this.canvasVertices.forEach(function (canvasMapVertex) {
			//console.log("Checking for click!");
			if(canvasMapVertex.isPointOver(newX, newY))//clicked on this node
			{
				if(!canvasMapVertex.getIsSelected())//not yet selected; so select
				{
					if(parent.startPoint < 1 && typeof canvasMapVertex.mapVertex.id === "number")
					{
						parent.startPoint = canvasMapVertex.mapVertex.id;//set this as start point
						
						canvasMapVertex.selectMapVertex(true);
						//parent.drawVerticesLayer();
						//parent.animateNodeExpand();
						parent.continueAnimatingExpand = true;
						parent.continueAnimatingHide = true;
						parent.toast.setMessage('Point ' + parent.startPoint + ' selected as starting point!', 'success');
						
						if(parent.endPoint > 0) //only activate if both points are set
						{
							//finally run dijkstra's algorithm
							//console.log("Getting new path");
							parent.hideExtraVertices();
							parent.drawVerticesLayer();
							parent.getPath();
						}
					}
					else if(parent.endPoint < 1 && typeof canvasMapVertex.mapVertex.id === "number")
					{
						parent.endPoint = canvasMapVertex.mapVertex.id;//set this as end point
						
						canvasMapVertex.selectMapVertex(false);
						//parent.drawVerticesLayer();
						//parent.animateNodeExpand();
						parent.continueAnimatingContract = true;
						parent.continueAnimatingHide = true;
						parent.toast.setMessage('Point ' + parent.endPoint + ' selected as ending point!', 'success');
						
						if(parent.startPoint > 0) //only activate if both points are set
						{
							//finally run dijkstra's algorithm
							//console.log("Getting new path");
							parent.hideExtraVertices();
							parent.drawVerticesLayer();
							parent.getPath();
						}
					}
					else{}
				}
				else //already selected
				{
					if(parent.endPoint == canvasMapVertex.mapVertex.id)
					{
						canvasMapVertex.deselectMapVertex();
						//parent.animateNodeContract();
						parent.continueAnimatingContract = true;
						parent.continueAnimatingHide = true;
						//parent.drawVerticesLayer();
						parent.endPoint = -1;
						parent.toast.setMessage('Point ' + canvasMapVertex.mapVertex.id + ' deselected as ending point!', 'danger');
						
						if(parent.startPoint > 0){parent.undoPath();}//only reset if necessary
						
					}
					else if(parent.startPoint == canvasMapVertex.mapVertex.id)
					{
						canvasMapVertex.deselectMapVertex();
						//parent.animateNodeContract();
						parent.continueAnimatingContract = true;
						parent.continueAnimatingHide = true;
						//parent.drawVerticesLayer();
						parent.startPoint = -1;
						parent.toast.setMessage('Point ' + canvasMapVertex.mapVertex.id + ' deselected as starting point!', 'danger');
						
						if(parent.endPoint > 0){parent.undoPath();}//only reset if necessary
					}
					else{}
				}
			}
		});
	}
	/*Check map points for hover*/
	checkForHover(newX: number, newY: number)
	{
		var parent = this; //store reference to variables from this object
		
		this.canvasVertices.forEach(function (canvasMapVertex) {
			//console.log("Checking for hover!");
			if(!canvasMapVertex.isSelected)//not yet selected
			{
				if(canvasMapVertex.isPointOver(newX, newY))
				{
					if(!canvasMapVertex.getIsHovered())
					{
						canvasMapVertex.hoverMapVertex();
						//parent.animateNodeExpand();
						//parent.drawVerticesLayer();
						parent.continueAnimatingExpand = true;
						parent.continueAnimatingHide = true;
					}
				}
				else if(canvasMapVertex.getIsHovered())
				{
					canvasMapVertex.unhoverMapVertex();
					//parent.animateNodeContract();
					//parent.drawVerticesLayer();
					parent.continueAnimatingContract = true;
					parent.continueAnimatingHide = true;
				}
			}
		});
	}
	/*drag the map to the new position*/
	dragMap(prevPos: { x: number, y: number }, currentPos: { x: number, y: number })
	{
		var difX = (currentPos.x-prevPos.x);//relative movement in the X direction
		var difY = (currentPos.y-prevPos.y);//relative movement in the Y direction

		//console.log("dragging map from " + prevPos.x + ", " + prevPos.y + " to " + currentPos.x + ", " + currentPos.y);
		//console.log("difference: " + difX + ", " + difY);
		//this.mapTransforms.addXOffset(difX);
		//this.mapTransforms.addYOffset(difY);
		this.mapTransforms.addOffset(difX, difY);

		
		/*var s = Math.sin((Math.PI/180)*this.mapTransforms.getRotation());//get angles
		var c = Math.cos((Math.PI/180)*this.mapTransforms.getRotation());
		var newXPos = (difX * c) - (difY * s);//rotate point
		var newYPos = (difX * s) + (difY * c);

		this.mapTransforms.addXOffset(-newXPos);
		this.mapTransforms.addYOffset(-newYPos);*/
	}
	
	
	//hide all vertices that are not selected
	private hideExtraVertices()
	{
		//console.log("hiding extra vertices");
		this.canvasVertices.forEach(function (canvasMapVertex) {
			if(!canvasMapVertex.getIsSelected()){canvasMapVertex.hideMapVertex();}
		}); 
	}
	
	
	//show all vertices
	private showAllVertices()
	{
		this.canvasVertices.forEach(function (canvasMapVertex) {
			canvasMapVertex.showMapVertex();
		}); 
	}
	
	
	/*Redraw normal paths; remove the highlighted paths made by dijkstra's algorithm*/
	private undoPath()
	{
		//console.log("Undoing dijkstra path!");
		var parent = this; //store reference to variables from this object
		this.dijkstraPath.forEach(function (dNode) {
			if(dNode.getParentID() > 0)//only check edges if there is a parent (so not the start node)
			{
				//go through this node's edges, find the right one, and select it
				parent.canvasEdgesLinked[dNode.getID()].forEach(function (cEdge) {
					if(cEdge.hasTheseVertices(dNode.getID(), dNode.getParentID()))
					{
						cEdge.deselectMapEdge();
					}
				});
			}
		});
		
		this.dijkstraPath = []; //remove path data
		this.drawEdgesLayer();
		
		this.showAllVertices();
		this.drawVerticesLayer();
	}
	
	
	/*Get fastest path between 2 points as an array of nodes from the server*/
	getPath(){
		this.isGettingPath = true;
		this.mapService.getPath(this.startPoint, this.endPoint).subscribe(
			data => this.dijkstraPathTEMP = data,
			error => console.log(error),
			() => {this.updatePath(); this.isGettingPath = false;}
		);
	}
	/*Update the fastest path on the map*/
	updatePath(){
		//console.log("Updating new fastest path");
		var parent = this; //store reference to variables from this object
		
		this.dijkstraPath = []; //remove path data
		
		this.dijkstraPathTEMP.forEach(function (dNode) {
			var newDNode = new DijkstraMapVertex(dNode.vertex);
			Object.assign(newDNode, dNode);//assign the node object so that its functions can be used
			parent.dijkstraPath.push(newDNode);
			//console.log(newDNode);
		});
		
		this.dijkstraPath.forEach(function (dNode) {
			//console.log(dNode);
			if(dNode.getParentID() > 0)//only check edges if there is a parent (so not the start node)
			{
				//go through this node's edges, find the right one, and select it
				parent.canvasEdgesLinked[dNode.getID()].forEach(function (cEdge) {
					if(cEdge.hasTheseVertices(dNode.getID(), dNode.getParentID()))
					{
						cEdge.selectMapEdge();
					}
				});
			}
		});
		
		this.drawEdgesLayer();
	}
}










/*Visual representation of vertices*/
class CanvasMapVertex{
	
	ctx: CanvasRenderingContext2D;
	mapVertex: MapVertex;
	mapTransforms: MapTransforms;
	//zoom: number;
	color: string;
	selectStartColor: string;
	selectEndColor: string;
	hoverColor: string;
	backColor: string;
	circleSize: number; //current size of circle
	minCircleSize: number; //smallest size circle can be
	maxCircleSize: number; //largest size circle can be
	resizeRate: number; //speed at which this circle can be resized each frame. TODO: make this run on time, NOT framerate!
	textColor: string;
	
	isSelected: boolean;
	isHovered: boolean;
	isStartPoint: boolean; //true if start point, false if end point (only relevent if isSelected)
	isHidden: boolean; //true to hide this point (don't draw it)


	matrix: math.Matrix; //start matrix for this node

	
	constructor(_ctx: CanvasRenderingContext2D, _mapTransforms: MapTransforms, _mapVertex: MapVertex)
	{
		this.ctx = _ctx;
		this.mapVertex = _mapVertex;
		this.mapTransforms = _mapTransforms;

		this.matrix = math.matrix([[this.mapVertex.xPos], [this.mapVertex.yPos], [1]]);
		//console.log(this.matrix);
		//console.log(math.subset(this.matrix, math.index(0, 0)));
		
		//this.zoom = 10; //multiplier for zooming in
		this.color = '#1158ff'; //default color
		this.hoverColor = '#1158ff'//'#1a27ba'; //color when hovering over
		this.selectStartColor = '#29f24d'; //color when selected as starting point
		this.selectEndColor = '#ff940a'//'#ff1414'; //color when selected as ending point
		this.backColor = '#000000'; //background color (outline)
		this.textColor = '#ffffff'; //color of the text
		this.minCircleSize = 7.5;
		this.circleSize = this.minCircleSize;
		this.maxCircleSize = 15; //size of the circle in px
		this.resizeRate = 1;//not too fast
		
		this.isSelected = false;
		this.isHovered = false;
		this.isStartPoint = true; 
		this.isHidden = false;
	}
	
	/*Return true if point exists within this circle, or false otherwise*/
	public isPointOver(newX: number, newY: number){ 
		/*return (((newX - ((this.mapVertex.xPos*this.mapTransforms.getZoom())+this.mapTransforms.getXOffset()))**2)
			+ ((newY - ((this.mapVertex.yPos*this.mapTransforms.getZoom())+this.mapTransforms.getYOffset()))**2) <= (this.maxCircleSize**2)); */

		//var realPoint = this.getRealMapPositions();
		//var curMatrix = math.multiply(this.mapTransforms.getMatrix(), this.matrix);
		
		return (((newX - this.getMapX())**2)
			+ ((newY - this.getMapY())**2) <= (this.maxCircleSize**2));
	}
	
	public drawID()
	{
		var textHeightOffset = this.circleSize/2; //px to offset id height
		var textSize = this.circleSize*1.5; //size of the text
		
		this.ctx.fillStyle = this.textColor;
		this.ctx.font = textSize + "px Arial";
		
		this.ctx.fillText(String(this.mapVertex.id),
		(this.getMapX()-(this.ctx.measureText(String(this.mapVertex.id)).width/2)),
		(this.getMapY()+textHeightOffset));
		
	}
	
	public draw()
	{
		/*if(!this.isHidden)
		{*/
			//this.drawBackground();
			
			
			//var time = new Date();
			
			if(this.isHidden){ //node is hidden
				if(this.circleSize > 0){ //circle needs to shrink to 0
					this.circleSize -= this.resizeRate; //shrink
					if(this.circleSize < 0){ //if it's now too small
						this.circleSize = 0; //cap its size
					}
				}
				
				this.ctx.fillStyle = this.color;
			}
			else if(this.isSelected){ //node is selected
				
				if(this.circleSize < this.maxCircleSize){ //circle needs to grow
					this.circleSize += this.resizeRate; //grow
					if(this.circleSize > this.maxCircleSize){ //if it's now too large
						this.circleSize = this.maxCircleSize; //cap its size
					}
				}
				
				if(this.isStartPoint) {this.ctx.fillStyle = this.selectStartColor;}
				else {{this.ctx.fillStyle = this.selectEndColor;}}
			}
			else if(this.isHovered){ //node is hovered
				
				if(this.circleSize < this.maxCircleSize){ //circle needs to grow
					this.circleSize += this.resizeRate; //grow
					if(this.circleSize > this.maxCircleSize){ //if it's now too large
						this.circleSize = this.maxCircleSize; //cap its size
					}
				}
				
				this.ctx.fillStyle = this.hoverColor;
			}
			else{ //node is normal
				if(this.circleSize > this.minCircleSize){ //circle needs to shrink
					this.circleSize -= this.resizeRate; //shrink
					if(this.circleSize < this.minCircleSize){ //if it's now too small
						this.circleSize = this.minCircleSize; //cap its size
					}
				}
				
				if(this.circleSize < this.minCircleSize){ //circle needs to grow
					this.circleSize += this.resizeRate; //grow
					if(this.circleSize > this.minCircleSize){ //if it's now too large
						this.circleSize = this.minCircleSize; //cap its size
					}
				}
				
				this.ctx.fillStyle = this.color;
			}
			
			if(this.circleSize > 0)
			{					
				this.ctx.save();
				this.ctx.beginPath();

				/*this.ctx.fillStyle = '#ff0000';
				//center of screen
				this.ctx.arc((this.mapTransforms.getRotateX()*this.mapTransforms.getZoom())+this.mapTransforms.getXOffset(), (this.mapTransforms.getRotateY()*this.mapTransforms.getZoom())+this.mapTransforms.getYOffset(), this.circleSize, 0, Math.PI * 2, true);
				this.ctx.fill();
				this.ctx.closePath();
				

				//actual rotate point
				
				var actualRot = this.mapTransforms.getRotatePoint();
				var actualRotX = math.subset(actualRot, math.index(0, 0));
				var actualRotY = math.subset(actualRot, math.index(1, 0));

				this.ctx.beginPath();
				this.ctx.fillStyle = '#00ff00';
				this.ctx.arc(actualRotX, actualRotY, this.circleSize, 0, Math.PI * 2, true);
				this.ctx.fill();
				this.ctx.closePath();


				this.ctx.fillStyle = '#0000ff';
				
				this.ctx.beginPath();*/

				//var curMatrix = math.multiply(this.mapTransforms.getMatrix(), this.matrix);

				//console.log(curMatrix);

				this.ctx.arc(this.getMapX(), this.getMapY(), this.circleSize, 0, Math.PI * 2, true);
				
				
				this.ctx.fill();
				this.ctx.closePath();
			}
			
			this.ctx.restore();
			
			this.drawID();
		/*}*/
	}

	//return the calculated Map X position of the point
	public getMapX() {
		var curMatrix = math.multiply(this.mapTransforms.getMatrix(), this.matrix);
		return (math.subset(curMatrix, math.index(0, 0)))*this.mapTransforms.getZoom()+this.mapTransforms.getXOffset();
	}

	//return the calculated Map Y position of the point
	public getMapY() {
		var curMatrix = math.multiply(this.mapTransforms.getMatrix(), this.matrix);
		return (math.subset(curMatrix, math.index(1, 0)))*this.mapTransforms.getZoom()+this.mapTransforms.getYOffset();
	}
	
	//call this to update this MapVertex's selected boolean to true, as well as the start point
	public selectMapVertex(isStart: boolean)
	{
		this.isStartPoint = isStart;
		this.isSelected = true;
	}
	
	public isFullyExpanded(){/*console.log("Circle size: " + this.circleSize + ", maxCircleSize: " + this.maxCircleSize + ", done? " + (this.circleSize >= this.maxCircleSize));*/ return (this.circleSize == this.maxCircleSize);}
	public isFullyContracted(){return (this.circleSize == this.minCircleSize);}
	public isFullyHidden(){return (this.circleSize == 0);}
	
	//call this to update this MapVertex's selected boolean to false
	public deselectMapVertex(){this.isSelected = false;}
	
	//call this to update this MapVertex's hover boolean to true
	public hoverMapVertex(){this.isHovered = true;}
	
	//call this to update this MapVertex's hover boolean to false
	public unhoverMapVertex(){this.isHovered = false;}
	
	//call this to update this MapVertex's hidden boolean to true
	public hideMapVertex(){this.isHidden = true;}
	
	//call this to update this MapVertex's hidden boolean to false
	public showMapVertex(){this.isHidden = false;}
	
	public getIsSelected() {return this.isSelected;}
	public getIsHovered() {return this.isHovered;}
	public getIsHidden() {return this.isHidden;}
};










/*Visual representation of mapEdges--- ALSO acts as a wrapper to connect any 2 vertices! Used in dijkstra's algorithm implementation*/
class CanvasMapEdge{
	
	ctx: CanvasRenderingContext2D;
	node1: CanvasMapVertex;
	node2: CanvasMapVertex;
	mapTransforms: MapTransforms;
	//zoom: number;
	color: string;
	selectColor: string;
	textColor: string;
	textBackColor: string;
	
	isSelected: boolean;
	
	constructor(_ctx: CanvasRenderingContext2D, _mapTransforms: MapTransforms, _node1: CanvasMapVertex, _node2: CanvasMapVertex)
	{
		this.ctx = _ctx;
		this.node1 = _node1;
		this.node2 = _node2;
		this.mapTransforms = _mapTransforms;
		
		//this.zoom = 10; //multiplier for zooming in
		this.color = '#000000'; //default color
		this.selectColor = '#ff1414'; //color when selected
		this.textColor = '#ffffff';//'#f50'; //color of the text
		this.textBackColor = '#000000'; //color of text background
		
		this.isSelected = false;
	}
	
	//return true if both the specified nodes exist in this edge, false otherwise
	public hasTheseVertices(newNode1: number, newNode2: number)
	{
		return ((this.node1.mapVertex.id == newNode1 && this.node2.mapVertex.id == newNode2) || (this.node2.mapVertex.id == newNode1 && this.node1.mapVertex.id == newNode2));
	}
	
	/*Return a reference to the other MapVertex, given a MapVertex*/
	public getOtherVertex(_testNode: MapVertex)
	{
		if(_testNode.id == this.node1.mapVertex.id){return this.node2;}
		else if(_testNode.id == this.node2.mapVertex.id){return this.node1;}
		else{return null;}
	}
	
	/*Return the other MapVertex's id, given a MapVertex id*/
	public getOtherVertexID(_testNodeID: number)
	{
		if(_testNodeID == this.node1.mapVertex.id){return this.node2.mapVertex.id;}
		else if(_testNodeID == this.node2.mapVertex.id){return this.node1.mapVertex.id;}
		else{return null;}
	}
	
	/*Return the other MapVertex, given a MapVertex id*/
	public getOtherVertexFromID(_testNodeID: number)
	{
		if(_testNodeID == this.node1.mapVertex.id){return this.node2;}
		else if(_testNodeID == this.node2.mapVertex.id){return this.node1;}
		else{return null;}
	}
	
	/*Return the requested MapVertex given a MapVertex id*/
	public getVertexFromID(_testNodeID: number)
	{
		if(_testNodeID == this.node1.mapVertex.id){return this.node1;}
		else if(_testNodeID == this.node2.mapVertex.id){return this.node2;}
		else{return null;}
	}
	
	/*find the distance between the nodes*/
	public getDistance()
	{
		return Math.sqrt((this.node2.mapVertex.xPos - this.node1.mapVertex.xPos)**2 + (this.node2.mapVertex.yPos - this.node1.mapVertex.yPos)**2);
	}
	
	public drawDistance()
	{
		//this.node1.id = 5;

		var textHeightOffset = 4; //px to offset text height
		
		this.ctx.font = "12px Arial";
		
		var distance = String(this.getDistance()).substring(0, 6)//distance to show under MapEdge; truncated to 6 chars
			
		var backWidth = this.ctx.measureText(distance).width;
		
		//console.log("X positions: " + this.node1.xPos + ", " + this.node2.xPos + ".");
		var midX = (((this.node1.mapVertex.xPos + this.node2.mapVertex.xPos)/2)*this.mapTransforms.getZoom())+this.mapTransforms.getXOffset();
		var midY = (((this.node1.mapVertex.yPos + this.node2.mapVertex.yPos)/2)*this.mapTransforms.getZoom())+this.mapTransforms.getYOffset();
		
		//console.log("Midpoint: " + midX + ", " + midY);
		
		this.ctx.fillStyle = this.textBackColor;
		this.ctx.fillRect(midX-(backWidth/2), midY-7, backWidth, 14);
		
		this.ctx.fillStyle = this.textColor;
		this.ctx.fillText(distance,midX-(backWidth/2),midY+5);
	}
	
	public draw()
	{
		this.ctx.beginPath();
		this.ctx.lineCap="round";
		if(this.isSelected)
		{
			this.ctx.lineWidth=5;
			this.ctx.strokeStyle = this.selectColor;
		}
		else
		{
			this.ctx.lineWidth=1;
			this.ctx.strokeStyle = this.color;
		}
		this.ctx.moveTo(this.node1.getMapX(), this.node1.getMapY());
		this.ctx.lineTo(this.node2.getMapX(), this.node2.getMapY());
		this.ctx.stroke();
		this.ctx.closePath();
		
		//this.drawDistance();
	}
	
	//call this to update this MapEdge's selected boolean to true
	public selectMapEdge()
	{
		this.isSelected = true;
		//this.draw();
	}
	
	//call this to update this MapEdge's selected boolean to true
	public deselectMapEdge()
	{
		this.isSelected = false;
		//this.draw();
	}
};










/*A simple class for holding transformation data, specifically: zoom level, rotation, rotation point(x,y), and x&y offset*/
class MapTransforms{
	private zoom: number;
	private rotation: number;
	private rotateX: number; //rotation point X
	private rotateY: number; //rotation point Y
	private xOffset: number;
	private yOffset: number;
	
	public getZoom(){return this.zoom;}
	public getRotation(){return this.rotation;}
	public getRotateX(){return this.rotateX;}
	public getRotateY(){return this.rotateY;}
	public getXOffset(){return this.xOffset;}
	public getYOffset(){return this.yOffset;}
	
	public setZoom(_zoom: number)
	{ 
		var oldZoom = this.zoom; //save old zoom level
		var newZoom = _zoom/this.zoom; //find new zoom value
		this.zoom = _zoom;

		var x = math.subset(this.rotatePoint, math.index(0, 0)); //get position of point before zoom
		var y = math.subset(this.rotatePoint, math.index(1, 0));
		//console.log("zoomed, x: " + x + ", y: " + y);

		var x2 = x*newZoom;
		var y2 = y*newZoom;

		//console.log("Zooms: Old: " + x + ", " + y + "; New: " + x2 + ", " + y2 + ";");
		var xDiff = x2-x;
		var yDiff = y2-y;

		console.log("zoom diff: " + xDiff + ", " + yDiff);

		//offset rotate point by difference
		this.rotatePoint = math.multiply(math.matrix([[1, 0, xDiff], [0, 1, yDiff], [0, 0, 1]]), this.rotatePoint);

		//this.matrix = math.multiply(this.matrix, math.matrix([[1, 0, -xDiff/this.zoom], [0, 1, -yDiff/this.zoom], [0, 0, 1]]));
		
		//Add x & y offset to compensate for zoom level (to keep centered)
		var offX = this.rotateX*oldZoom;
		var offY = this.rotateY*oldZoom;
		var newOffX = this.rotateX*_zoom;
		var newOffY = this.rotateY*_zoom;
		var offXDiff = newOffX - offX;
		var offYDiff = newOffY - offY;

		this.xOffset -= offXDiff;//*this.zoom;
		this.yOffset -= offYDiff;//*this.zoom;

	}

	public setRotation(_rotation: number)
	{ 
		var newRotation = _rotation-this.rotation; //find new rotation in degrees
		this.rotation = _rotation;
		
		var s = Math.sin((Math.PI/180)*newRotation);//get angles
		var c = Math.cos((Math.PI/180)*newRotation);

		var x = math.subset(this.rotatePoint, math.index(0, 0))/this.zoom; //get x & y coordinates
		var y = math.subset(this.rotatePoint, math.index(1, 0))/this.zoom;

		this.matrix = math.multiply(this.matrix, math.matrix([[1, 0, x], [0, 1, y], [0, 0, 1]]));//translate to rotation point
		this.matrix = math.multiply(this.matrix, math.matrix([[c, s, 0], [-s, c, 0], [0, 0, 1]]));//rotate by new degrees
		this.matrix = math.multiply(this.matrix, math.matrix([[1, 0, -x], [0, 1, -y], [0, 0, 1]]));//translate back
	}




	public setRotatePoint(_rotateX: number, _rotateY: number)
	{
		var rotXDiff = _rotateX-this.rotateX;
		var rotYDiff = _rotateY-this.rotateY;
		
		if(rotXDiff != 0 || rotYDiff != 0)
		{
			this.rotateX = _rotateX; this.rotateY = _rotateY;

			var s = Math.sin((Math.PI/180)*this.rotation);//get angles
			var c = Math.cos((Math.PI/180)*this.rotation);
			var sT = Math.sin((Math.PI/180)*-this.rotation);//get reverse angles
			var cT = Math.cos((Math.PI/180)*-this.rotation);

			var x = math.subset(this.rotatePoint, math.index(0, 0)); //get position of point
			var y = math.subset(this.rotatePoint, math.index(1, 0));
			

			//rotate to original position
			this.rotatePoint = math.multiply(math.matrix([[1, 0, -x], [0, 1, -y], [0, 0, 1]]), this.rotatePoint);//translate to rotation point
			this.rotatePoint = math.multiply(math.matrix([[c, s, 0], [-s, c, 0], [0, 0, 1]]), this.rotatePoint);//rotate by new degrees
			this.rotatePoint = math.multiply(math.matrix([[1, 0, x], [0, 1, y], [0, 0, 1]]), this.rotatePoint);//translate back

			//offset by new rotate point
			this.rotatePoint = math.multiply(math.matrix([[1, 0, rotXDiff*this.zoom], [0, 1, rotYDiff*this.zoom], [0, 0, 1]]), this.rotatePoint);

			//rotate back
			this.rotatePoint = math.multiply(math.matrix([[1, 0, -x], [0, 1, -y], [0, 0, 1]]), this.rotatePoint);//translate to rotation point
			this.rotatePoint = math.multiply(math.matrix([[cT, sT, 0], [-sT, cT, 0], [0, 0, 1]]), this.rotatePoint);//rotate by new degrees
			this.rotatePoint = math.multiply(math.matrix([[1, 0, x], [0, 1, y], [0, 0, 1]]), this.rotatePoint);//translate back
		}
	}

	public getRotatePoint(){return this.rotatePoint;}
	
	public addOffset(xDif: number, yDif: number)
	{
		this.xOffset += xDif;
		this.yOffset += yDif;

		//this.matrix = math.multiply(this.matrix, math.matrix([[1, 0, xDif/this.zoom], [0, 1, yDif/this.zoom], [0, 0, 1]]));
	}

	private identityMatrix: math.Matrix; //identity matrix
	private matrix: math.Matrix; //the matrix used for transformations
	private rotatePoint: math.Matrix; //the point of rotation

	constructor()
	{
		this.identityMatrix = math.matrix([[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
		this.matrix = this.identityMatrix;
		this.rotatePoint = math.matrix([[0], [0], [1]]);
		this.zoom = 1;
		this.rotation = 0;
		this.xOffset = 0;
		this.yOffset = 0;
		this.rotateX = 0;
		this.rotateY = 0;
		//console.log(math.multiply(this.matrix, -1));
	}

	/*calculate the real matrix now*/
	public getMatrix()
	{
		return this.matrix;
	}
}