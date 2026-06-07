import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjetStageDetailComponent } from './projet-stage-detail.component';

describe('ProjetStageDetailComponent', () => {
  let component: ProjetStageDetailComponent;
  let fixture: ComponentFixture<ProjetStageDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjetStageDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjetStageDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
