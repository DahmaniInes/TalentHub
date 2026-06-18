import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReferentielStageComponent } from './referentiel-stage.component';

describe('ReferentielStageComponent', () => {
  let component: ReferentielStageComponent;
  let fixture: ComponentFixture<ReferentielStageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReferentielStageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReferentielStageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
