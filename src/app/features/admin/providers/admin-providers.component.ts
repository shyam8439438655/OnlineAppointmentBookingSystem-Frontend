import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { NavbarComponent } from '@shared/components/navbar/navbar.component';
import { SidebarComponent } from '@shared/components/sidebar/sidebar.component';
import { Provider } from '@core/models/models';
import { 
  LucideAngularModule, 
  Shield, CheckCircle, XCircle, Search, Mail, MapPin, Trash2 
} from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-admin-providers',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NavbarComponent, SidebarComponent, LucideAngularModule],
  templateUrl: './admin-providers.component.html'
})
export class AdminProvidersComponent implements OnInit {
  readonly Shield = Shield;
  readonly CheckCircle = CheckCircle;
  readonly XCircle = XCircle;
  readonly Search = Search;
  readonly Mail = Mail;
  readonly MapPin = MapPin;
  readonly Trash2 = Trash2;

  providers = signal<Provider[]>([]);
  loading = signal(true);
  searchTerm = signal('');
  filter = signal<'All' | 'Verified' | 'Pending'>('All');

  filteredProviders = computed(() => {
    const q = this.searchTerm().toLowerCase().trim();
    const f = this.filter();
    return this.providers().filter(p => {
      const matchesSearch = p.fullName?.toLowerCase().includes(q) || 
                          p.specialization?.toLowerCase().includes(q);
      let matchesFilter: boolean;
      if (f === 'All') {
        matchesFilter = true;
      } else if (f === 'Verified') {
        matchesFilter = p.isVerified;
      } else {
        matchesFilter = !p.isVerified;
      }
      return matchesSearch && matchesFilter;
    });
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
    this.fetchProviders();
  }

  fetchProviders() {
    this.api.get<Provider[]>('/providers').subscribe({
      next: (data) => {
        const normalized = (data || []).map(p => ({
          ...p,
          isVerified: p.isVerified ?? (p as any).verified ?? false
        }));
        this.providers.set(normalized);
        this.loading.set(false);
      },
      error: () => {
        this.toastr.error('Failed to load providers');
        this.loading.set(false);
      }
    });
  }

  toggleVerification(id: string, currentStatus: boolean) {
    this.api.put(`/providers/${id}/verify`, { isVerified: !currentStatus }).subscribe({
      next: () => {
        this.toastr.success(currentStatus ? 'Provider unverified' : 'Provider verified successfully! ✅');
        this.fetchProviders();
      },
      error: () => this.toastr.error('Verification failed')
    });
  }
  
  handleDelete(id: string) {
    if (confirm('Permanently delete this provider?')) {
      this.api.delete(`/providers/${id}`).subscribe({
        next: () => {
          this.toastr.success('Provider deleted');
          this.fetchProviders();
        },
        error: () => this.toastr.error('Delete failed')
      });
    }
  }

  handleDeleteAll() {
    if (confirm('WARNING: This will delete ALL provider profiles. Continue?')) {
      this.api.delete('/providers/deleteAll').subscribe({
        next: () => {
          this.toastr.success('All providers deleted');
          this.fetchProviders();
        },
        error: () => this.toastr.error('Mass delete failed')
      });
    }
  }
}
