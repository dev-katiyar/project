import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SaritasaCommonSharedModule } from 'src/app/__saritasa/common/shared/saritasa-common-shared.module';
import { SharedModule } from 'primeng/api';
import { CommentaryModule } from './modules/commentary/commentary.module';
import { AppRoutingModule } from 'src/app/app-routing.module';
import { LandingPageComponent } from './components/landing-page/landing-page.component';
import { HomePageComponent } from './components/home-page/home-page.component';
import { CarouselModule } from 'primeng/carousel';

const EXPORTED_DECLARATIONS = [
  LandingPageComponent,
  HomePageComponent,
];

const EXPORTED_MODULES = [
  SaritasaCommonSharedModule,
  SharedModule,
  CommentaryModule,
];

@NgModule({
  declarations: [
    ...EXPORTED_DECLARATIONS,
  ],
  imports: [
    CommonModule,
    AppRoutingModule,
    CarouselModule,
  ...EXPORTED_MODULES,
  ],
  exports: [
    ...EXPORTED_DECLARATIONS,
    ...EXPORTED_MODULES,
  ]
})
export class SaritasaModule { }
