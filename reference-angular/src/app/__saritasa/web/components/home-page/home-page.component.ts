import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { UserTypeService } from 'src/app/services/user-type.service';

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent implements OnInit {

  userType = '';

  // carousal related 
  images = [
    {"id":1, "pic":"/assets/home/image-1.svg"},
    {"id":1, "pic":"/assets/home/image-2.svg"},
    {"id":1, "pic":"/assets/home/image-3.svg"},
    {"id":1, "pic":"/assets/home/image-4.svg"},
    {"id":1, "pic":"/assets/home/image-5.svg"},
  ];
  responsiveOptions: any[] | undefined;
  constructor(private userTypeService: UserTypeService) {
  }

  ngOnInit(): void {
    this.userType = this.userTypeService.getUserType();
            this.responsiveOptions = [
            {
                breakpoint: '1400px',
                numVisible: 3,
                numScroll: 3
            },
            {
                breakpoint: '1220px',
                numVisible: 2,
                numScroll: 2
            },
            {
                breakpoint: '1100px',
                numVisible: 1,
                numScroll: 1
            }
        ];
  }
}
