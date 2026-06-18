import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReferentielReclamationComponent } from './referentiel-reclamation.component';

describe('ReferentielReclamationComponent', () => {
  let component: ReferentielReclamationComponent;
  let fixture: ComponentFixture<ReferentielReclamationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReferentielReclamationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReferentielReclamationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
