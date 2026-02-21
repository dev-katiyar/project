import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SaritasaPrimeNgModule } from './saritasa-prime-ng.module';
import { PageLoaderComponent } from './components/page-loader/page-loader.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

const EXPORTED_DECLARATIONS = [
  PageLoaderComponent,
];

const EXPORTED_MODULES = [
  SaritasaPrimeNgModule,
  FontAwesomeModule,
];

@NgModule({
  declarations: [
    ...EXPORTED_DECLARATIONS,
  ],
  imports: [
    CommonModule,
    ...EXPORTED_MODULES,
  ],
  exports: [
    ...EXPORTED_DECLARATIONS,
    ...EXPORTED_MODULES,
  ]
})
/** Common shared module for saritasa app */
export class SaritasaCommonSharedModule { }
