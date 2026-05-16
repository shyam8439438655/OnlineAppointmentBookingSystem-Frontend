import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { 
  LucideAngularModule, 
  User, Mail, Lock, UserCircle, ShieldCheck, Stethoscope, Phone, Activity, Eye, EyeOff, ArrowRight 
} from 'lucide-angular';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
  templateUrl: './register.component.html'
})
export class RegisterComponent {
  readonly User = User;
  readonly Mail = Mail;
  readonly Lock = Lock;
  readonly UserCircle = UserCircle;
  readonly ShieldCheck = ShieldCheck;
  readonly Stethoscope = Stethoscope;
  readonly Phone = Phone;
  readonly Activity = Activity;
  readonly Eye = Eye;
  readonly EyeOff = EyeOff;
  readonly ArrowRight = ArrowRight;

  form = {
    fullName: '',
    email: '',
    password: '',
    phone: '',
    role: 'Patient' as 'Patient' | 'Provider' | 'Admin',
  };
  loading = signal(false);
  showPwd = signal(false);

  constructor(
    private auth: AuthService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  onSubmit() {
    if (!this.form.phone) {
      this.toastr.error('Phone number is required');
      return;
    }
    this.loading.set(true);
    this.auth.register(this.form).subscribe({
      next: () => {
        this.toastr.success('Registration successful! Please login.');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.toastr.error(err.error?.message || 'Registration failed');
        this.loading.set(false);
      }
    });
  }

  setRole(role: 'Patient' | 'Provider' | 'Admin') {
    this.form.role = role;
  }
}
