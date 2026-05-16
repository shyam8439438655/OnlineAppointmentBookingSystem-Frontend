import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { 
  LucideAngularModule, 
  Activity, Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Stethoscope 
} from 'lucide-angular';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  readonly Activity = Activity;
  readonly Mail = Mail;
  readonly Lock = Lock;
  readonly Eye = Eye;
  readonly EyeOff = EyeOff;
  readonly ArrowRight = ArrowRight;
  readonly ShieldCheck = ShieldCheck;
  readonly Stethoscope = Stethoscope;

  form = { email: '', password: '' };
  showPwd = signal(false);
  loading = signal(false);

  constructor(
    private auth: AuthService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  onSubmit() {
    if (!this.form.email || !this.form.password) {
      this.toastr.error('Please fill all fields');
      return;
    }

    this.loading.set(true);
    this.auth.login(this.form).subscribe({
      next: (res) => {
        if (res.token) {
          setTimeout(() => this.handleLoginSuccess(), 500);
        } else {
          this.toastr.error(res.message || 'Login failed');
          this.loading.set(false);
        }
      },
      error: (err) => {
        this.toastr.error(err.error?.message || 'Login failed. Please try again.');
        this.loading.set(false);
      }
    });
  }

  private handleLoginSuccess() {
    const user = this.auth.currentUser();
    if (!user) return;

    this.toastr.success(`Welcome back, ${user.fullName}!`);
    const routes: Record<string, string> = {
      'Provider': '/provider/dashboard',
      'Admin': '/admin/dashboard'
    };
    this.router.navigate([routes[user.role] || '/patient/dashboard']);
  }
}
