import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { NavbarComponent } from '@shared/components/navbar/navbar.component';
import { SidebarComponent } from '@shared/components/sidebar/sidebar.component';
import { User } from '@core/models/models';
import { 
  LucideAngularModule, 
  Users, Search, UserMinus, UserCheck, Mail, ShieldAlert 
} from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NavbarComponent, SidebarComponent, LucideAngularModule],
  templateUrl: './admin-users.component.html'
})
export class AdminUsersComponent implements OnInit {
  readonly UsersIcon = Users;
  readonly SearchIcon = Search;
  readonly UserMinus = UserMinus;
  readonly UserCheck = UserCheck;
  readonly Mail = Mail;
  readonly ShieldAlert = ShieldAlert;

  users = signal<User[]>([]);
  loading = signal(true);
  searchTerm = signal('');

  filteredUsers = computed(() => {
    const q = this.searchTerm().toLowerCase().trim();
    return this.users().filter(u => 
      u.fullName?.toLowerCase().includes(q) || 
      u.email.toLowerCase().includes(q)
    );
  });

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    if (!this.auth.isLoggedIn() || this.auth.currentUser()?.role !== 'Admin') {
      this.router.navigate(['/login']);
      return;
    }
    this.fetchUsers();
  }

  fetchUsers() {
    this.api.get<User[]>('/auth/users').subscribe({
      next: (data) => {
        const normalized = (data || []).map(u => ({
          ...u,
          isActive: u.isActive ?? (u as any).active ?? false
        }));
        this.users.set(normalized);
        this.loading.set(false);
      },
      error: () => {
        this.toastr.error('Failed to load users');
        this.loading.set(false);
      }
    });
  }

  handleSuspend(userId: string, active: boolean) {
    const action = active ? 'deactivate' : 'activate';
    this.api.put(`/auth/${action}/${userId}`, {}).subscribe({
      next: () => {
        this.toastr.success(`User account ${action}ed`);
        this.fetchUsers();
      },
      error: () => this.toastr.error('Operation failed')
    });
  }

  handleDelete(userId: string) {
    if (confirm('Are you sure you want to permanently delete this user?')) {
      this.api.delete(`/auth/user/${userId}`).subscribe({
        next: () => {
          this.toastr.success('User deleted successfully');
          this.fetchUsers();
        },
        error: () => this.toastr.error('Delete failed')
      });
    }
  }

  handleDeleteAll() {
    const admin = this.auth.currentUser();
    if (!admin) return;
    if (confirm('WARNING: This will delete ALL users except you. Continue?')) {
      this.api.delete(`/auth/deleteAll?excludeId=${admin.userId}`).subscribe({
        next: () => {
          this.toastr.success('All users deleted');
          this.fetchUsers();
        },
        error: () => this.toastr.error('Mass delete failed')
      });
    }
  }

  formatDate(date?: string) {
    return date ? new Date(date).toLocaleDateString() : '—';
  }
}
