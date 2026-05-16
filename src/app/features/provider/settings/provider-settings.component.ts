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
  User as UserIcon, Mail, Phone, Save, Lock, Eye, EyeOff, Stethoscope, MapPin, Clock, FileText, Shield, AlertCircle 
} from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-provider-settings',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NavbarComponent, SidebarComponent, LucideAngularModule],
  templateUrl: './provider-settings.component.html'
})
export class ProviderSettingsComponent implements OnInit {
  readonly UserIcon = UserIcon;
  readonly Mail = Mail;
  readonly Phone = Phone;
  readonly Save = Save;
  readonly Lock = Lock;
  readonly Eye = Eye;
  readonly EyeOff = EyeOff;
  readonly Stethoscope = Stethoscope;
  readonly MapPin = MapPin;
  readonly Clock = Clock;
  readonly FileText = FileText;
  readonly Shield = Shield;
  readonly AlertCircle = AlertCircle;

  activeTab = signal<'profile' | 'clinic' | 'security'>('profile');
  saving = signal(false);
  savingPwd = signal(false);
  showPwd = signal(false);
  providerId = '';

  userForm = { fullName: '', email: '', phone: '' };
  providerForm = {
    specialization: '', qualification: '', experienceYears: '', bio: '',
    clinicName: '', clinicAddress: '', consultationFee: '',
  };
  pwdForm = { currentPassword: '', newPassword: '', confirmPassword: '' };

  specializations = [
    'Cardiology', 'Dermatology', 'Orthopedics', 'Neurology', 'Pediatrics',
    'Psychiatry', 'Gynecology', 'Ophthalmology', 'Dentistry', 'General Medicine',
    'ENT', 'Urology', 'Endocrinology', 'Gastroenterology', 'Pulmonology',
  ];

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    if (!this.auth.isLoggedIn() || this.auth.currentUser()?.role !== 'Provider') {
      this.router.navigate(['/login']);
      return;
    }
    const user = this.auth.currentUser();
    if (user) {
      this.userForm = {
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.phone || ''
      };
      this.fetchProviderProfile();
    }
  }

  fetchProviderProfile() {
    const user = this.auth.currentUser();
    if (!user) return;

    this.api.get<any>(`/providers/user/${user.userId}`).subscribe({
      next: (p) => {
        if (p) {
          this.providerId = p.providerId;
          this.providerForm = {
            specialization: p.specialization || '',
            qualification: p.qualification || '',
            experienceYears: p.experienceYears?.toString() || '',
            bio: p.bio || '',
            clinicName: p.clinicName || '',
            clinicAddress: p.clinicAddress || '',
            consultationFee: p.consultationFee?.toString() || '',
          };
        }
      }
    });
  }

  saveUserProfile() {
    const user = this.auth.currentUser();
    if (!user) return;

    this.saving.set(true);
    this.api.put(`/auth/${user.userId}/profile`, this.userForm).subscribe({
      next: (updatedUser: any) => {
        this.auth.setUser(updatedUser);
        this.toastr.success('Profile updated!');
        this.saving.set(false);
      },
      error: () => this.saving.set(false)
    });
  }

  saveProviderProfile() {
    const user = this.auth.currentUser();
    if (!user) return;

    this.saving.set(true);
    const data = {
      userId: user.userId,
      ...this.providerForm,
      experienceYears: parseInt(this.providerForm.experienceYears) || 0,
      consultationFee: parseFloat(this.providerForm.consultationFee) || 0.0,
    };

    if (!this.providerId) {
      this.api.post('/providers', data).subscribe({
        next: () => {
          this.toastr.success('Provider profile created!');
          this.fetchProviderProfile();
          this.saving.set(false);
        },
        error: () => this.saving.set(false)
      });
    } else {
      this.api.put(`/providers/${this.providerId}`, data).subscribe({
        next: () => {
          this.toastr.success('Clinic profile updated!');
          this.saving.set(false);
        },
        error: () => this.saving.set(false)
      });
    }
  }

  changePassword() {
    const user = this.auth.currentUser();
    if (!user) return;

    if (this.pwdForm.newPassword !== this.pwdForm.confirmPassword) {
      this.toastr.error('Passwords do not match');
      return;
    }
    this.savingPwd.set(true);
    this.api.put(`/auth/${user.userId}/password`, {
      currentPassword: this.pwdForm.currentPassword,
      newPassword: this.pwdForm.newPassword
    }).subscribe({
      next: () => {
        this.toastr.success('Password changed!');
        this.pwdForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
        this.savingPwd.set(false);
      },
      error: () => this.savingPwd.set(false)
    });
  }
}
