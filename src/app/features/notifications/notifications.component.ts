import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { NavbarComponent } from '@shared/components/navbar/navbar.component';
import { SidebarComponent } from '@shared/components/sidebar/sidebar.component';
import { Notification } from '@core/models/models';
import { formatDate } from '@core/utils/utils';
import { 
  LucideAngularModule, 
  Bell, CheckCheck, Trash2, Calendar, CreditCard, AlertCircle, Clock, Activity, Send, Users, User, ChevronDown
} from 'lucide-angular';
import { of, forkJoin } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NavbarComponent, SidebarComponent, LucideAngularModule],
  templateUrl: './notifications.component.html'
})
export class NotificationsComponent implements OnInit {
  readonly Bell = Bell;
  readonly CheckCheck = CheckCheck;
  readonly Trash2 = Trash2;
  readonly Clock = Clock;
  readonly Send = Send;
  readonly Users = Users;
  readonly User = User;
  readonly ChevronDown = ChevronDown;

  notifications = signal<Notification[]>([]);
  apiUnreadCount = signal(0);
  loading = signal(true);

  // Admin broadcast panel
  showBroadcast = signal(false);
  sendingAlert = signal(false);
  broadcastForm = {
    target: 'ALL',        // ALL | PATIENTS | PROVIDERS | SPECIFIC
    recipientId: '',      // used when target = SPECIFIC
    type: 'REMINDER',
    channel: 'APP',
    title: '',
    message: ''
  };

