import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReferentielProjetsComponent } from './referentiel-projets.component';

describe('ReferentielProjetsComponent', () => {
  let component: ReferentielProjetsComponent;
  let fixture: ComponentFixture<ReferentielProjetsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReferentielProjetsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReferentielProjetsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
