import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { NavbarComponent } from '@shared/components/navbar/navbar.component';
import { SidebarComponent } from '@shared/components/sidebar/sidebar.component';
import { 
  LucideAngularModule, 
  User as UserIcon, Mail, Phone, Shield, Save, Lock, Eye, EyeOff 
} from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-patient-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NavbarComponent, SidebarComponent, LucideAngularModule],
  templateUrl: './patient-profile.component.html'
})
export class PatientProfileComponent implements OnInit {
  readonly UserIcon = UserIcon;
  readonly Mail = Mail;
  readonly Phone = Phone;
  readonly Shield = Shield;
  readonly Save = Save;
  readonly Lock = Lock;
  readonly Eye = Eye;
  readonly EyeOff = EyeOff;

  activeTab = signal<'profile' | 'security'>('profile');
  saving = signal(false);
  savingPwd = signal(false);
  showPwd = signal(false);

  form = { fullName: '', email: '', phone: '' };
  pwdForm = { currentPassword: '', newPassword: '', confirmPassword: '' };

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    const user = this.auth.currentUser();
    if (user) {
      this.form = {
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.phone || ''
      };
    }
  }

  saveProfile() {
    const user = this.auth.currentUser();
    if (!user) return;

    this.saving.set(true);
    this.api.put(`/auth/${user.userId}/profile`, this.form).subscribe({
      next: (updatedUser: any) => {
        this.auth.setUser(updatedUser);
        this.toastr.success('Profile updated successfully!');
        this.saving.set(false);
      },
      error: (err) => {
        this.toastr.error(err.error?.message || 'Update failed');
        this.saving.set(false);
      }
    });
  }

  changePassword() {
    if (!this.pwdForm.currentPassword || !this.pwdForm.newPassword) {
      this.toastr.error('Fill all password fields');
      return;
    }
    if (this.pwdForm.newPassword !== this.pwdForm.confirmPassword) {
      this.toastr.error('Passwords do not match');
      return;
    }
    if (this.pwdForm.newPassword.length < 6) {
      this.toastr.error('Password must be at least 6 characters');
      return;
    }

    const user = this.auth.currentUser();
    if (!user) return;

    this.savingPwd.set(true);
    this.api.put(`/auth/${user.userId}/password`, {
      currentPassword: this.pwdForm.currentPassword,
      newPassword: this.pwdForm.newPassword
    }).subscribe({
      next: () => {
        this.toastr.success('Password changed successfully!');
        this.pwdForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
        this.savingPwd.set(false);
      },
      error: (err) => {
        this.toastr.error(err.error?.message || 'Password change failed');
        this.savingPwd.set(false);
      }
    });
  }
}
