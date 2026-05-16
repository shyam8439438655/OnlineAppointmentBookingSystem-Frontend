import { Injectable, signal } from '@angular/core';
import { ApiService } from './api.service';
import { User, AuthResponse } from '../models/models';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  currentUser = signal<User | null>(null);

  constructor(private api: ApiService, private router: Router) {
    this.loadUser();
  }

  private loadUser() {
    const userStr = localStorage.getItem('medibook_user');
    if (userStr) {
      try {
        this.currentUser.set(JSON.parse(userStr));
      } catch (e) {
        localStorage.removeItem('medibook_user');
      }
    }
  }

  login(credentials: any): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/auth/login', credentials).pipe(
      tap(res => {
        if (res.token) {
          localStorage.setItem('medibook_token', res.token);
          // If role/id are in res, we might need a separate call to get full user profile
          // For now, let's assume we fetch user after login if needed
          this.fetchAndSetUser(res.email || credentials.email);
        }
      })
    );
  }

  loginWithOAuth(email: string, name: string, provider: string): Observable<AuthResponse> {
    return this.api.post<AuthResponse>(`/auth/oauth/success?email=${email}&name=${name}&provider=${provider}`, {}).pipe(
      tap(res => {
        if (res.token) {
          localStorage.setItem('medibook_token', res.token);
          this.fetchAndSetUser(email);
        }
      })
    );
  }

  private fetchAndSetUser(email: string) {
    this.api.get<User>(`/auth/user/email/${email}`).subscribe(user => {
      if (user.role === 'Provider') {
        this.api.get<any>(`/providers/user/${user.userId}`).subscribe(p => {
          if (p) user.providerId = p.providerId;
          this.setUser(user);
        });
      } else {
        this.setUser(user);
      }
    });
  }

  register(data: any): Observable<any> {
    return this.api.post('/auth/register', data);
  }

  logout() {
    localStorage.removeItem('medibook_token');
    localStorage.removeItem('medibook_user');
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('medibook_token');
  }

  setUser(user: User, token?: string) {
    if (token) localStorage.setItem('medibook_token', token);
    localStorage.setItem('medibook_user', JSON.stringify(user));
    this.currentUser.set(user);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getRole(): string | null {
    return this.currentUser()?.role || null;
  }
}
