import { Component, NgZone, OnInit } from '@angular/core';
import { LiveService } from '../services/live.service';
import { MessageService } from 'primeng/api';
import { Clipboard } from '@angular/cdk/clipboard';

interface UserExitReason {
  id: number;
  description: string;
}

class UserExitFeedback {
  userId: number;
  selUserExitReasons: UserExitReason[];
  feedback?: string;

  constructor(userId: number, reasons: UserExitReason[], feedback?: string) {
    this.userId = userId;
    this.selUserExitReasons = reasons;
    this.feedback = feedback;
  }
}

@Component({
  selector: 'app-subscription',
  templateUrl: './subscription.component.html',
  styleUrls: ['./subscription.component.scss'],
})
export class SubscriptionComponent implements OnInit {
  userData: any;
  originalUserData: any;
  message = '';
  displayPlanDialog = false;
  displayUnsubscribeDialog = false;
  displayChangeCardDialog = false;

  subscriptionType: any;
  subscriptionMessage = '';

  // Credit Card Related
  userCard;
  userCardStatus;
  todayDate = new Date();

  // API Key related
  newApiKey = '';
  newApiKeyMessage = '';

  // Exit form related
  userExitFeedback: UserExitFeedback;
  defaultUserExitReasons = [{ id: 1, description: 'Other' }];
  userExitReasons = this.defaultUserExitReasons;

  userStripeUserSubscriptionDetails: any;
  userStripeUserSubscriptionDetailsMessage = '';

  // change create subscriptoin related
  actionType = '';

  constructor(
    private liveService: LiveService,
    private messageService: MessageService,
    private ngZone: NgZone,
    private clipboard: Clipboard,
  ) {}

  ngOnInit(): void {
    this.loadUserDataFromDb({ status: 'ok', message: '' });
    this.liveService.getSubscriptions('all').subscribe(res => (this.subscriptionType = res));
    this.getCardInfo();
  }

  getUserSubscriptionStripe() {
    this.liveService.getUrlData('/user/subscription-details').subscribe((res: any) => {
      if (res && res?.data) {
        this.userStripeUserSubscriptionDetails = res.data;
        if (this.userStripeUserSubscriptionDetails?.subscription) {
        } else {
          this.userStripeUserSubscriptionDetailsMessage =
            'Your subscription has cancelled or expired. Please consider re-subscribing to continue enjoying our services.';
        }
      } else {
        this.userStripeUserSubscriptionDetails = null;
        this.userStripeUserSubscriptionDetailsMessage ='';
      }
    });
  }

  loadUserDataFromDb(response) {
    if (response.message != '') {
      this.subscriptionMessage = response.message;
    }

    // clear user feedback
    this.userExitFeedback = undefined;

    this.clearData();
    this.liveService.getUrlData('/user/subscription').subscribe(d => this.setUserData(d));
  }

  setUserData(d) {
    this.userData = d;

    // Internal Users Handling
    const userStripeId = this.userData?.stripe_user_id;
    if (userStripeId) {
      if (userStripeId == 'sv_internal_users_riaproo') {
        this.userData.subscriptionName = '';
        this.subscriptionMessage =
          'You are an internal user of SimpleVisor. You do not need a subscription to access the platform.';
        return;
      }

      if (userStripeId == 'lifetime_plan_user') {
        this.userData.subscriptionName = '';
        this.subscriptionMessage =
          'You have a lifetime plan. You do not need a subscription to access the platform.';
        return;
      }

      console.log('User Data: ', this.userData);
      this.getUserSubscriptionStripe();
    }

    // API Key Related
    this.userData['api_key'] = '*'.repeat(84);
    if (this.userData.date) {
      this.userData.date = this.userData.date.substr(0, 16);
    }

    // Regular Subscription Handling
    this.userData.isPaid = d.isPaid;
    if (this.userData.isPaid == 1) {
      this.userData.message =
        'You are currently subscribed to ' +
        this.userData.subscriptionName +
        ' Plan starting from ' +
        this.userData.date;
    } else {
      // this.userData.message = 'You have unsubscribed from RiaPro platform !';
      // this.authenticationService.logout();
    }
  }

  updateSubscription() {
    this.displayPlanDialog = false;
    this.liveService
      .postRequest('/user/subscription', {
        action: this.actionType,
        subscriptionId: this.userData.subscriptionId,
      })
      .subscribe(d => this.loadUserDataFromDb(d));
  }

  showStatus(response) {
    this.messageService.add({ severity: response.status, detail: response.message, life: 1200 });
  }

  userUnsubscribe() {
    this.liveService
      .postRequest('/user/subscription', {
        action: 'unsubscribe',
        exitFeedback: this.userExitFeedback,
      })
      .subscribe(d => this.loadUserDataFromDb(d));
    this.displayUnsubscribeDialog = false;
  }

  userSubscribe() {
    this.originalUserData = JSON.parse(JSON.stringify(this.userData));
    this.displayPlanDialog = true;
    this.liveService
      .postRequest('/user/subscription', { action: 'subscribe' })
      .subscribe(d => this.loadUserDataFromDb(d));
  }

  upgradePlan(action) {
    this.originalUserData = JSON.parse(JSON.stringify(this.userData));
    this.displayPlanDialog = true;
    this.actionType = action;
  }

  cancelUpgrade() {
    this.userData = this.originalUserData;
    this.displayPlanDialog = false;
  }

  openUnsubscribeDialog() {
    this.userExitFeedback = new UserExitFeedback(this.userData?.userId, [], '');
    this.liveService.getUrlData('/user/exit-reasons').subscribe(data => {
      if ('data' in data) {
        this.userExitReasons = data['data'] as UserExitReason[];
      } else {
        this.userExitReasons = this.defaultUserExitReasons;
      }
      this.displayUnsubscribeDialog = true;
    });
  }

  cancelUnsubscribe() {
    this.displayUnsubscribeDialog = false;
  }

  getCardInfo() {
    this.userCard = true;
    this.userCardStatus = '';

    this.liveService.getUrlData('/user/subscription/card').subscribe(d => {
      this.userCard = d['card'];
      this.userCardStatus = d['status'];
    });
  }

  changeCardBtnClick() {
    this.displayChangeCardDialog = true;
  }

  onCardChangeDone() {
    this.ngZone.run(() => {
      this.displayChangeCardDialog = false;
      this.getCardInfo();
    });
  }

  generateApiKey(userId) {
    this.liveService.getUrlData('/generate-api-key').subscribe(res => {
      this.newApiKey = res['api_key'];
      this.newApiKeyMessage = res['message'];
    });
  }

  copyApiKeyToClipboard() {
    const success = this.clipboard.copy(this.newApiKey);
    if (success) {
      this.showStatus({ status: 'success', message: 'API key copied to clipboard' });
    }
  }

  clearData() {
    this.userData = null;
    this.subscriptionMessage = '';
    this.userStripeUserSubscriptionDetails = null;
    this.userStripeUserSubscriptionDetailsMessage = '';
    this.actionType = '';
  }
}
