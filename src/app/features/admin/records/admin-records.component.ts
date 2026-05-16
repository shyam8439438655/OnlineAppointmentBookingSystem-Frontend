import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { NavbarComponent } from '@shared/components/navbar/navbar.component';
import { SidebarComponent } from '@shared/components/sidebar/sidebar.component';
import { formatDate } from '@core/utils/utils';
import { 
  LucideAngularModule, 
  FileText, Shield, Trash2 
} from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-admin-records',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, SidebarComponent, LucideAngularModule],
  templateUrl: './admin-records.component.html'
})
export class AdminRecordsComponent implements OnInit {
  readonly FileText = FileText;
  readonly Shield = Shield;
  readonly Trash2 = Trash2;

  records = signal<any[]>([]);
  loading = signal(true);

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
    this.fetchRecords();
  }

  fetchRecords() {
    this.api.get<any[]>('/records').subscribe({
      next: (res) => {
        this.records.set(res || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  handleDelete(id: string) {
    if (!confirm('Permanently delete this medical record?')) return;
    this.api.delete(`/records/${id}`).subscribe({
      next: () => {
        this.toastr.success('Record deleted');
        this.fetchRecords();
      },
      error: () => this.toastr.error('Delete failed')
    });
  }

  handleDeleteAll() {
    if (confirm('WARNING: This will delete ALL medical records. Continue?')) {
      this.api.delete('/records/deleteAll').subscribe({
        next: () => {
          this.toastr.success('All records deleted');
          this.fetchRecords();
        },
        error: () => this.toastr.error('Mass delete failed')
      });
    }
  }

  formatDate(d: string) { return formatDate(d); }
}
