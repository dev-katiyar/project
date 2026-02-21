import { Component, OnInit } from '@angular/core';
import { LoaderService } from '../services/loader.service';

@Component({
  selector: 'app-spinner',
  templateUrl: './spinner.component.html',
  styleUrls: ['./spinner.component.css']
})
export class SpinnerComponent implements OnInit {
  loading: boolean=true;

  constructor(private loaderService: LoaderService) {
   this.loaderService.isLoading.subscribe((v) => {
        this.loading = v;
      });
  }

  ngOnInit(): void {
  }

}
