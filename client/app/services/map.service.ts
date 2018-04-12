import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';

import MapVertex from '../../../shared/models/mapvertex';
import MapEdge from '../../../shared/models/mapedge';
import MapImage from '../../../shared/models/mapImage';
import DijkstraMapVertex from '../../../shared/models/dijkstramapvertex';

@Injectable()
export class MapService {

  constructor(private http: HttpClient) { }

  
  getMapVertices(): Observable<MapVertex[]>{
	  return this.http.post<MapVertex[]>('/api/getvertices', {});
  }
  
  getMapEdges(): Observable<MapEdge[]>{
	  return this.http.post<MapEdge[]>('/api/getedges', {});
  }

  getMapImages(): Observable<MapImage[]>{
	  return this.http.post<MapImage[]>('/api/getmapimages', {});
  }
  
  getPath(startID: number, endID: number): Observable<DijkstraMapVertex[]>{
	  return this.http.get<DijkstraMapVertex[]>(`/api/getpath?startID=${startID}&endID=${endID}`, {});
  }
  
}