  typeConfig: Record<string, { icon: any; color: string; bg: string }> = {
    BOOKING: { icon: Calendar, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100' },
    REMINDER: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
    CANCELLATION: { icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-100' },
    PAYMENT: { icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
    FOLLOWUP: { icon: Activity, color: 'text-teal-600', bg: 'bg-teal-50 border-teal-100' },
  };

  unreadCount = computed(() => this.notifications().filter(n => !n.isRead).length);

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
    this.fetchNotifications();
  }

  fetchNotifications() {
    const user = this.auth.currentUser();
    if (!user) return;

    this.loading.set(true);
    
    // Get basic userId request
    const userReq = this.api.get<Notification[]>(`/notifications/recipient/${user.userId}`).pipe(catchError(() => of([])));
    
    // Check if we need to fetch providerId first (Provider role)
    if (user.role === 'Provider' && !user.providerId) {
      this.api.get<any>(`/providers/user/${user.userId}`).subscribe(p => {
        if (p) {
          user.providerId = p.providerId;
          this.auth.setUser(user);
        }
        this.executeFetch([userReq, this.api.get<Notification[]>(`/notifications/recipient/${user.providerId}`).pipe(catchError(() => of([])))]);
      });
    } else {
      const requests = [userReq];
      if (user.role === 'Provider' && user.providerId) {
        requests.push(this.api.get<Notification[]>(`/notifications/recipient/${user.providerId}`).pipe(catchError(() => of([]))));
      }
      // Admin: ALSO fetch notifications stored under static "admin" recipientId
      // (payment received, refund requests, etc. all use "admin" as recipientId)
      if (user.role === 'Admin') {
        requests.push(this.api.get<Notification[]>(`/notifications/recipient/admin`).pipe(catchError(() => of([]))));
      }
      this.executeFetch(requests);
    }
  }

  private executeFetch(requests: any[]) {
    forkJoin(requests as any).subscribe({
      next: (responses: any) => {
        // Deduplicate by notificationId in case same notification appears in multiple fetches
        const allNotifs = ([] as any[]).concat(...responses);
        const seen = new Set<string>();
        const combined = allNotifs.filter(n => {
          if (seen.has(n.notificationId)) return false;
          seen.add(n.notificationId);
          return true;
        }).sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

        this.notifications.set(combined);
        
        // SYNC: Get actual unread count from API
        const user = this.auth.currentUser();
        if (user) {
          this.api.get<number>(`/notifications/recipient/${user.userId}/unread-count`).subscribe(c => {
            if (user.role === 'Provider' && user.providerId) {
              this.api.get<number>(`/notifications/recipient/${user.providerId}/unread-count`).subscribe(pc => {
                this.apiUnreadCount.set(c + pc);
              });
            } else if (user.role === 'Admin') {
              // Also count unread from static "admin" bucket
              this.api.get<number>(`/notifications/recipient/admin/unread-count`).subscribe(ac => {
                this.apiUnreadCount.set(c + ac);
              });
            } else {
              this.apiUnreadCount.set(c);
            }
          });
        }
        
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  markAllRead() {
    const user = this.auth.currentUser();
    if (!user) return;

    const requests = [this.api.put(`/notifications/recipient/${user.userId}/read-all`, {})];
    if (user.role === 'Provider' && user.providerId) {
      requests.push(this.api.put(`/notifications/recipient/${user.providerId}/read-all`, {}));
    }
    // Admin: also mark the static "admin" bucket as read
    if (user.role === 'Admin') {
      requests.push(this.api.put(`/notifications/recipient/admin/read-all`, {}));
    }

    forkJoin(requests as any).subscribe({
      next: () => {
        this.notifications.set(this.notifications().map(n => ({ ...n, isRead: true })));
        this.toastr.success('All notifications marked as read');
      }
    });
  }

  sendAlert() {
    const f = this.broadcastForm;
    if (!f.title || !f.message) { this.toastr.error('Title and message are required'); return; }
    this.sendingAlert.set(true);

    if (f.target === 'SPECIFIC') {
      if (!f.recipientId.trim()) { this.toastr.error('Recipient ID is required'); this.sendingAlert.set(false); return; }
      this.api.post('/notifications/send', {
        recipientId: f.recipientId.trim(),
        type: f.type,
        title: f.title,
        message: f.message,
        channel: f.channel,
        isRead: false
      }).subscribe({
        next: () => { this.toastr.success('Notification sent!'); this.resetForm(); },
        error: () => { this.toastr.error('Failed to send'); this.sendingAlert.set(false); }
      });
    } else {
      // Fetch all users then filter by role
      this.api.get<any[]>('/auth/users').pipe(catchError(() => of([]))).subscribe(users => {
        let targets: string[] = [];
        if (f.target === 'ALL') {
          targets = users.map((u: any) => u.userId);
          targets.push('admin'); // include admin bucket too
        } else if (f.target === 'PATIENTS') {
          targets = users.filter((u: any) => u.role === 'Patient').map((u: any) => u.userId);
        } else if (f.target === 'PROVIDERS') {
          targets = users.filter((u: any) => u.role === 'Provider').map((u: any) => u.userId);
        }
        if (targets.length === 0) { this.toastr.warning('No recipients found'); this.sendingAlert.set(false); return; }
        this.api.post('/notifications/bulk', {
          recipientIds: targets,
          type: f.type,
          title: f.title,
          message: f.message,
          channel: f.channel
        }).subscribe({
          next: () => { this.toastr.success(`Alert sent to ${targets.length} recipients!`); this.resetForm(); },
          error: () => { this.toastr.error('Failed to send bulk alert'); this.sendingAlert.set(false); }
        });
      });
    }
  }

  resetForm() {
    this.broadcastForm = { target: 'ALL', recipientId: '', type: 'REMINDER', channel: 'APP', title: '', message: '' };
    this.showBroadcast.set(false);
    this.sendingAlert.set(false);
    this.fetchNotifications();
  }

  markRead(n: Notification) {
    if (n.isRead) return;
    this.api.put(`/notifications/${n.notificationId}/read`, {}).subscribe({
      next: () => {
        this.notifications.set(this.notifications().map(x => 
          x.notificationId === n.notificationId ? { ...x, isRead: true } : x
        ));
      }
    });
  }

  deleteNotif(id: string) {
    this.api.delete(`/notifications/${id}`).subscribe({
      next: () => {
        this.notifications.set(this.notifications().filter(n => n.notificationId !== id));
      }
    });
  }

  getConfig(type: string) {
    return this.typeConfig[type] || this.typeConfig['BOOKING'];
  }

  formatDate(d: string) { return formatDate(d); }
}
