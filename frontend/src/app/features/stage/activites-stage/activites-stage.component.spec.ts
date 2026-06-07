import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivitesStageComponent } from './activites-stage.component';

describe('ActivitesStageComponent', () => {
  let component: ActivitesStageComponent;
  let fixture: ComponentFixture<ActivitesStageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivitesStageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActivitesStageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
