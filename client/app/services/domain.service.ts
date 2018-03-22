/*import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';

import { Domain } from '../shared/models/domain.model';

//for unique users
import { AuthService } from '../services/auth.service';

@Injectable()
export class DomainService {

  constructor(private http: HttpClient, private auth: AuthService) { }

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
    return this.http.get<Domain>(`/api/domains/${domain._id}`);
  }

  //TODO: delete domain, make sure user id matches
  deleteDomain(domain: Domain): Observable<Domain> {
	  var data = { owner: domain.owner, creddomain: domain.domaininput };
    return this.http.delete(`/api/domains/${domain._id}`, {params: {userId: "LOLEEEELOL"}});
  }

}
*/