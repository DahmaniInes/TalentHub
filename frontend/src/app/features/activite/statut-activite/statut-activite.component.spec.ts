import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatutActiviteComponent } from './statut-activite.component';

describe('StatutActiviteComponent', () => {
  let component: StatutActiviteComponent;
  let fixture: ComponentFixture<StatutActiviteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatutActiviteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StatutActiviteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
