// src/app/features/features.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FeaturesRoutingModule } from './features-routing.module';

@NgModule({
  
  imports: [
    CommonModule,
    FeaturesRoutingModule
  ]
})
export class FeaturesModule {}