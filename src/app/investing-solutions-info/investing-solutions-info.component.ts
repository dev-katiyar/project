import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-investing-solutions-info',
  templateUrl: './investing-solutions-info.component.html',
  styleUrls: ['./investing-solutions-info.component.scss'],
})
export class InvestingSolutionsInfoComponent implements OnInit {
  accordionItems = [
    {
      key: 1,
      title: 'Who is BNY?',
      content: `
        <p>
          The Bank of New York Mellon Corporation, commonly known as BNY, is an American international financial services company headquartered in New York City.
        </p>
      `,
    },
    {
      key: 2,
      title: 'Who is BNY/Pershing?',
      content: `
        <p>
          BNY/ Pershing is a global financial services firm that provides business-to-business financial solutions, including custody, clearing, settlement, technology, and wealth management services with $2.5 trillion of global clients’ assets. 
        </p>
      `,
    },
    {
      key: 3,
      title: 'Are my accounts insured?',
      content: `
        <p>
          As a member of the Securities Investor Protection Corporation (SIPC®), Pershing provides securities account protection up to $500,000. An aggregate loss limit of $1 Billion for eligible securities across all client accounts custodied at Pershing. In addition, a per-client loss-limit of $1.9 million for cash awaiting reinvestment, within the aggregate $1billion protection. More information is available at sipc.org.
        </p>
      `,
    },
    {
      key: 4,
      title: 'What is SimpleVisor™ digital solution?',
      content: `
        <p>
          SimpleVisor™ is a completely digital, low cost, portfolio management solution.
        </p>
      `,
    },
    {
      key: 5,
      title: 'How do I open an account?',
      content: `
        <p>
          To open an account, click the Open Your Account Now button. You can select a portfolio model or take our questionnaire.  Once the questionnaire is completed a model will be assigned to you or you chose another model. Lastly, you establish an account at Bank of New York/ Pershing.
        </p>
      `,
    },
    {
      key: 6,
      title: 'What is the account minimum?',
      content: `
        <p>
          $3,000 dollars for the following model
        </p>
        <p>
          Accumulator $25,000 dollars for the following models: Very Conservative – ETF, Conservative – ETF, Moderate – ETF, Moderate-Aggressive – ETF, and Aggressive – ETF.
        </p>
        <p>
          $50,000 dollars for the following models: Very Conservative – Equity, Conservative – Equity, Moderate – Equity, Moderate-Aggressive – Equity, Aggressive – Equity, AI Portfolio, All-Weather Portfolio, Growth Focused Equity, Infrastructure, Small & Midcap Stocks, Crypto Model, Managed Dividend Equity Model, and High Dividend Income Model
        </p>
      `,
    },
    {
      key: 7,
      title: 'Funding an account?',
      content: `
        <p>
          Once you initiate an ACH or WIRE, it can take up to 5-days for the deposit to settle and get reflected in your account.
        </p>
      `,
    },
    {
      key: 8,
      title: 'Who do I call with issues?',
      content: `
        <p>
          This is an all-digital process and therefore are no humans to call. If you need help, send an email to <a href="mailto:servicerequest@simplevisor.com?subject=[Simple RoboVisor Support]">servicerequest&#64;simplevisor.com</a> and you will receive a timely response from our team.
        </p>
      `,
    },
    {
      key: 9,
      title: 'What’s the Cost?',
      content: `
        <p>
          The automated portfolio management service is minimum of 0.75% up to 1.00% annually, billed quarterly.
        </p>
      `,
    },
    {
      key: 10,
      title: 'How do I Change Models?',
      content: `
        <p>
          To change your portfolio at any time,<a href="mailto:servicerequest@simplevisor.com?subject=[Simple RoboVisor Support]">servicerequest&#64;simplevisor.com</a> and the trading team will rebalance your current portfolio into the new portfolio model holds you requested.
        </p>
      `,
    },
    {
      key: 11,
      title: 'Can I link my other Accounts to my Account Portal?',
      content: `
        <p>
          Yes. Once you create your <a href="https://invest.simplevisor.com/" target="_blank">invest.simplevisor.com</a> Trading Account, you can link accounts held at Pershing/BNY to your portal for consolidated viewing.
        </p>
      `,
    },
    {
      key: 12,
      title: 'Do you have an App for my Phone?',
      content: `
        <p>
          Yes. We are in the process of creating an app to allow you access to your <a href="https://invest.simplevisor.com/" target="_blank">invest.simplevisor.com</a> accounts via your mobile device.
        </p>
      `,
    },
    {
      key: 13,
      title: 'How Do I Roll Over A 401k Plan?',
      content: `
        <p>
          If you have a 401k plan you want to roll over follow <a href="https://myclarity-my.sharepoint.com/personal/chrisb_riaadvisors_com/Documents/Documents/New%20SimpleVisor%20clients/Pershing%20401(k)%20Rollover%20Instructions.pdf" target="_blank">these steps</a> or <a class="contact-link" href="#">send a request</a>.
        </p>
      `,
    },
    {
      key: 14,
      title: 'How do I transfer an existing account to SimpleVisor™?',
      content: `
        <p>
          Once you register, go to your client portal and on the left-hand side click ACAT. Or send a request to <a href="mailto:servicerequest@simplevisor.com?subject=[Simple RoboVisor Support]">servicerequest&#64;simplevisor.com</a> 
        </p>
      `,
    },
    {
      key: 15,
      title: 'Once my account as opened is it immediately put into my Model allocation?',
      content: `
        <p>
          Yes, under most market circumstances we will fully onboard when the funds arrive.
        </p>
      `,
    },
    {
      key: 16,
      title: 'How Often Are Portfolio Models Rebalanced?',
      content: `
        <p>
          The SimpleVisor™ team rebalances when necessary.
        </p>
      `,
    },
    {
      key: 17,
      title: 'I need help deciding what is best for me.',
      content: `
        <p>
          Not a problem. Simply send a request to <a href="mailto:servicerequest@simplevisor.com?subject=[Simple RoboVisor Support]">servicerequest&#64;simplevisor.com</a> and we will contact you and walk you through the process to get started.
        </p>
      `,
    },
  ];

  activeKey: number | null = null;
  showContactUsPopup = false;

  constructor() {}

  ngOnInit(): void {}

  toggleAccordion(item): void {
    if (this.activeKey == item.key) {
      this.activeKey = null;
    } else {
      this.activeKey = item.key;
    }
  }

  showContactForm() {
    this.showContactUsPopup = true;
  }

  messageSentToSupport(event) {
    if (event?.value == 'success') {
      this.showContactUsPopup = false;
    }
  }

  handleContentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.classList.contains('contact-link')) {
      event.preventDefault();
      this.showContactForm();
    }
  }
}
