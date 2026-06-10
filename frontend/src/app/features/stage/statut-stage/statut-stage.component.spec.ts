import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatutStageComponent } from './statut-stage.component';

describe('StatutStageComponent', () => {
  let component: StatutStageComponent;
  let fixture: ComponentFixture<StatutStageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatutStageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StatutStageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
