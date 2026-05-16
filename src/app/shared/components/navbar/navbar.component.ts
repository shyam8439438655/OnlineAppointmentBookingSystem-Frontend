import { Component, signal, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { ApiService } from '@core/services/api.service';
import { getInitials } from '@core/utils/utils';
import { 
  LucideAngularModule, 
  Bell, 
  LogOut, 
  Menu, 
  X, 
  Activity 
} from 'lucide-angular';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './navbar.component.html'
})
export class NavbarComponent implements OnDestroy {
  readonly Bell = Bell;
  readonly LogOut = LogOut;
  readonly Menu = Menu;
  readonly X = X;
  readonly Activity = Activity;

  mobileOpen = signal(false);
  unreadCount = signal(0);
  interval: any;

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private router: Router
  ) {
    effect(() => {
      const user = this.auth.currentUser();
      if (user) {
        this.startNotificationPolling();
      } else {
        this.stopNotificationPolling();
      }
    });
  }

  ngOnDestroy() {
    this.stopNotificationPolling();
  }

  startNotificationPolling() {
    this.stopNotificationPolling(); // Safety
    this.fetchUnreadCount();
    this.interval = setInterval(() => this.fetchUnreadCount(), 15000);
  }

  stopNotificationPolling() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  fetchUnreadCount() {
    const user = this.auth.currentUser();
    if (!user) return;

    if (user.role === 'Provider' && !user.providerId) {
      this.api.get<any>(`/providers/user/${user.userId}`).subscribe(p => {
        if (p) {
          user.providerId = p.providerId;
          this.auth.setUser(user);
          this.executeUnreadCountFetch(user);
        }
      });
    } else {
      this.executeUnreadCountFetch(user);
    }
  }

  private executeUnreadCountFetch(user: any) {
    this.api.get<number>(`/notifications/recipient/${user.userId}/unread-count`).subscribe({
      next: (count) => {
        if (user.role === 'Provider' && user.providerId) {
          this.api.get<number>(`/notifications/recipient/${user.providerId}/unread-count`).subscribe(pc => {
            this.unreadCount.set(count + pc);
          });
        } else if (user.role === 'Admin') {
          this.api.get<number>(`/notifications/recipient/admin/unread-count`).subscribe(ac => {
            this.unreadCount.set(count + ac);
          });
        } else {
          this.unreadCount.set(count);
        }
      },
      error: () => {}
    });
  }

  get dashboardHref(): string {
    const role = this.auth.currentUser()?.role;
    if (role === 'Provider') return '/provider/dashboard';
    if (role === 'Admin') return '/admin/dashboard';
    return '/patient/dashboard';
  }

  toggleMobile() {
    this.mobileOpen.update(v => !v);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/']);
  }

  getInitials(name: string) {
    return getInitials(name);
  }
}
