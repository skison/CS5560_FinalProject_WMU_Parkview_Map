import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

import { UserService } from '../services/user.service';
import { ToastComponent } from '../shared/toast/toast.component';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html'
})
export class RegisterComponent implements OnInit {

  registerForm: FormGroup;
  firstname = new FormControl('', [
    Validators.required,
    Validators.minLength(2),
    Validators.maxLength(50)
  ]);
  lastname = new FormControl('', [
    Validators.required,
    Validators.minLength(2),
    Validators.maxLength(50)
  ]);
  username = new FormControl('', [
    Validators.required,
    Validators.minLength(2),
    Validators.maxLength(50),
    Validators.pattern('[a-zA-Z0-9_-\\s]*')
  ]);
  email = new FormControl('', [
    Validators.required,
    Validators.minLength(3),
    Validators.maxLength(100)
  ]);
  password = new FormControl('', [
    Validators.required,
    Validators.minLength(4)
  ]);

  constructor(private formBuilder: FormBuilder,
              private router: Router,
              public toast: ToastComponent,
              private userService: UserService) { }

  ngOnInit() {
    this.registerForm = this.formBuilder.group({
	  firstname: this.firstname,
	  lastname: this.lastname,
      username: this.username,
      email: this.email,
      password: this.password
    });
  }

  setClassFirstname() {
    return { 'has-danger': !this.firstname.pristine && !this.firstname.valid };
  }
  
  setClassLastname() {
    return { 'has-danger': !this.lastname.pristine && !this.lastname.valid };
  }
  
  setClassUsername() {
    return { 'has-danger': !this.username.pristine && !this.username.valid };
  }

  setClassEmail() {
    return { 'has-danger': !this.email.pristine && !this.email.valid };
  }

  setClassPassword() {
    return { 'has-danger': !this.password.pristine && !this.password.valid };
  }

  register() {
    this.userService.register(this.registerForm.value).subscribe(
      res => {
        this.toast.setMessage('you successfully registered!', 'success');
        this.router.navigate(['/login']);
      },
      error => this.toast.setMessage('username already exists', 'danger')
    );
  }
}
