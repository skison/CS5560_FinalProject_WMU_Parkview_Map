import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';

import { Vertex } from '../shared/models/vertex.model';
import { Edge } from '../shared/models/edge.model';

@Injectable()
export class MapService {

  constructor(private http: HttpClient) { }

  
  getMapVertices(): Observable<Vertex[]>{
	  return this.http.post<Vertex[]>('/api/getvertices', {});
  }
  
  getMapEdges(): Observable<Edge[]>{
	  return this.http.post<Edge[]>('/api/getedges', {});
  }
}
