import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonProfilStagiaireComponent } from './mon-profil-stagiaire.component';

describe('MonProfilStagiaireComponent', () => {
  let component: MonProfilStagiaireComponent;
  let fixture: ComponentFixture<MonProfilStagiaireComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MonProfilStagiaireComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MonProfilStagiaireComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
