import MapVertex from './mapvertex';

//wrapper for mapVertex objects which allows for calculations with Dijkstra's algorithm
export default class DijkstraMapVertex{
	private totalDistance: number; //total distance from start node to this node. Starts at infinity and reduces from there
	private minDistanceFound: boolean; //set to true when this edge no longer needs to be traveled
	private parentID: number; //id of the vertex that came before (used to trace path throughout algorithm)
	public vertex: MapVertex; //the vertex that this wraps around
	
	constructor(_vertex: MapVertex)
	{
		//console.log("Constructing DijkstraMapVertex");
		this.vertex = _vertex;
		this.totalDistance = Infinity; //init totalDistance to max possible
		this.parentID = -1; //init parent ID to invalid number (negative means no parent node)
		this.minDistanceFound = false; //init boolean to false, must be made true through the algorithm
	}
	
	//getters and setters for this DijkstraMapVertex
	public getTotalDistance(){return this.totalDistance;}
	public setTotalDistance(newVal: number){this.totalDistance = newVal;}
	public getMinDistanceFound(){return this.minDistanceFound;}
	public setMinDistanceFound(newVal: boolean){this.minDistanceFound = newVal;}
	public getParentID(){return this.parentID;}
	public setParentID(newVal: number){this.parentID = newVal;}
	
	//getters for vertex values
	public get_ID(){return this.vertex._id;}
	public getID(){return this.vertex.id;}
	public getXPos(){return this.vertex.xPos;}
	public getYPos(){return this.vertex.yPos;}
	public getFloor(){return this.vertex.floor;}
}