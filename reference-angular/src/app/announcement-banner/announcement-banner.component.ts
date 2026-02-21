import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { AnnouncementService, Announcement } from '../services/announcement.service';
import { LiveService } from '../services/live.service';

@Component({
  selector: 'app-announcement-banner',
  templateUrl: './announcement-banner.component.html',
  styleUrls: ['./announcement-banner.component.scss'],
})
export class AnnouncementBannerComponent implements OnInit, OnDestroy {
  @ViewChild('messageInput') messageInput!: ElementRef<HTMLInputElement>;

  announcement: Announcement | null = null;
  isAdmin = 0;
  isEditing = false;
  editMessage = '';
  editType: 'info' | 'warning' | 'error' | 'success' = 'info';

  private subscription: Subscription = new Subscription();

  announcementTypes = [
    { value: 'info', label: 'Info', icon: 'pi pi-info-circle' },
    { value: 'warning', label: 'Warning', icon: 'pi pi-exclamation-triangle' },
    { value: 'error', label: 'Error', icon: 'pi pi-times-circle' },
    { value: 'success', label: 'Success', icon: 'pi pi-check-circle' },
  ];

  constructor(private announcementService: AnnouncementService, private liveService: LiveService) {}

  ngOnInit(): void {
    this.liveService.getUrlData('/user/isAdmin').subscribe(d => {
      this.isAdmin = d['userType'] ? 1 : 0;
      this.subscription = this.announcementService.announcement$.subscribe(announcement => {
        this.announcement = announcement;
        if (announcement) {
          this.editMessage = announcement.message;
          this.editType = announcement.type;
        }
      });
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  startEditing(): void {
    if (!this.isAdmin) return;
    this.isEditing = true;
    this.editMessage = this.announcement?.message || '';
    this.editType = this.announcement?.type || 'info';

    setTimeout(() => {
      this.messageInput?.nativeElement?.focus();
      this.messageInput?.nativeElement?.select();
    });
  }

  saveChanges(): void {
    if (this.editMessage.trim()) {
      this.announcementService.updateAnnouncement({
        message: this.editMessage.trim(),
        type: this.editType,
      });
    }
    this.isEditing = false;
  }

  cancelEditing(): void {
    this.isEditing = false;
    if (this.announcement) {
      this.editMessage = this.announcement.message;
      this.editType = this.announcement.type;
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.saveChanges();
    } else if (event.key === 'Escape') {
      this.cancelEditing();
    }
  }

  createAnnouncement(): void {
    this.announcementService.createNewAnnouncement();
    setTimeout(() => this.startEditing());
  }

  deleteAnnouncement(): void {
    this.announcementService.deleteAnnouncement();
    this.isEditing = false;
  }

  dismiss(): void {
    if (this.announcement) {
      this.announcementService.dismissAnnouncement(this.announcement.id);
    }
  }

  getIcon(type: string): string {
    const found = this.announcementTypes.find(t => t.value === type);
    return found?.icon || 'pi pi-info-circle';
  }
}