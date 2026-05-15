import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatutReclamationComponent } from './statut-reclamation.component';

describe('StatutReclamationComponent', () => {
  let component: StatutReclamationComponent;
  let fixture: ComponentFixture<StatutReclamationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatutReclamationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StatutReclamationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
