import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';

import { Cat } from '../shared/models/cat.model';

//for unique users
import { AuthService } from '../services/auth.service';

@Injectable()
export class CatService {

  constructor(private http: HttpClient, private auth: AuthService) { }

  //get cats, specify the username
  getCats(): Observable<Cat[]> {
	  //console.log({"user": this.auth.currentUser.username});
    return this.http.post<Cat[]>('/api/cats', {"user": this.auth.currentUser.username});
  }

  //count the cats, specify the username
  countCats(): Observable<number> {
    return this.http.post<number>('/api/cats/count', {"user": this.auth.currentUser.username});
  }

  //Add cat, specify which user this cat belongs to
  addCat(cat: Cat): Observable<Cat> {
	  cat.user = this.auth.currentUser.username;
	  //console.log(cat);
    return this.http.post<Cat>('/api/cat', cat);
  }

  //TODO: get cat, make sure user id matches
  getCat(cat: Cat): Observable<Cat> {
    return this.http.get<Cat>(`/api/cat/${cat._id}`);
  }

  //TODO: edit cat, make sure user id matches
  editCat(cat: Cat): Observable<string> {
    return this.http.put(`/api/cat/${cat._id}`, cat, { responseType: 'text' });
  }

  //TODO: delete cat, make sure user id matches
  deleteCat(cat: Cat): Observable<string> {
    return this.http.delete(`/api/cat/${cat._id}`, { responseType: 'text' });
  }

}
