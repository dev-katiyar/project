// filepath: /Users/user/devwork/website-A11/src/app/services/announcement.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Announcement {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  active: boolean;
  dismissible: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AnnouncementService {
  private announcementSubject = new BehaviorSubject<Announcement | null>(null);
  announcement$ = this.announcementSubject.asObservable();

  private dismissedIds: Set<string> = new Set();

  get currentAnnouncement(): Announcement | null {
    return this.announcementSubject.value;
  }

  setAnnouncement(announcement: Announcement): void {
    if (announcement.active && !this.dismissedIds.has(announcement.id)) {
      this.announcementSubject.next(announcement);
    }
  }

  updateAnnouncement(updates: Partial<Announcement>): void {
    const current = this.announcementSubject.value;
    if (current) {
      this.announcementSubject.next({ ...current, ...updates });
      // TODO: Call your API to persist the changes
      // this.http.put(`/api/announcements/${current.id}`, { ...current, ...updates }).subscribe();
    }
  }

  createNewAnnouncement(): void {
    const newAnnouncement: Announcement = {
      id: Date.now().toString(),
      message: 'Click to edit this announcement...',
      type: 'info',
      active: true,
      dismissible: true
    };
    this.announcementSubject.next(newAnnouncement);
  }

  clearAnnouncement(): void {
    this.announcementSubject.next(null);
  }

  dismissAnnouncement(id: string): void {
    this.dismissedIds.add(id);
    this.announcementSubject.next(null);
  }

  deleteAnnouncement(): void {
    const current = this.announcementSubject.value;
    if (current) {
      // TODO: Call your API to delete
      // this.http.delete(`/api/announcements/${current.id}`).subscribe();
      this.announcementSubject.next(null);
    }
  }
}