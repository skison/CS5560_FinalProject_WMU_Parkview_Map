import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';

import { Credentials } from '../shared/models/credentials.model';

import { Domain } from '../shared/models/domain.model';

//for unique users
import { AuthService } from '../services/auth.service';

@Injectable()
export class CredentialsService {

  constructor(private http: HttpClient, private auth: AuthService) { }

  //get credentials, specify the username
  getAllCredentials(): Observable<Credentials[]> {
	  //console.log({"user": this.auth.currentUser.username});
    return this.http.post<Credentials[]>('/api/credentials', {"owner": this.auth.currentUser.username});
  }

  //count the credentials, specify the username
  countCredentials(): Observable<number> {
    return this.http.post<number>('/api/credentials/count', {"owner": this.auth.currentUser.username});
  }

  //Add credentials, specify which user these credentials belong to
  addCredentials(cred: Credentials): Observable<Credentials> {
	  cred.owner = this.auth.currentUser.username;
	  console.log(cred);
    return this.http.post<Credentials>('/api/credentials/insert', cred);
  }

  //TODO: get credentials, make sure user id matches
  getCredentials(cred: Credentials): Observable<Credentials> {
    return this.http.get<Credentials>(`/api/credentials/get/${cred._id}`);
  }

  //TODO: edit credentials, make sure user id matches
  editCredentials(cred: Credentials): Observable<string> {
    return this.http.put(`/api/credentials/update/${cred._id}`, cred, { responseType: 'text' });
  }

  //TODO: delete credentials, make sure user id matches
  deleteCredentials(cred: Credentials): Observable<string> {
    return this.http.delete(`/api/credentials/delete/${cred._id}`, { responseType: 'text' });
  }
  
  
  
  //get all domains, specify the username
  getAllDomains(): Observable<Domain[]> {
	  //console.log({"user": this.auth.currentUser.username});
    return this.http.post<Domain[]>('/api/domains', {"owner": this.auth.currentUser.username});
  }

  //count the domains, specify the username
  countDomains(): Observable<number> {
    return this.http.post<number>('/api/domains/count', {"owner": this.auth.currentUser.username});
  }

  //Add domain, specify which user these domains belong to
  addDomain(domain: Domain): Observable<Domain> {
	  domain.owner = this.auth.currentUser.username;
	  //console.log(cred);
    return this.http.post<Domain>('/api/domains/insert', domain);
  }

  //TODO: get domain, make sure user id matches
  getDomain(domain: Domain): Observable<Domain> {
    return this.http.get<Domain>(`/api/domains/get/${domain._id}`);
  }

  //TODO: delete domain, make sure user id matches
  deleteDomain(domain: Domain): Observable<string> {
	  console.log(domain);
	  //var data = { owner: domain.owner, creddomain: domain.domaininput };
    return this.http.delete(`/api/domains/delete/${domain._id}`, {params: {owner: domain.owner, creddomain: domain.domaininput}, responseType: 'text'});
  }

}
