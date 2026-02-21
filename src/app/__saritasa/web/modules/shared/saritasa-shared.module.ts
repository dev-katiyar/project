import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SaritasaCommonSharedModule } from 'src/app/__saritasa/common/shared/saritasa-common-shared.module';
const EXPORTED_DECLARATIONS = [
];

@NgModule({
  declarations: [
    ...EXPORTED_DECLARATIONS
  ],
  imports: [
    CommonModule,
    SaritasaCommonSharedModule,
  ],
  exports: [
    ...EXPORTED_DECLARATIONS,
  ]
})
/** Shared module for saritasa modules */
export class SaritasaSharedModule { }
