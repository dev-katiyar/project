import { NgModule } from '@angular/core';
import { PaginatorModule } from 'primeng/paginator';
import { ProgressBarModule } from 'primeng/progressbar';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

const modules: any[] = [
  PaginatorModule,
  ProgressBarModule,
  CardModule,
  ButtonModule
];

@NgModule({
  declarations: [],
  imports: modules,
  exports: modules,
})
/** Module for PrimeNg component */
export class SaritasaPrimeNgModule {}
