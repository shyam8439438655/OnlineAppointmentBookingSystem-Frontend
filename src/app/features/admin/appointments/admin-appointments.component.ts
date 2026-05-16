import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { NavbarComponent } from '@shared/components/navbar/navbar.component';
import { SidebarComponent } from '@shared/components/sidebar/sidebar.component';
import { formatDate, formatTime, getStatusColor } from '@core/utils/utils';
import { 
  LucideAngularModule, 
  Calendar, Search, Trash2 
} from 'lucide-angular';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-admin-appointments',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NavbarComponent, SidebarComponent, LucideAngularModule],
  templateUrl: './admin-appointments.component.html'
})
export class AdminAppointmentsComponent implements OnInit {
  readonly CalendarIcon = Calendar;
  readonly SearchIcon = Search;
  readonly Trash2 = Trash2;

  appointments = signal<any[]>([]);
  loading = signal(true);
  search = signal('');
  filter = signal('All');
  statusFilters = ['All', 'Scheduled', 'Completed', 'Cancelled', 'No-Show'];

  filteredAppointments = computed(() => {
    const q = this.search().toLowerCase().trim();
    const f = this.filter();
    return this.appointments().filter(a => {
      const matchFilter = f === 'All' || a.status?.toUpperCase() === f.toUpperCase();
      const matchSearch = !q || a.serviceType?.toLowerCase().includes(q) ||
        a.patientId?.includes(q) || a.providerId?.includes(q);
      return matchFilter && matchSearch;
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
    this.fetchAll();
  }

  fetchAll() {
    this.loading.set(true);
    forkJoin({
      appts: this.api.get<any[]>('/appointments').pipe(catchError(() => of([]))),
      users: this.api.get<any[]>('/auth/users').pipe(catchError(() => of([]))),
      providers: this.api.get<any[]>('/providers').pipe(catchError(() => of([])))
    }).subscribe({
      next: (res) => {
        const users = Array.isArray(res.users) ? res.users : [];
        const providers = Array.isArray(res.providers) ? res.providers : [];
        const allAppts = Array.isArray(res.appts) ? res.appts : [];

        const validAppts = allAppts;

        const mapped = validAppts.map(a => ({
          ...a,
          patientName: users.find(u => u.userId === a.patientId)?.fullName || 'Patient',
          providerName: providers.find(p => p.providerId === a.providerId)?.fullName || 'Doctor'
        }));

        mapped.sort((a, b) => {
          const dateA = a.appointmentDate ? new Date(a.appointmentDate).getTime() : 0;
          const dateB = b.appointmentDate ? new Date(b.appointmentDate).getTime() : 0;
          return dateB - dateA;
        });
        this.appointments.set(mapped);
        this.loading.set(false);
      },
      error: () => {
        this.toastr.error('Failed to load appointments data');
        this.loading.set(false);
      }
    });
  }

  handleDelete(id: string) {
    if (confirm('Permanently delete this appointment?')) {
      this.api.delete(`/appointments/${id}`).subscribe({
        next: () => {
          this.toastr.success('Appointment deleted');
          this.fetchAll();
        },
        error: () => this.toastr.error('Delete failed')
      });
    }
  }

  handleDeleteAll() {
    if (confirm('WARNING: This will delete ALL appointment records. Continue?')) {
      this.api.delete('/appointments/deleteAll').subscribe({
        next: () => {
          this.toastr.success('All appointments deleted');
          this.fetchAll();
        },
        error: () => this.toastr.error('Mass delete failed')
      });
    }
  }

  formatDate(d: string) { return formatDate(d); }
  formatTime(t: string) { return formatTime(t); }
  getStatusColor(s: string) { return getStatusColor(s); }
}
