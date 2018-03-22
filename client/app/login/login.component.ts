import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

import { AuthService } from '../services/auth.service';
import { ToastComponent } from '../shared/toast/toast.component';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html'
})
export class LoginComponent implements OnInit {

  loginForm: FormGroup;
  username = new FormControl('', [
    Validators.required,
    Validators.minLength(2),
    Validators.maxLength(50)
  ]);
  password = new FormControl('', [
    Validators.required
  ]);

  constructor(private auth: AuthService,
              private formBuilder: FormBuilder,
              private router: Router,
              public toast: ToastComponent) { }

  ngOnInit() {
    if (this.auth.loggedIn) {
      this.router.navigate(['/']);
    }
    this.loginForm = this.formBuilder.group({
      username: this.username,
      password: this.password
    });
  }

  setClassUsername() {
    return { 'has-danger': !this.username.pristine && !this.username.valid };
  }

  setClassPassword() {
    return { 'has-danger': !this.password.pristine && !this.password.valid };
  }

  login() {
    this.auth.login(this.loginForm.value).subscribe(
      res => this.router.navigate(['/']),
      error => this.toast.setMessage('invalid username or password!', 'danger')
    );
  }

}
