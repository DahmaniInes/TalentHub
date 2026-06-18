import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReferentielActivitesComponent } from './referentiel-activites.component';

describe('ReferentielActivitesComponent', () => {
  let component: ReferentielActivitesComponent;
  let fixture: ComponentFixture<ReferentielActivitesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReferentielActivitesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReferentielActivitesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
