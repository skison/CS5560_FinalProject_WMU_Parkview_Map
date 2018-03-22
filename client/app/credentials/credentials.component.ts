import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

//added to show current user
import { AuthService } from '../services/auth.service';

import { CredentialsService } from '../services/credentials.service';
//import { DomainService } from '../services/domain.service';
import { ToastComponent } from '../shared/toast/toast.component';
import { Credentials } from '../shared/models/credentials.model';
import { Domain } from '../shared/models/domain.model';


//var authUser = AuthService;
//alert(authUser);

@Component({
  selector: 'app-credentials',
  templateUrl: './credentials.component.html',
  styleUrls: ['./credentials.component.css']
})
export class CredentialsComponent implements OnInit {

  domain = new Domain();
  domains: Domain[] = [];
  cred = new Credentials();
  creds: Credentials[] = [];
  
  isLoading = true;
  isEditing = false;
  
  addDomainForm: FormGroup;
  domaininput = new FormControl('', Validators.required);
  
  deleteDomainForm: FormGroup;
  deletedomain = new FormControl('', [
    Validators.required
  ]);
  
  selectDomainForm: FormGroup;
  selectdomain = new FormControl('', [
    Validators.required
  ]);
  
  addCredentialsForm: FormGroup;
  //creddomain = new FormControl('', Validators.required);
  credusername = new FormControl('', Validators.required);
  credpassword = new FormControl('', Validators.required);

  constructor(/*private domainService: DomainService,*/
			  private credentialsService: CredentialsService,
              private formBuilder: FormBuilder,
              public toast: ToastComponent) { }

  ngOnInit() {
    this.getAllCredentials();
	this.getAllDomains();
    this.addCredentialsForm = this.formBuilder.group({
      //creddomain: this.creddomain,
      credusername: this.credusername,
      credpassword: this.credpassword
    });
	
	this.addDomainForm = this.formBuilder.group({
      domaininput: this.domaininput
    });
	
	this.deleteDomainForm = this.formBuilder.group({
		deletedomain: this.deletedomain
    });
	
	this.selectDomainForm = this.formBuilder.group({
		selectdomain: this.selectdomain
    });
  }

  getAllCredentials() {
    this.credentialsService.getAllCredentials().subscribe(
      data => this.creds = data,
      error => console.log(error),
      () => this.isLoading = false
    );
  }
  
  getAllDomains() {
    this.credentialsService.getAllDomains().subscribe(
      data => this.domains = data,
      error => console.log(error),
      () => this.isLoading = false
    );
  }

  addCredentials() {
	  this.addCredentialsForm.value.creddomain = this.domains[this.selectdomain.value].domaininput;
    this.credentialsService.addCredentials(this.addCredentialsForm.value).subscribe(
      res => {
		//alert(this.addCredentialsForm.value.name)
		//res.creddomain = "Yahoo.com";
		//res.creddomain = this.domains[this.selectdomain.value].domaininput;
		console.log(res);
		//added to use current username
		//alert(this.auth.currentUser.username);
        this.creds.push(res);
        this.addCredentialsForm.reset();
        this.toast.setMessage('item added successfully.', 'success');
      },
      error => console.log(error)
    );
  }
  
  addDomain() {
    this.credentialsService.addDomain(this.addDomainForm.value).subscribe(
      res => {
		//alert(this.addCredentialsForm.value.name)
		//added to use current username
		//alert(this.auth.currentUser.username);
        this.domains.push(res);
        this.addDomainForm.reset();
        this.toast.setMessage('item added successfully.', 'success');
      },
      error => console.log(error)
    );
  }

  enableEditing(cred: Credentials) {
    this.isEditing = true;
    this.cred = cred;
  }

  cancelEditing() {
    this.isEditing = false;
    this.cred = new Credentials();
    this.toast.setMessage('item editing cancelled.', 'warning');
    // reload the credentials to reset the editing
    this.getAllCredentials();
  }

  editCredentials(cred: Credentials) {
    this.credentialsService.editCredentials(cred).subscribe(
      () => {
        this.isEditing = false;
        this.cred = cred;
        this.toast.setMessage('item edited successfully.', 'success');
      },
      error => console.log(error)
    );
  }

  deleteCredentials(cred: Credentials) {
    if (window.confirm('Are you sure you want to permanently delete these credentials?')) {
      this.credentialsService.deleteCredentials(cred).subscribe(
        () => {
          const pos = this.creds.map(elem => elem._id).indexOf(cred._id);
          this.creds.splice(pos, 1);
          this.toast.setMessage('credentials deleted successfully.', 'success');
        },
        error => console.log(error)
      );
    }
  }
  
  toggleShow(cred: Credentials) {
	  if(!this.creds[this.creds.map(elem => elem._id).indexOf(cred._id)].hasOwnProperty('showing')){
		  this.creds[this.creds.map(elem => elem._id).indexOf(cred._id)]['showing'] = true;
	  }
	  else{
		  this.creds[this.creds.map(elem => elem._id).indexOf(cred._id)]['showing'] = !this.creds[this.creds.map(elem => elem._id).indexOf(cred._id)]['showing'];
	  }
	  //alert("toggled " + cred._id + "; showing? " + this.creds[this.creds.map(elem => elem._id).indexOf(cred._id)].showing);
	  //console.log(this.creds[this.creds.map(elem => elem._id).indexOf(cred._id)].showing);
  }
  
  
  
  
  deleteDomain(domain: Domain) {
	  console.log(domain);
    if (window.confirm('Are you sure you want to permanently delete ' + domain.domaininput + '?')) {
      this.credentialsService.deleteDomain(domain).subscribe(
        () => {
          const pos = this.domains.map(elem => elem._id).indexOf(domain._id);
          this.domains.splice(pos, 1);
		  
		  //store reference to parent variables
		  var parent = this;
		  
		  //copy array to iterate through properly
		  var credsTemp = this.creds.slice();
		  
		  //remove credentials with same creddomain from local storage(not NECESSARY, but otherwise would require refreshing the page)
		  credsTemp.forEach(function(newCred){
			 //console.log(newCred); 
			 if(newCred.creddomain == domain.domaininput)
			 {
				 //console.log("Equals!"); 
				 /*remove these credentials from storage*/
				 const pos = parent.creds.map(elem => elem._id).indexOf(newCred._id);
				 parent.creds.splice(pos, 1);
			 }
		  });
		  
          this.toast.setMessage('domain deleted successfully.', 'success');
        },
        error => console.log(error)
      );
    }
  }
  
  valExists(val) { return val != null; }

}
